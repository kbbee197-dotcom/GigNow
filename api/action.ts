import { Account, Client, ID, Permission, Query, Role, TablesDB } from 'node-appwrite'

const DB_ID = 'gignow'

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

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}
