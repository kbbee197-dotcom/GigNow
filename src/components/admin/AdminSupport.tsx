import React, { useEffect, useState } from 'react'
import { tablesDB, DB_ID, MESSAGES_TABLE, COMMENTS_TABLE } from '../../lib/appwrite'
import { Query } from 'appwrite'
import { callAction } from '../../lib/api'

type Msg = { $id: string; $createdAt: string; threadId: string; senderId: string; recipientId: string; body: string }
type Cm = { $id: string; $createdAt: string; kind: string; body: string; rating?: number; authorName?: string; reportedAt?: string | null }

export default function AdminSupport() {
  const [tab, setTab] = useState<'support' | 'reports'>('support')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [reports, setReports] = useState<Cm[]>([])
  const [activeUser, setActiveUser] = useState('')
  const [info, setInfo] = useState<Record<string, string>>({})
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const m = await tablesDB.listRows({ databaseId: DB_ID, tableId: MESSAGES_TABLE, queries: [Query.orderDesc('$createdAt'), Query.limit(200)] })
      setMsgs((m.rows as unknown as Msg[]).filter((x) => x.threadId.startsWith('support_')))
      const c = await tablesDB.listRows({ databaseId: DB_ID, tableId: COMMENTS_TABLE, queries: [Query.orderDesc('$createdAt'), Query.limit(200)] })
      setReports((c.rows as unknown as Cm[]).filter((x) => x.reportedAt))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const threads = new Map<string, Msg[]>()
  for (const m of msgs) {
    const arr = threads.get(m.threadId) || []
    arr.push(m)
    threads.set(m.threadId, arr)
  }
  const list = Array.from(threads.entries()).map(([id, arr]) => {
    const sorted = [...arr].sort((a, b) => a.$createdAt.localeCompare(b.$createdAt))
    return { userId: id.slice(8), msgs: sorted, last: sorted[sorted.length - 1] }
  })
  list.sort((a, b) => b.last.$createdAt.localeCompare(a.last.$createdAt))

  async function openThread(userId: string) {
    setActiveUser(userId)
    setReply('')
    if (!info[userId]) {
      try {
        const r = await callAction({ type: 'support_user_info', userId })
        setInfo((p) => ({ ...p, [userId]: (r.name || 'User') + ' (' + (r.email || 'no email') + ')' }))
      } catch {
        setInfo((p) => ({ ...p, [userId]: 'User ' + userId.slice(0, 8) }))
      }
    }
  }

  async function sendReply() {
    setBusy(true)
    setError('')
    try {
      await callAction({ type: 'support_reply', userId: activeUser, text: reply.trim() })
      setReply('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }

  async function reportAction(type: string, commentId: string) {
    setBusy(true)
    setError('')
    try {
      await callAction({ type, commentId })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const active = list.find((t) => t.userId === activeUser)

  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-xl font-black text-slate-900">Support inbox</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab('support')} className={'text-xs font-bold px-3 py-2 rounded-lg border ' + (tab === 'support' ? 'bg-slate-900 text-white' : 'border-slate-300')}>Conversations</button>
        <button onClick={() => setTab('reports')} className={'text-xs font-bold px-3 py-2 rounded-lg border ' + (tab === 'reports' ? 'bg-slate-900 text-white' : 'border-slate-300')}>Reported ({reports.length})</button>
        <button onClick={load} className="text-xs font-bold px-3 py-2 text-slate-600 underline">Refresh</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {tab === 'support' && !active && (
        <ul className="space-y-2">
          {list.length === 0 && <p className="text-sm text-slate-500">No support conversations yet.</p>}
          {list.map((t) => (
            <li key={t.userId}>
              <button onClick={() => openThread(t.userId)} className="w-full text-left border border-slate-200 rounded-xl p-3 bg-white">
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{info[t.userId] || 'User ' + t.userId.slice(0, 8)}</span>
                  {t.last.recipientId === 'support' && <span className="text-[10px] font-bold text-orange-600">NEEDS REPLY</span>}
                </div>
                <div className="text-xs text-slate-500 truncate">{t.last.body}</div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'support' && active && (
        <div className="space-y-3">
          <button onClick={() => setActiveUser('')} className="text-xs font-bold text-slate-600 underline">Back to conversations</button>
          <div className="text-sm font-bold text-slate-900">{info[activeUser] || 'User ' + activeUser.slice(0, 8)}</div>
          <div className="border border-slate-200 rounded-xl bg-white p-3 space-y-2 max-h-96 overflow-y-auto">
            {active.msgs.map((m) => {
              const fromUser = m.recipientId === 'support'
              return (
                <div key={m.$id} className={'flex ' + (fromUser ? 'justify-start' : 'justify-end')}>
                  <div className={'max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line break-words ' + (fromUser ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white')}>
                    {m.body}
                    <div className={'text-[10px] mt-1 ' + (fromUser ? 'text-slate-400' : 'text-slate-300')}>{new Date(m.$createdAt).toLocaleString()}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 border border-slate-200 rounded-xl p-3 text-sm" placeholder="Reply as GigNow support" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={1000} />
            <button disabled={busy || !reply.trim()} onClick={sendReply} className="bg-slate-900 text-white font-bold rounded-xl px-4 text-sm disabled:opacity-50">Send</button>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <ul className="space-y-2">
          {reports.length === 0 && <p className="text-sm text-slate-500">Nothing reported.</p>}
          {reports.map((c) => (
            <li key={c.$id} className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
              <div className="text-xs text-slate-500">{c.kind}{c.rating ? ' · ' + c.rating + ' of 5' : ''} · by {c.authorName || 'unknown'}</div>
              <p className="text-sm text-slate-800 whitespace-pre-line break-words">{c.body}</p>
              <div className="flex gap-3 pt-1">
                <button disabled={busy} onClick={() => reportAction('delete_comment', c.$id)} className="text-xs font-bold text-red-600 underline">Delete</button>
                <button disabled={busy} onClick={() => reportAction('dismiss_report', c.$id)} className="text-xs font-bold text-slate-600 underline">Dismiss report</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
