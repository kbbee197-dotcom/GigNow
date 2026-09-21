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

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}
