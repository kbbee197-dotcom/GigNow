import React, { useEffect, useRef, useState } from 'react'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, MESSAGES_TABLE } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'
import { callAction } from '../lib/api'

type Msg = { $id: string; $createdAt: string; senderId: string; recipientId: string; body: string; readAt?: string | null }

export default function Support() {
  const { user } = useAuth()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    if (!user) return
    try {
      const r = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: MESSAGES_TABLE,
        queries: [Query.equal('threadId', 'support_' + user.$id), Query.orderAsc('$createdAt'), Query.limit(100)],
      })
      const list = r.rows as unknown as Msg[]
      setMsgs(list)
      for (const m of list) {
        if (m.recipientId === user.$id && !m.readAt) {
          tablesDB.updateRow({ databaseId: DB_ID, tableId: MESSAGES_TABLE, rowId: m.$id, data: { readAt: new Date().toISOString() } }).catch(() => {})
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load messages')
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [user?.$id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError('')
    try {
      await callAction({ type: 'support_send', text: text.trim() })
      setText('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-xl font-black text-slate-900">Support</h1>
      <p className="text-sm text-slate-600">Message GigNow about a problem, a dispute, or a question. We reply here and you will get an alert in your Inbox.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="border border-slate-200 rounded-xl bg-white p-3 space-y-2 h-96 overflow-y-auto">
        {msgs.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
        {msgs.map((m) => {
          const mine = m.senderId === user?.$id
          return (
            <div key={m.$id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line break-words ' + (mine ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-slate-900')}>
                {!mine && <div className="text-[10px] font-bold text-emerald-700">GigNow support</div>}
                {m.body}
                <div className={'text-[10px] mt-1 ' + (mine ? 'text-slate-300' : 'text-slate-400')}>{new Date(m.$createdAt).toLocaleString()}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input className="flex-1 border border-slate-200 rounded-xl p-3 text-sm" placeholder="Type your message" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <button type="submit" disabled={busy || !text.trim()} className="bg-slate-900 text-white font-bold rounded-xl px-4 text-sm disabled:opacity-50">Send</button>
      </form>
    </div>
  )
}
