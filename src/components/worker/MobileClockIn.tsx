import { useEffect, useState } from 'react'
import { MapPin, CheckCircle } from 'lucide-react'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, JOBS_TABLE, HIRES_TABLE, LOGS_TABLE } from '../../lib/appwrite'
import { useAuth } from '../../lib/AuthContext'
import { callAction } from '../../lib/api'

type Job = { $id: string; title: string; geofenceLat?: number }
type Hire = { jobId: string }
type Log = { $id: string; jobId: string; status: string; $createdAt: string; hoursWorked?: number }

export default function MobileClockIn() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    if (!user) return
    try {
      const h = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: HIRES_TABLE,
        queries: [Query.equal('workerId', user.$id), Query.limit(100)],
      })
      const hired = new Set((h.rows as unknown as Hire[]).map((r) => r.jobId))
      const j = await tablesDB.listRows({ databaseId: DB_ID, tableId: JOBS_TABLE, queries: [Query.limit(100)] })
      setJobs((j.rows as unknown as Job[]).filter((x) => hired.has(x.$id)))
      const l = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: LOGS_TABLE,
        queries: [Query.equal('workerId', user.$id), Query.orderDesc('$createdAt'), Query.limit(20)],
      })
      setLogs(l.rows as unknown as Log[])
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not load your shifts')
    }
  }

  useEffect(() => {
    load()
  }, [user?.$id])

  function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, (e) => reject(new Error('Could not get location: ' + e.message)), {
        enableHighAccuracy: true,
        timeout: 15000,
      })
    })
  }

  async function clockIn(jobId: string) {
    setBusy(true)
    setMsg('')
    try {
      const pos = await getPosition()
      await callAction({ type: 'clockin', jobId, lat: pos.coords.latitude, lng: pos.coords.longitude })
      setMsg('Clocked in')
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Clock in failed')
    } finally {
      setBusy(false)
    }
  }

  async function clockOut() {
    setBusy(true)
    setMsg('')
    try {
      await callAction({ type: 'clockout' })
      setMsg('Clocked out')
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Clock out failed')
    } finally {
      setBusy(false)
    }
  }

  const openLog = logs.find((l) => l.status === 'in')
  const doneLogs = logs.filter((l) => l.status === 'done')
  const titleOf = (id: string) => jobs.find((j) => j.$id === id)?.title ?? 'Job'

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Clock in</h2>
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
      {openLog && (
        <div className="p-4 bg-white border border-emerald-300 rounded-2xl space-y-2">
          <div className="text-sm font-bold text-emerald-700 flex items-center gap-1"><CheckCircle size={16} /> Clocked in: {titleOf(openLog.jobId)}</div>
          <div className="text-xs text-slate-500">Since {new Date(openLog.$createdAt).toLocaleString()}</div>
          <button onClick={clockOut} disabled={busy} className="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50">Clock out</button>
        </div>
      )}
      <ul className="space-y-2">
        {jobs.length === 0 && <li className="text-sm text-slate-400">You are not hired for any job yet.</li>}
        {jobs.map((j) => (
          <li key={j.$id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900">{j.title}</div>
              {j.geofenceLat == null && <div className="text-xs text-slate-400">No job site set yet</div>}
            </div>
            <button onClick={() => clockIn(j.$id)} disabled={busy || !!openLog || j.geofenceLat == null} className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40"><MapPin size={14} /> Clock in</button>
          </li>
        ))}
      </ul>
      <h3 className="text-sm font-bold text-slate-800">Recent shifts</h3>
      <ul className="space-y-2">
        {doneLogs.length === 0 && <li className="text-sm text-slate-400">No completed shifts yet.</li>}
        {doneLogs.map((l) => (
          <li key={l.$id} className="p-3 bg-white border border-slate-200 rounded-xl text-sm">
            <div className="font-bold text-slate-800">{titleOf(l.jobId)}</div>
            <div className="text-xs text-slate-500">{new Date(l.$createdAt).toLocaleString()} · {l.hoursWorked ?? 0} h</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
