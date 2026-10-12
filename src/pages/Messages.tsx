import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, HIRES_TABLE, JOBS_TABLE, APPS_TABLE, MESSAGES_TABLE } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'
import { callAction } from '../lib/api'

type Convo = { key: string; jobId: string; workerId: string; title: string; who: string }
type Msg = { $id: string; $createdAt: string; senderId: string; recipientId: string; body: string; readAt?: string | null }

export default function Messages() {
  const { user } = useAuth()
  const isEmployer = (user?.prefs as { role?: string } | undefined)?.role === 'employer'
  const [params] = useSearchParams()
  const [convos, setConvos] = useState<Convo[]>([])
  const [active, setActive] = useState<Convo | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const h = await tablesDB.listRows({
          databaseId: DB_ID,
          tableId: HIRES_TABLE,
          queries: [Query.equal(isEmployer ? 'employerId' : 'workerId', user.$id), Query.limit(50)],
        })
        const rows = (h.rows as any[]).filter((r) => !r.replacedAt)
        const list: Convo[] = []
        for (const r of rows) {
          let title = 'Job'
          let who = isEmployer ? 'Worker ' + String(r.workerId).slice(0, 6) : 'Employer'
          try {
            const j: any = await tablesDB.getRow({ databaseId: DB_ID, tableId: JOBS_TABLE, rowId: r.jobId })
            title = j.title
          } catch {
            /* keep default title */
          }
          if (isEmployer) {
            try {
              const a: any = await tablesDB.getRow({ databaseId: DB_ID, tableId: APPS_TABLE, rowId: r.applicationId })
              if (a.workerName) who = a.workerName
            } catch {
              /* keep default name */
            }
          }
          list.push({ key: r.jobId + '_' + r.workerId, jobId: r.jobId, workerId: r.workerId, title, who })
        }
        setConvos(list)
        const pj = params.get('job')
        const pw = params.get('worker')
        const pre = list.find((c) => c.jobId === pj && c.workerId === pw)
        if (pre) setActive(pre)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load conversations')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.$id])

  async function loadMsgs(c: Convo) {
    try {
      const r = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: MESSAGES_TABLE,
        queries: [Query.equal('threadId', 'job_' + c.jobId + '_' + c.workerId), Query.orderAsc('$createdAt'), Query.limit(100)],
      })
      const list = r.rows as unknown as Msg[]
      setMsgs(list)
      for (const m of list) {
        if (m.recipientId === user?.$id && !m.readAt) {
          tablesDB.updateRow({ databaseId: DB_ID, tableId: MESSAGES_TABLE, rowId: m.$id, data: { readAt: new Date().toISOString() } }).catch(() => {})
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load messages')
    }
  }

  useEffect(() => {
    if (!active) return
    setMsgs([])
    loadMsgs(active)
    const t = setInterval(() => loadMsgs(active), 10000)
    return () => clearInterval(t)
  }, [active?.key])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!active || !text.trim()) return
    setBusy(true)
    setError('')
    try {
      await callAction({ type: 'send_message', jobId: active.jobId, workerId: active.workerId, text: text.trim() })
      setText('')
      await loadMsgs(active)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>

  if (!active) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-xl font-black text-slate-900">Messages</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {convos.length === 0 && <p className="text-sm text-slate-500">No conversations yet. Messaging opens once a worker is hired on a job.</p>}
        <ul className="space-y-2">
          {convos.map((c) => (
            <li key={c.key}>
              <button onClick={() => setActive(c)} className="w-full text-left border border-slate-200 rounded-xl p-3 bg-white">
                <div className="text-sm font-bold text-slate-900">{c.title}</div>
                <div className="text-xs text-slate-500">{c.who}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-3">
      <button onClick={() => setActive(null)} className="text-xs font-bold text-slate-600 underline">Back to conversations</button>
      <div>
        <div className="text-lg font-black text-slate-900">{active.title}</div>
        <div className="text-xs text-slate-500">{active.who}</div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="border border-slate-200 rounded-xl bg-white p-3 space-y-2 h-96 overflow-y-auto">
        {msgs.length === 0 && <p className="text-sm text-slate-400">No messages yet. Say hello.</p>}
        {msgs.map((m) => {
          const mine = m.senderId === user?.$id
          return (
            <div key={m.$id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line break-words ' + (mine ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900')}>
                {m.body}
                <div className={'text-[10px] mt-1 ' + (mine ? 'text-slate-300' : 'text-slate-400')}>{new Date(m.$createdAt).toLocaleString()}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input className="flex-1 border border-slate-200 rounded-xl p-3 text-sm" placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <button type="submit" disabled={busy || !text.trim()} className="bg-slate-900 text-white font-bold rounded-xl px-4 text-sm disabled:opacity-50">Send</button>
      </form>
    </div>
  )
}
