import { Client, Query, TablesDB } from 'node-appwrite'

const DB_ID = 'gignow'
const GRACE_MS = 15 * 60 * 1000
const LOOKBACK_MS = 48 * 60 * 60 * 1000

export default async function handler(req: any, res: any) {
  const secret = process.env.CRON_SECRET
  const auth = String(req.headers.authorization || '')
  if (!secret || auth !== 'Bearer ' + secret) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const client = new Client()
      .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT as string)
      .setProject(process.env.VITE_APPWRITE_PROJECT_ID as string)
      .setKey(process.env.APPWRITE_API_KEY as string)
    const db = new TablesDB(client)
    const now = Date.now()
    const jobs = await db.listRows({
      databaseId: DB_ID,
      tableId: 'jobs',
      queries: [
        Query.lessThan('shiftStart', new Date(now - GRACE_MS).toISOString()),
        Query.greaterThan('shiftStart', new Date(now - LOOKBACK_MS).toISOString()),
        Query.limit(100),
      ],
    })
    let flagged = 0
    for (const job of jobs.rows as any[]) {
      const startMs = new Date(job.shiftStart).getTime()
      const hires = await db.listRows({
        databaseId: DB_ID,
        tableId: 'hires',
        queries: [Query.equal('jobId', job.$id), Query.limit(100)],
      })
      for (const h of hires.rows as any[]) {
        if (h.noShowAt) continue
        if (new Date(h.$createdAt).getTime() > startMs) continue
        const logs = await db.listRows({
          databaseId: DB_ID,
          tableId: 'work_logs',
          queries: [Query.equal('workerId', h.workerId), Query.limit(100)],
        })
        if ((logs.rows as any[]).some((l) => l.jobId === job.$id)) continue
        await db.updateRow({ databaseId: DB_ID, tableId: 'hires', rowId: h.$id, data: { noShowAt: new Date().toISOString() } })
        flagged++
      }
    }
    return res.status(200).json({ ok: true, checked: jobs.rows.length, flagged })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' })
  }
}
