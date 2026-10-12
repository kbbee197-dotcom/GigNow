import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, NOTIFS_TABLE } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'
import MyReviews from '../components/MyReviews'

type Note = { $id: string; $createdAt: string; title: string; body?: string; link?: string; readAt?: string | null }

export default function Inbox() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!user) return
    try {
      const r = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: NOTIFS_TABLE,
        queries: [Query.equal('userId', user.$id), Query.orderDesc('$createdAt'), Query.limit(50)],
      })
      setNotes(r.rows as unknown as Note[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.$id])

  async function markRead(n: Note) {
    if (n.readAt) return
    try {
      const nowIso = new Date().toISOString()
      await tablesDB.updateRow({ databaseId: DB_ID, tableId: NOTIFS_TABLE, rowId: n.$id, data: { readAt: nowIso } })
      setNotes((prev) => prev.map((x) => (x.$id === n.$id ? { ...x, readAt: nowIso } : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update')
    }
  }

  async function markAll() {
    for (const n of notes.filter((x) => !x.readAt)) await markRead(n)
  }

  const unread = notes.filter((n) => !n.readAt).length

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900">Inbox</h1>
        {unread > 0 && <button onClick={markAll} className="text-xs font-bold text-slate-600 underline">Mark all read</button>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {!loading && notes.length === 0 && <p className="text-sm text-slate-500">No notifications yet.</p>}
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.$id} onClick={() => markRead(n)} className={'border rounded-xl p-3 bg-white ' + (n.readAt ? 'border-slate-200' : 'border-emerald-400')}>
            <div className="flex items-start justify-between gap-2">
              <div className={'text-sm ' + (n.readAt ? 'text-slate-700' : 'font-bold text-slate-900')}>{n.title}</div>
              {!n.readAt && <span className="text-[10px] font-bold text-emerald-700">NEW</span>}
            </div>
            {n.body && <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{n.body}</p>}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-400">{new Date(n.$createdAt).toLocaleString()}</span>
              {n.link && <Link to={n.link} className="text-xs font-bold text-slate-700 underline">Open</Link>}
            </div>
          </li>
        ))}
      </ul>
      <MyReviews />
    </div>
  )
}
