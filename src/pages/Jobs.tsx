import React, { useEffect, useState } from 'react'
import { ID, Permission, Query, Role } from 'appwrite'
import { tablesDB, DB_ID, JOBS_TABLE, APPS_TABLE, HIRES_TABLE } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'
import { callAction } from '../lib/api'

const INDUSTRIES = ['Hospitality & Catering', 'Construction & Facilities', 'Healthcare', 'Retail & E-commerce', 'Logistics & Warehousing', 'Events']

type Job = { $id: string; employerId: string; title: string; industry: string; description?: string }
type Row = { $id: string; jobId: string; workerId: string; workerName?: string }

export default function Jobs() {
  const { user } = useAuth()
  const isEmployer = (user?.prefs as { role?: string } | undefined)?.role === 'employer'
  const [jobs, setJobs] = useState<Job[]>([])
  const [apps, setApps] = useState<Row[]>([])
  const [hires, setHires] = useState<Row[]>([])
  const [title, setTitle] = useState('')
  const [industry, setIndustry] = useState(INDUSTRIES[0])
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadJobs() {
    try {
      const res = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: JOBS_TABLE,
        queries: [Query.equal('status', 'open'), Query.orderDesc('$createdAt'), Query.limit(50)],
      })
      setJobs(res.rows as unknown as Job[])
      const a = await tablesDB.listRows({ databaseId: DB_ID, tableId: APPS_TABLE, queries: [Query.limit(100)] })
      setApps(a.rows as unknown as Row[])
      const h = await tablesDB.listRows({ databaseId: DB_ID, tableId: HIRES_TABLE, queries: [Query.limit(100)] })
      setHires(h.rows as unknown as Row[])
    } catch {
      setError('Could not load jobs.')
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError('')
    try {
      const owner = [Permission.update(Role.user(user.$id)), Permission.delete(Role.user(user.$id))]
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: JOBS_TABLE,
        rowId: ID.unique(),
        data: { employerId: user.$id, title: title.trim(), industry, description: description.trim(), status: 'open' },
        permissions: owner,
      })
      setTitle('')
      setDescription('')
      await loadJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post job')
    } finally {
      setBusy(false)
    }
  }

  async function apply(j: Job) {
    if (!user) return
    setError('')
    try {
      await callAction({ type: 'apply', jobId: j.$id })
      await loadJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply')
    }
  }

  async function hire(j: Job, a: Row) {
    if (!user) return
    setError('')
    try {
      await callAction({ type: 'hire', applicationId: a.$id })
      await loadJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not hire')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Open jobs</h2>
      {isEmployer && (
        <form onSubmit={handlePost} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="text-sm font-bold text-slate-800">Post a job</div>
          <input className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          <select className="w-full border border-slate-200 rounded-xl p-3 bg-white text-sm" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
          <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
          <button type="submit" disabled={busy} className="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50">
            {busy ? 'Posting...' : 'Post job'}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {jobs.length === 0 && <li className="text-sm text-slate-400">No open jobs yet.</li>}
        {jobs.map((j) => (
          <li key={j.$id} className="p-4 bg-white border border-slate-200 rounded-2xl">
            <div className="font-bold text-slate-900">{j.title}</div>
            <div className="text-xs text-slate-500">{j.industry}</div>
            {j.description && <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{j.description}</p>}
            {!isEmployer && (
              hires.some((h) => h.jobId === j.$id) ? (
                <div className="mt-3 text-xs font-bold text-emerald-700">Hired</div>
              ) : apps.some((a) => a.jobId === j.$id) ? (
                <div className="mt-3 text-xs font-bold text-slate-500">Applied</div>
              ) : (
                <button onClick={() => apply(j)} className="mt-3 bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg">Apply</button>
              )
            )}
            {j.employerId === user?.$id && (
              <div className="mt-3 space-y-2">
                {apps.filter((a) => a.jobId === j.$id).length === 0 && <div className="text-xs text-slate-400">No applicants yet</div>}
                {apps.filter((a) => a.jobId === j.$id).map((a) => (
                  <div key={a.$id} className="flex items-center justify-between gap-2 text-sm border rounded-xl p-2">
                    <span className="break-all">{a.workerName || a.workerId.slice(0, 8)}</span>
                    {hires.some((h) => h.jobId === j.$id && h.workerId === a.workerId)
                      ? <span className="text-xs font-bold text-emerald-700">Hired</span>
                      : <button onClick={() => hire(j, a)} className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg">Hire</button>}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
