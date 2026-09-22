import { useEffect, useState } from 'react'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, EMPLOYER_TABLE } from '../../lib/appwrite'
import { callAction } from '../../lib/api'

type Profile = { $id: string; employerId: string; businessName: string; phone: string; status: string }

export default function AdminEmployers() {
  const [rows, setRows] = useState<Profile[]>([])
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const res = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: EMPLOYER_TABLE,
        queries: [Query.orderDesc('$createdAt'), Query.limit(50)],
      })
      setRows(res.rows as unknown as Profile[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load employers')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function decide(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    setError('')
    try {
      await callAction({ type: 'review_employer', profileId: id, status })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save decision')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Employer verification</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {rows.length === 0 && <li className="text-sm text-slate-400">No submissions yet.</li>}
        {rows.map((r) => (
          <li key={r.$id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
            <div className="font-bold text-slate-900">{r.businessName}</div>
            <div className="text-sm text-slate-600">{r.phone}</div>
            <div className="text-xs font-bold">{r.status}</div>
            {r.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => decide(r.$id, 'approved')} disabled={busyId === r.$id} className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50">Approve</button>
                <button onClick={() => decide(r.$id, 'rejected')} disabled={busyId === r.$id} className="text-xs font-bold px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50">Reject</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
