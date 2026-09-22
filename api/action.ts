import { Account, Client, ID, Permission, Query, Role, TablesDB } from 'node-appwrite'

const DB_ID = 'gignow'

const FEE_RATES: Record<string, number> = {
  'Healthcare': 0.15,
  'Logistics & Warehousing': 0.12,
  'Hospitality & Catering': 0.14,
  'Retail & E-commerce': 0.10,
  'Construction & Facilities': 0.13,
  'Events': 0.10,
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const endpoint = process.env.VITE_APPWRITE_ENDPOINT as string
    const project = process.env.VITE_APPWRITE_PROJECT_ID as string
    const jwt = String(req.headers.authorization || '').replace('Bearer ', '')
    if (!jwt) return res.status(401).json({ error: 'Not signed in' })

    const asUser = new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt)
    const caller = await new Account(asUser).get()

    const asServer = new Client().setEndpoint(endpoint).setProject(project).setKey(process.env.APPWRITE_API_KEY as string)
    const db = new TablesDB(asServer)
    const body = req.body || {}
    const isAdmin = (caller.labels || []).includes('admin')

    if (body.type === 'review') {
      if (!isAdmin) return res.status(403).json({ error: 'Admins only' })
      if (!['approved', 'rejected'].includes(body.decision)) return res.status(400).json({ error: 'Bad decision' })
      const doc: any = await db.getRow({ databaseId: DB_ID, tableId: 'worker_documents', rowId: body.documentId })
      await db.createRow({
        databaseId: DB_ID,
        tableId: 'document_reviews',
        rowId: ID.unique(),
        data: { documentId: doc.$id, userId: doc.userId, decision: body.decision, reviewedBy: caller.$id },
        permissions: [Permission.read(Role.user(doc.userId)), Permission.read(Role.label('admin'))],
      })
      return res.status(200).json({ ok: true })
    }

    if (body.type === 'apply') {
      const job: any = await db.getRow({ databaseId: DB_ID, tableId: 'jobs', rowId: body.jobId })
      const existing = await db.listRows({
        databaseId: DB_ID,
        tableId: 'applications',
        queries: [Query.equal('jobId', job.$id), Query.equal('workerId', caller.$id), Query.limit(1)],
      })
      if (existing.total === 0) {
        await db.createRow({
          databaseId: DB_ID,
          tableId: 'applications',
          rowId: ID.unique(),
          data: { jobId: job.$id, workerId: caller.$id, employerId: job.employerId, workerName: String(caller.name || '').slice(0, 120) },
          permissions: [Permission.read(Role.user(caller.$id)), Permission.read(Role.user(job.employerId))],
        })
      }
      return res.status(200).json({ ok: true })
    }

    if (body.type === 'hire') {
      const application: any = await db.getRow({ databaseId: DB_ID, tableId: 'applications', rowId: body.applicationId })
      const job: any = await db.getRow({ databaseId: DB_ID, tableId: 'jobs', rowId: application.jobId })
      if (job.employerId !== caller.$id) return res.status(403).json({ error: 'Only the job owner can hire' })
      const existing = await db.listRows({
        databaseId: DB_ID,
        tableId: 'hires',
        queries: [Query.equal('applicationId', application.$id), Query.limit(1)],
      })
      if (existing.total === 0) {
        await db.createRow({
          databaseId: DB_ID,
          tableId: 'hires',
          rowId: ID.unique(),
          data: { jobId: job.$id, workerId: application.workerId, employerId: caller.$id, applicationId: application.$id },
          permissions: [Permission.read(Role.user(application.workerId)), Permission.read(Role.user(caller.$id)), Permission.read(Role.label('admin'))],
        })
      }
      return res.status(200).json({ ok: true })
    }

    if (body.type === 'clockin') {
      const job: any = await db.getRow({ databaseId: DB_ID, tableId: 'jobs', rowId: body.jobId })
      const hired = await db.listRows({
        databaseId: DB_ID,
        tableId: 'hires',
        queries: [Query.equal('jobId', job.$id), Query.equal('workerId', caller.$id), Query.limit(1)],
      })
      if (hired.total === 0) return res.status(403).json({ error: 'You are not hired for this job' })
      if (job.geofenceLat == null || job.geofenceLng == null) return res.status(400).json({ error: 'This job has no job site set' })
      const lat = Number(body.lat)
      const lng = Number(body.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'Location missing' })
      const dist = Math.round(distanceMeters(lat, lng, job.geofenceLat, job.geofenceLng))
      const radius = Number(job.geofenceRadius) || 200
      if (dist > radius) return res.status(403).json({ error: 'You are ' + dist + ' m from the job site (limit ' + radius + ' m)' })
      const open = await db.listRows({
        databaseId: DB_ID,
        tableId: 'work_logs',
        queries: [Query.equal('workerId', caller.$id), Query.equal('status', 'in'), Query.limit(1)],
      })
      if (open.total > 0) return res.status(400).json({ error: 'You are already clocked in' })
      await db.createRow({
        databaseId: DB_ID,
        tableId: 'work_logs',
        rowId: ID.unique(),
        data: { jobId: job.$id, workerId: caller.$id, employerId: job.employerId, clockInLat: lat, clockInLng: lng, clockInDistance: dist, status: 'in' },
        permissions: [Permission.read(Role.user(caller.$id)), Permission.read(Role.user(job.employerId)), Permission.read(Role.label('admin'))],
      })
      return res.status(200).json({ ok: true })
    }

    if (body.type === 'clockout') {
      const open = await db.listRows({
        databaseId: DB_ID,
        tableId: 'work_logs',
        queries: [Query.equal('workerId', caller.$id), Query.equal('status', 'in'), Query.limit(1)],
      })
      if (open.total === 0) return res.status(400).json({ error: 'You are not clocked in' })
      const log: any = open.rows[0]
      const hours = Math.round(((Date.now() - new Date(log.$createdAt).getTime()) / 3600000) * 100) / 100
      await db.updateRow({
        databaseId: DB_ID,
        tableId: 'work_logs',
        rowId: log.$id,
        data: { status: 'done', clockOutAt: new Date().toISOString(), hoursWorked: hours },
      })
      return res.status(200).json({ ok: true })
    }

    if (body.type === 'approve_shift') {
      const log: any = await db.getRow({ databaseId: DB_ID, tableId: 'work_logs', rowId: body.logId })
      if (log.employerId !== caller.$id) return res.status(403).json({ error: 'Only the employer can approve this shift' })
      if (log.status !== 'done') return res.status(400).json({ error: 'Shift is not ready to approve' })
      const job: any = await db.getRow({ databaseId: DB_ID, tableId: 'jobs', rowId: log.jobId })
      const rate = Number(job.payRateCents)
      if (!Number.isFinite(rate) || rate <= 0) return res.status(400).json({ error: 'This job has no pay rate set' })
      const feeRate = FEE_RATES[job.industry] ?? 0.10
      const grossCents = Math.round(Number(log.hoursWorked) * rate)
      const feeCents = Math.round(grossCents * feeRate)
      const netCents = grossCents - feeCents
      await db.updateRow({
        databaseId: DB_ID,
        tableId: 'work_logs',
        rowId: log.$id,
        data: { status: 'approved', grossCents, feeCents, netCents, feeRate, approvedAt: new Date().toISOString() },
      })
      return res.status(200).json({ ok: true })
    }

    if (body.type === 'review_employer') {
      if (!isAdmin) return res.status(403).json({ error: 'Admins only' })
      if (!['approved', 'rejected'].includes(body.status)) return res.status(400).json({ error: 'Bad status' })
      await db.updateRow({ databaseId: DB_ID, tableId: 'employer_profiles', rowId: body.profileId, data: { status: body.status } })
      return res.status(200).json({ ok: true })
    }

    if (body.type === 'post_job') {
      const profiles = await db.listRows({
        databaseId: DB_ID,
        tableId: 'employer_profiles',
        queries: [Query.equal('employerId', caller.$id), Query.limit(1)],
      })
      const profile: any = profiles.rows[0]
      if (!profile || profile.status !== 'approved') {
        return res.status(403).json({ error: 'Your business must be verified before posting jobs' })
      }
      if (body.jobId) {
        const job: any = await db.getRow({ databaseId: DB_ID, tableId: 'jobs', rowId: body.jobId })
        if (job.employerId !== caller.$id) return res.status(403).json({ error: 'Not your job' })
        await db.updateRow({ databaseId: DB_ID, tableId: 'jobs', rowId: body.jobId, data: body.data })
      } else {
        await db.createRow({
          databaseId: DB_ID,
          tableId: 'jobs',
          rowId: ID.unique(),
          data: { employerId: caller.$id, status: 'open', ...body.data },
          permissions: [Permission.update(Role.user(caller.$id)), Permission.delete(Role.user(caller.$id))],
        })
      }
      return res.status(200).json({ ok: true })
    }

    if (body.type === 'job_assist') {
      const title = String(body.title || '').slice(0, 120)
      const industry = String(body.industry || '')
      const notes = String(body.notes || '').slice(0, 500)
      const prompt = `You help small business owners post gig-work jobs on a marketplace called GigNow.
Given a job title, industry, and any rough notes, write:
1. A clear, professional 2-4 sentence job description (no headers, plain text).
2. A fair, current, typical hourly pay range in USD for this role and industry in the United States (as "$X-$Y/hr").
Respond with strict JSON only, no markdown, in this exact shape: {"description": "...", "payRangeLow": 0, "payRangeHigh": 0}
Job title: ${title}
Industry: ${industry}
Notes from employer: ${notes || '(none)'}`

      const gRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_GENERATIVE_AI_API_KEY as string },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      })
      const gData: any = await gRes.json()
      if (!gRes.ok) return res.status(502).json({ error: gData?.error?.message || 'AI request failed' })
      const text = gData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const cleaned = text.replace(/```json|```/g, '').trim()
      let parsed: any
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        return res.status(502).json({ error: 'Could not parse AI response' })
      }
      return res.status(200).json({ ok: true, description: parsed.description, payRangeLow: parsed.payRangeLow, payRangeHigh: parsed.payRangeHigh })
    }

    if (body.type === 'verify_search') {
      if (!isAdmin) return res.status(403).json({ error: 'Admins only' })
      const businessName = String(body.businessName || '').slice(0, 200)
      const phone = String(body.phone || '').slice(0, 40)
      if (!businessName) return res.status(400).json({ error: 'Missing business name' })
      const prompt = `You are helping a marketplace admin do a quick public-information check on a business before approving it to post jobs.
Search the web for this business and report only what you find from public sources: whether it appears to exist, its listed address/location if found, its industry/type of business, and whether the phone number given matches any public listing for it.
Do not make a hiring or approval recommendation. Do not guess or invent details you did not find. If you find little or nothing, say so plainly.
Business name: ${businessName}
Phone number given: ${phone || '(none provided)'}`

      const gRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_GENERATIVE_AI_API_KEY as string },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
        }),
      })
      const gData: any = await gRes.json()
      if (!gRes.ok) return res.status(502).json({ error: gData?.error?.message || 'AI request failed' })
      const candidate = gData?.candidates?.[0]
      const summary = candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('\n') || 'No summary returned.'
      const chunks = candidate?.groundingMetadata?.groundingChunks || []
      const sources = chunks.map((c: any) => ({ title: c.web?.title, uri: c.web?.uri })).filter((s: any) => s.uri)
      return res.status(200).json({ ok: true, summary, sources })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}
