import React, { useState } from 'react'
import { callAction } from '../lib/api'

export default function ReviewWorker({ jobId, workerId }: { jobId: string; workerId: string }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await callAction({ type: 'review_worker', jobId, workerId, rating, body: text })
      setDone(true)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post review')
    } finally {
      setBusy(false)
    }
  }

  if (done) return <span className="text-xs text-emerald-700">Review posted</span>

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-slate-700 underline">Review</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-3">
          <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-3 text-left">
            <div className="text-lg font-black text-slate-900">Review this worker</div>
            <select className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} of 5</option>)}
            </select>
            <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm" rows={4} placeholder="How did the shift go? Keep it factual and fair." value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" disabled={busy || !text.trim()} onClick={submit} className="flex-1 bg-slate-900 text-white font-bold rounded-xl p-3 text-sm disabled:opacity-50">{busy ? 'Posting...' : 'Post review'}</button>
              <button type="button" onClick={() => setOpen(false)} className="px-4 border border-slate-300 rounded-xl text-sm font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
