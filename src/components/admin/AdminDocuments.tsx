import React, { useEffect, useState } from 'react'
import { ID, Permission, Query, Role } from 'appwrite'
import { account, storage, tablesDB, DB_ID, DOCS_TABLE, DOCS_BUCKET, REVIEWS_TABLE } from '../../lib/appwrite'
import { useAuth } from '../../lib/AuthContext'

type DocRow = { $id: string; userId: string; docType: string; fileId: string; fileName: string }
type Review = { documentId: string; decision: string }
type Preview = { id: string; url: string; type: string }

const LABELS: Record<string, string> = {
  license_certification: 'License or certification',
  government_id: 'Government ID',
}

export default function AdminDocuments() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<DocRow[]>([])
  const [reviews, setReviews] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      const d = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: DOCS_TABLE,
        queries: [Query.orderDesc('$createdAt'), Query.limit(50)],
      })
      const r = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: REVIEWS_TABLE,
        queries: [Query.limit(100)],
      })
      setDocs(d.rows as unknown as DocRow[])
      const map: Record<string, string> = {}
      for (const row of r.rows as unknown as Review[]) map[row.documentId] = row.decision
      setReviews(map)
    } catch {
      setError('Could not load documents.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function viewFile(d: DocRow) {
    setError('')
    try {
      const { jwt } = await account.createJWT()
      const url = storage.getFileView({ bucketId: DOCS_BUCKET, fileId: d.fileId })
      const res = await fetch(String(url), {
        headers: {
          'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
          'X-Appwrite-JWT': jwt,
        },
      })
      if (!res.ok) throw new Error('Could not load file')
      const blob = await res.blob()
      setPreview({ id: d.$id, url: URL.createObjectURL(blob), type: blob.type })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open file')
    }
  }

  async function decide(d: DocRow, decision: 'approved' | 'rejected') {
    if (!user) return
    setError('')
    try {
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: REVIEWS_TABLE,
        rowId: ID.unique(),
        data: { documentId: d.$id, userId: d.userId, decision, reviewedBy: user.$id },
        permissions: [Permission.read(Role.user(d.userId)), Permission.read(Role.label('admin'))],
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Document review</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {docs.length === 0 && <li className="text-sm text-slate-400">No documents uploaded yet.</li>}
        {docs.map((d) => (
          <li key={d.$id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
            <div className="font-bold text-slate-900 break-all">{d.fileName}</div>
            <div className="text-xs text-slate-500">
              {LABELS[d.docType] ?? d.docType} · user {d.userId.slice(0, 8)}… · {reviews[d.$id] ?? 'awaiting review'}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => viewFile(d)} className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-300">View</button>
              {!reviews[d.$id] && (
                <>
                  <button onClick={() => decide(d, 'approved')} className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white">Approve</button>
                  <button onClick={() => decide(d, 'rejected')} className="text-xs font-bold px-3 py-2 rounded-lg bg-red-600 text-white">Reject</button>
                </>
              )}
            </div>
            {preview?.id === d.$id && (
              preview.type.startsWith('image/')
                ? <img src={preview.url} alt="" className="max-w-full rounded-xl border" />
                : <a href={preview.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Open file</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
