import React, { useEffect, useState } from 'react'
import { ID, Permission, Query, Role } from 'appwrite'
import { tablesDB, DB_ID, JOBS_TABLE } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'

const INDUSTRIES = ['Hospitality & Catering', 'Construction & Facilities', 'Healthcare', 'Retail & E-commerce', 'Logistics & Warehousing', 'Events']

type Job = { $id: string; employerId: string; title: string; industry: string; description?: string }

export default function Jobs() {
  const { user } = useAuth()
  const isEmployer = (user?.prefs as { role?: string } | undefined)?.role === 'employer'
  const [jobs, setJobs] = useState<Job[]>([])
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
      const admin = [Permission.update(Role.label('admin')), Permission.delete(Role.label('admin'))]
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: JOBS_TABLE,
        rowId: ID.unique(),
        data: { employerId: user.$id, title: title.trim(), industry, description: description.trim(), status: 'open' },
        permissions: [...owner, ...admin],
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
          </li>
        ))}
      </ul>
    </div>
  )
}
