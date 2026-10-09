import { useEffect, useState } from 'react'
import { Query } from 'appwrite'
import { tablesDB, storage, account, DB_ID, EMPLOYER_TABLE, DOCS_BUCKET } from '../../lib/appwrite'
import { callAction } from '../../lib/api'

type Profile = { $id: string; employerId: string; businessName: string; phone: string; status: string; entityType?: string; ein?: string; b2bDocFileId?: string; b2bStatus?: string }
type SearchResult = { summary: string; sources: { title?: string; uri: string }[] }
type Preview = { id: string; url: string; type: string }

export default function AdminEmployers() {
  const [rows, setRows] = useState<Profile[]>([])
  const [busyId, setBusyId] = useState('')
  const [searchBusyId, setSearchBusyId] = useState('')
  const [results, setResults] = useState<Record<string, SearchResult>>({})
  const [preview, setPreview] = useState<Preview | null>(null)
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

  async function decideB2b(id: string, status: 'verified' | 'rejected') {
    setBusyId(id)
    setError('')
    try {
      await callAction({ type: 'review_b2b', profileId: id, status })
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

  async function viewB2bDoc(r: Profile) {
    if (!r.b2bDocFileId) return
    setError('')
    try {
      const { jwt } = await account.createJWT()
      const url = storage.getFileView({ bucketId: DOCS_BUCKET, fileId: r.b2bDocFileId })
      const res = await fetch(String(url), {
        headers: {
          'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
          'X-Appwrite-JWT': jwt,
        },
      })
      if (!res.ok) throw new Error('Could not load document')
      const blob = await res.blob()
      setPreview({ id: r.$id, url: URL.createObjectURL(blob), type: blob.type })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open document')
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

            {r.b2bStatus && r.b2bStatus !== 'none' && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-700">B2B entity verification: {r.b2bStatus}</div>
                <div className="text-xs text-slate-500">{r.entityType} · EIN {r.ein}</div>
                <div className="flex flex-wrap gap-2">
                  {r.b2bDocFileId && <button onClick={() => viewB2bDoc(r)} className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-300">View document</button>}
                  {r.b2bStatus === 'pending' && (
                    <>
                      <button onClick={() => decideB2b(r.$id, 'verified')} disabled={busyId === r.$id} className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50">Verify</button>
                      <button onClick={() => decideB2b(r.$id, 'rejected')} disabled={busyId === r.$id} className="text-xs font-bold px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50">Reject</button>
                    </>
                  )}
                </div>
                {preview?.id === r.$id && (
                  preview.type.startsWith('image/')
                    ? <img src={preview.url} alt="" className="max-w-full rounded-xl border" />
                    : <a href={preview.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Open document</a>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
