import crypto from 'crypto'
import { Client, TablesDB, Query } from 'node-appwrite'

const DB_ID = 'gignow'

// TODO once a payroll partner is signed: set EOR_WEBHOOK_SECRET in Vercel to
// the signing secret they give you, and update the header name below to
// match their docs (e.g. Deel uses a different header than Gusto).
function isValidSignature(req: any, rawBody: string): boolean {
  const secret = process.env.EOR_WEBHOOK_SECRET
  if (!secret) return false
  const signature = req.headers['x-webhook-signature']
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(String(signature)), Buffer.from(expected))
  } catch {
    return false
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const rawBody = JSON.stringify(req.body || {})
  if (!isValidSignature(req, rawBody)) {
    return res.status(401).json({ error: 'Invalid or missing webhook signature' })
  }
  try {
    const endpoint = process.env.VITE_APPWRITE_ENDPOINT as string
    const project = process.env.VITE_APPWRITE_PROJECT_ID as string
    const db = new TablesDB(new Client().setEndpoint(endpoint).setProject(project).setKey(process.env.APPWRITE_API_KEY as string))

    // TODO: adjust these field names to match the real partner's webhook payload shape.
    const externalId = req.body?.data?.externalId
    const status = req.body?.data?.status
    if (!externalId || !status) return res.status(400).json({ error: 'Missing externalId or status' })

    const rows = await db.listRows({
      databaseId: DB_ID,
      tableId: 'eor_profiles',
      queries: [Query.equal('eorExternalId', externalId), Query.limit(1)],
    })
    if (rows.total === 0) return res.status(404).json({ error: 'No matching worker profile' })
    await db.updateRow({
      databaseId: DB_ID,
      tableId: 'eor_profiles',
      rowId: (rows.rows[0] as any).$id,
      data: { eorOnboardingStatus: status },
    })
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}
