import { useEffect, useState } from 'react'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, JOBS_TABLE, LOGS_TABLE } from '../../lib/appwrite'
import { useAuth } from '../../lib/AuthContext'
import { callAction } from '../../lib/api'

type Log = { $id: string; jobId: string; hoursWorked?: number; status: string; grossCents?: number; feeCents?: number; netCents?: number }
type Job = { $id: string; title: string; payRateCents?: number }

export default function ShiftApprovals() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<Log[]>([])
  const [jobs, setJobs] = useState<Record<string, Job>>({})
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function load() {
    if (!user) return
    try {
      const l = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: LOGS_TABLE,
        queries: [Query.equal('employerId', user.$id), Query.orderDesc('$createdAt'), Query.limit(50)],
      })
      setLogs(l.rows as unknown as Log[])
      const j = await tablesDB.listRows({ databaseId: DB_ID, tableId: JOBS_TABLE, queries: [Query.limit(100)] })
      const map: Record<string, Job> = {}
      for (const row of j.rows as unknown as Job[]) map[row.$id] = row
      setJobs(map)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load shifts')
    }
  }

  useEffect(() => {
    load()
  }, [user?.$id])

  async function approve(logId: string) {
    setBusyId(logId)
    setError('')
    try {
      await callAction({ type: 'approve_shift', logId })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve shift')
    } finally {
      setBusyId('')
    }
  }

  const dollars = (c?: number) => c == null ? '-' : '$' + (c / 100).toFixed(2)
  const pending = logs.filter((l) => l.status === 'done')
  const approved = logs.filter((l) => l.status === 'approved')

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Shift approvals</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <h3 className="text-sm font-bold text-slate-800">Awaiting approval</h3>
      <ul className="space-y-2">
        {pending.length === 0 && <li className="text-sm text-slate-400">Nothing to approve.</li>}
        {pending.map((l) => (
          <li key={l.$id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
            <div className="font-bold text-slate-900">{jobs[l.jobId]?.title ?? 'Job'}</div>
            <div className="text-xs text-slate-500">{l.hoursWorked ?? 0} h</div>
            {jobs[l.jobId]?.payRateCents ? (
              <button onClick={() => approve(l.$id)} disabled={busyId === l.$id} className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">
                {busyId === l.$id ? 'Approving...' : 'Approve pay'}
              </button>
            ) : (
              <div className="text-xs text-red-600">Set an hourly pay rate on this job before approving.</div>
            )}
          </li>
        ))}
      </ul>
      <h3 className="text-sm font-bold text-slate-800">Approved</h3>
      <ul className="space-y-2">
        {approved.length === 0 && <li className="text-sm text-slate-400">No approved shifts yet.</li>}
        {approved.map((l) => (
          <li key={l.$id} className="p-3 bg-white border border-slate-200 rounded-xl text-sm">
            <div className="font-bold text-slate-800">{jobs[l.jobId]?.title ?? 'Job'}</div>
            <div className="text-xs text-slate-500">{l.hoursWorked ?? 0} h · gross {dollars(l.grossCents)} · fee {dollars(l.feeCents)} · net {dollars(l.netCents)}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
