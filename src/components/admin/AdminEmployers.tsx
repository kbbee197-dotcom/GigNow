import { useEffect, useState } from 'react'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, EMPLOYER_TABLE } from '../../lib/appwrite'
import { callAction } from '../../lib/api'

type Profile = { $id: string; employerId: string; businessName: string; phone: string; status: string }
type SearchResult = { summary: string; sources: { title?: string; uri: string }[] }

export default function AdminEmployers() {
  const [rows, setRows] = useState<Profile[]>([])
  const [busyId, setBusyId] = useState('')
  const [searchBusyId, setSearchBusyId] = useState('')
  const [results, setResults] = useState<Record<string, SearchResult>>({})
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

  async function runSearch(r: Profile) {
    setSearchBusyId(r.$id)
    setError('')
    try {
      const data = await callAction({ type: 'verify_search', businessName: r.businessName, phone: r.phone }) as any
      setResults((prev) => ({ ...prev, [r.$id]: { summary: data.summary, sources: data.sources || [] } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearchBusyId('')
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
            <div className="flex flex-wrap gap-2">
              {r.status === 'pending' && (
                <>
                  <button onClick={() => decide(r.$id, 'approved')} disabled={busyId === r.$id} className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50">Approve</button>
                  <button onClick={() => decide(r.$id, 'rejected')} disabled={busyId === r.$id} className="text-xs font-bold px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50">Reject</button>
                </>
              )}
              <button onClick={() => runSearch(r)} disabled={searchBusyId === r.$id} className="text-xs font-bold px-3 py-2 rounded-lg border border-blue-300 text-blue-700 disabled:opacity-50">
                {searchBusyId === r.$id ? 'Searching...' : 'AI: search & verify'}
              </button>
            </div>
            {results[r.$id] && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
                <p className="whitespace-pre-line">{results[r.$id].summary}</p>
                {results[r.$id].sources.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-bold text-slate-500">Sources:</div>
                    {results[r.$id].sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="block underline text-blue-700 break-all">{s.title || s.uri}</a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
