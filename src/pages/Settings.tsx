import React, { useEffect, useState } from 'react'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, PREFS_TABLE } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'
import { callAction } from '../lib/api'

export default function Settings() {
  const { user } = useAuth()
  const [phone, setPhone] = useState('')
  const [emailOptIn, setEmailOptIn] = useState(true)
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [voiceOptIn, setVoiceOptIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const r = await tablesDB.listRows({
          databaseId: DB_ID,
          tableId: PREFS_TABLE,
          queries: [Query.equal('userId', user.$id), Query.limit(1)],
        })
        const p: any = r.rows[0]
        if (p) {
          setPhone(p.phone || '')
          setEmailOptIn(p.emailOptIn !== false)
          setSmsOptIn(!!p.smsOptIn)
          setVoiceOptIn(!!p.voiceOptIn)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.$id])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMsg('')
    setBusy(true)
    try {
      await callAction({ type: 'save_prefs', phone, emailOptIn, smsOptIn, voiceOptIn })
      setMsg('Saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>

  return (
    <form onSubmit={save} className="max-w-xl space-y-4">
      <h1 className="text-xl font-black text-slate-900">Notification settings</h1>
      <p className="text-sm text-slate-600">Every alert always appears in your Inbox. Choose where else you want to receive them.</p>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
        Email alerts to {user?.email}
      </label>
      <div className="space-y-1">
        <label className="block text-xs text-slate-500">Mobile phone (US)</label>
        <input className="w-full border border-slate-200 rounded-xl p-3 text-sm" type="tel" placeholder="(239) 555-0123" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-1" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
        <span>
          Text me about shifts, hiring, and account alerts. By checking this box you agree to receive text messages from GigNow at the number above. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time.
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-1" checked={voiceOptIn} onChange={(e) => setVoiceOptIn(e.target.checked)} />
        <span>Call me for urgent alerts only (such as a no-show on a shift I posted). By checking this box you agree to receive automated phone calls from GigNow at the number above.</span>
      </label>
      <p className="text-xs text-slate-500">Text and call alerts are being rolled out. Your choices are saved now and will take effect once they are switched on.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <button type="submit" disabled={busy} className="bg-slate-900 text-white font-bold rounded-xl px-5 py-3 text-sm disabled:opacity-50">
        {busy ? 'Saving...' : 'Save settings'}
      </button>
    </form>
  )
}
