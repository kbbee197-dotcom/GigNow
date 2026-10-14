import React, { useState } from 'react'
import { callAction } from '../lib/api'

const TTL_MS = 72 * 60 * 60 * 1000

type OfferApp = { $id: string; offerStatus?: string; proposedRateCents?: number; counterRateCents?: number; offerUpdatedAt?: string }

function money(c?: number) {
  return '$' + ((c || 0) / 100).toFixed(2) + '/hr'
}

function live(a: OfferApp) {
  if (a.offerStatus !== 'pending' && a.offerStatus !== 'countered') return false
  return !a.offerUpdatedAt || Date.now() - new Date(a.offerUpdatedAt).getTime() <= TTL_MS
}

function hoursLeft(a: OfferApp) {
  if (!a.offerUpdatedAt) return 72
  return Math.max(1, Math.ceil((TTL_MS - (Date.now() - new Date(a.offerUpdatedAt).getTime())) / 3600000))
}

export function WorkerOffer({ app, onChanged }: { app: OfferApp; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function respond(accept: boolean) {
    setBusy(true)
    setError('')
    try {
      await callAction({ type: 'offer_respond', applicationId: app.$id, accept })
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const s = app.offerStatus
  if (s === 'pending' && live(app)) {
    return <div className="mt-3 text-xs font-bold text-slate-500">Applied. Your offer of {money(app.proposedRateCents)} is waiting for the employer.</div>
  }
  if (s === 'countered' && live(app)) {
    return (
      <div className="mt-3 space-y-2">
        <div className="text-xs font-bold text-orange-600">Employer countered at {money(app.counterRateCents)} (your offer: {money(app.proposedRateCents)}). Expires in about {hoursLeft(app)} h.</div>
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => respond(true)} className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">Accept and take the job</button>
          <button disabled={busy} onClick={() => respond(false)} className="border border-slate-300 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">Decline</button>
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    )
  }
  if (s === 'declined') return <div className="mt-3 text-xs font-bold text-slate-500">Applied. Your offer was declined; you can still be hired at the posted rate.</div>
  if (s === 'pending' || s === 'countered' || s === 'expired') return <div className="mt-3 text-xs font-bold text-slate-500">Applied. Your offer expired.</div>
  return <div className="mt-3 text-xs font-bold text-slate-500">Applied</div>
}

export function EmployerOffer({ app, job, hired, onChanged }: { app: OfferApp; job: { $id: string; payRateCents?: number }; hired: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [counter, setCounter] = useState('')

  async function act(payload: Record<string, unknown>) {
    setBusy(true)
    setError('')
    try {
      await callAction(payload)
      setOpen(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (hired || !app.offerStatus) return null
  const s = app.offerStatus
  if (s === 'pending' && live(app)) {
    return (
      <div className="mt-1 space-y-1">
        <div className="text-xs font-bold text-orange-600">Offer: {money(app.proposedRateCents)} (posted {money(job.payRateCents)})</div>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => act({ type: 'hire', applicationId: app.$id, useProposal: true })} className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50">Hire at {money(app.proposedRateCents)}</button>
          <button disabled={busy} onClick={() => setOpen(!open)} className="border border-slate-300 text-xs font-bold px-2 py-1 rounded-lg">Counter</button>
          <button disabled={busy} onClick={() => act({ type: 'offer_decline', applicationId: app.$id })} className="border border-slate-300 text-xs font-bold px-2 py-1 rounded-lg">Decline</button>
        </div>
        {open && (
          <div className="flex gap-2">
            <input className="w-28 border border-slate-200 rounded-lg p-1 text-xs" type="number" min="0" step="0.01" placeholder="Counter $/hr" value={counter} onChange={(e) => setCounter(e.target.value)} />
            <button disabled={busy || !counter} onClick={() => act({ type: 'offer_counter', applicationId: app.$id, counterRate: counter })} className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50">Send counter</button>
          </div>
        )}
        <div className="text-[11px] text-slate-400">Expires in about {hoursLeft(app)} h. Hiring at the posted rate instead declines this offer.</div>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    )
  }
  if (s === 'countered' && live(app)) return <div className="mt-1 text-xs text-slate-500">Counter sent at {money(app.counterRateCents)}. Waiting for the worker.</div>
  if (s === 'declined') return <div className="mt-1 text-xs text-slate-400">Offer declined</div>
  if (s === 'pending' || s === 'countered' || s === 'expired') return <div className="mt-1 text-xs text-slate-400">Offer expired</div>
  return null
}
