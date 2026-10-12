import React, { useEffect, useState } from 'react'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, COMMENTS_TABLE } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'
import { callAction } from '../lib/api'

type R = { $id: string; $createdAt: string; kind: string; body: string; rating?: number; reportedAt?: string | null }

export default function MyReviews() {
  const { user } = useAuth()
  const [rows, setRows] = useState<R[]>([])
  const [error, setError] = useState('')

  async function load() {
    if (!user) return
    try {
      const r = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COMMENTS_TABLE,
        queries: [Query.equal('subjectId', user.$id), Query.orderDesc('$createdAt'), Query.limit(20)],
      })
      setRows((r.rows as unknown as R[]).filter((x) => x.kind === 'worker_review'))
    } catch {
      /* reviews are optional */
    }
  }

  useEffect(() => {
    load()
  }, [user?.$id])

  async function report(id: string) {
    setError('')
    try {
      await callAction({ type: 'report_comment', commentId: id })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report')
    }
  }

  if (rows.length === 0) return null
  const avg = rows.reduce((s, r) => s + (r.rating || 0), 0) / rows.length

  return (
    <div className="mt-8 space-y-2">
      <h2 className="text-lg font-black text-slate-900">Reviews about you</h2>
      <p className="text-xs text-slate-500">Average {avg.toFixed(1)} from {rows.length} {rows.length === 1 ? 'review' : 'reviews'}. Only you, the employer who wrote it, and GigNow admins can read these.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows.map((r) => (
        <div key={r.$id} className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
          <div className="flex justify-between gap-2">
            <span className="text-sm font-bold text-amber-600">{r.rating} of 5</span>
            <span className="text-xs text-slate-400">{new Date(r.$createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-slate-800 whitespace-pre-line break-words">{r.body}</p>
          {r.reportedAt ? <span className="text-[11px] font-bold text-orange-600">Reported for review</span> : <button onClick={() => report(r.$id)} className="text-[11px] text-slate-500 underline">Report this review</button>}
        </div>
      ))}
    </div>
  )
}
