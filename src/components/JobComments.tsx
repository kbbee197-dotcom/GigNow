import React, { useState } from 'react'
import { Query } from 'appwrite'
import { tablesDB, DB_ID, COMMENTS_TABLE } from '../lib/appwrite'
import { useAuth } from '../lib/AuthContext'
import { callAction } from '../lib/api'

type C = {
  $id: string
  $createdAt: string
  authorId: string
  authorName?: string
  kind: string
  body: string
  rating?: number | null
  parentId?: string | null
  reportedAt?: string | null
}

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

export default function JobComments({ jobId, employerId }: { jobId: string; employerId: string }) {
  const { user } = useAuth()
  const isAdmin = !!user?.labels?.includes('admin')
  const isOwner = user?.$id === employerId
  const [open, setOpen] = useState(false)
  const [jobRows, setJobRows] = useState<C[]>([])
  const [empRows, setEmpRows] = useState<C[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [replyText, setReplyText] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const a = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COMMENTS_TABLE,
        queries: [Query.equal('jobId', jobId), Query.orderAsc('$createdAt'), Query.limit(100)],
      })
      setJobRows(a.rows as unknown as C[])
      const b = await tablesDB.listRows({
        databaseId: DB_ID,
        tableId: COMMENTS_TABLE,
        queries: [Query.equal('employerId', employerId), Query.orderDesc('$createdAt'), Query.limit(100)],
      })
      setEmpRows(b.rows as unknown as C[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load comments')
    } finally {
      setLoading(false)
    }
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  async function act(payload: Record<string, unknown>, after?: () => void) {
    setBusy(true)
    setError('')
    try {
      await callAction(payload)
      if (after) after()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const questions = jobRows.filter((c) => c.kind === 'question' && !c.parentId)
  const reviews = empRows.filter((c) => c.kind === 'review')
  const avg = reviews.length ? reviews.reduce((s, c) => s + (c.rating || 0), 0) / reviews.length : 0

  function Actions({ c }: { c: C }) {
    const mine = c.authorId === user?.$id
    const canDelete = mine || isAdmin || (isOwner && c.kind === 'question')
    return (
      <span className="space-x-3">
        {!mine && !c.reportedAt && <button disabled={busy} onClick={() => act({ type: 'report_comment', commentId: c.$id })} className="text-[11px] text-slate-400 underline">Report</button>}
        {isAdmin && c.reportedAt && <span className="text-[11px] font-bold text-orange-600">Reported</span>}
        {canDelete && <button disabled={busy} onClick={() => act({ type: 'delete_comment', commentId: c.$id })} className="text-[11px] text-red-500 underline">Delete</button>}
      </span>
    )
  }

  return (
    <div className="mt-3">
      <button onClick={toggle} className="text-xs font-bold text-slate-700 underline">
        {open ? 'Hide questions & reviews' : 'Questions & reviews'}
      </button>
      {open && (
        <div className="mt-2 space-y-3 border-t border-slate-100 pt-3">
          {loading && <p className="text-xs text-slate-400">Loading...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="text-xs text-slate-600">
            {reviews.length > 0 ? <span className="font-bold text-amber-600">{stars(Math.round(avg))} {avg.toFixed(1)}</span> : <span>No reviews yet</span>}
            {reviews.length > 0 && <span> from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} of this employer</span>}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500">Questions</div>
            {questions.length === 0 && <p className="text-xs text-slate-400">No questions yet.</p>}
            {questions.map((q) => (
              <div key={q.$id} className="text-sm border border-slate-100 rounded-lg p-2 space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">{q.authorName || 'Worker'}</span>
                  <Actions c={q} />
                </div>
                <p className="whitespace-pre-line break-words text-slate-800">{q.body}</p>
                {jobRows.filter((r) => r.parentId === q.$id).map((r) => (
                  <div key={r.$id} className="ml-3 pl-2 border-l-2 border-slate-200">
                    <div className="flex justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-700">{r.authorId === employerId ? 'Employer' : r.authorName || 'Worker'}</span>
                      <Actions c={r} />
                    </div>
                    <p className="whitespace-pre-line break-words text-slate-800">{r.body}</p>
                  </div>
                ))}
                {(isOwner || q.authorId === user?.$id) && (
                  replyTo === q.$id ? (
                    <div className="flex gap-2 pt-1">
                      <input className="flex-1 border border-slate-200 rounded-lg p-2 text-xs" placeholder="Write a reply" value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={1000} />
                      <button disabled={busy || !replyText.trim()} onClick={() => act({ type: 'post_comment', jobId, kind: 'question', parentId: q.$id, body: replyText }, () => { setReplyText(''); setReplyTo('') })} className="bg-slate-900 text-white text-xs font-bold px-3 rounded-lg disabled:opacity-50">Send</button>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyTo(q.$id); setReplyText('') }} className="text-[11px] font-bold text-slate-600 underline">Reply</button>
                  )
                )}
              </div>
            ))}
            {!isOwner && (
              <div className="flex gap-2">
                <input className="flex-1 border border-slate-200 rounded-lg p-2 text-xs" placeholder="Ask a question about this job" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={1000} />
                <button disabled={busy || !question.trim()} onClick={() => act({ type: 'post_comment', jobId, kind: 'question', body: question }, () => setQuestion(''))} className="bg-slate-900 text-white text-xs font-bold px-3 rounded-lg disabled:opacity-50">Ask</button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500">Reviews of this employer</div>
            {reviews.length === 0 && <p className="text-xs text-slate-400">No reviews yet.</p>}
            {reviews.slice(0, 10).map((r) => (
              <div key={r.$id} className="text-sm border border-slate-100 rounded-lg p-2 space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-xs"><span className="font-bold text-amber-600">{stars(r.rating || 0)}</span> <span className="text-slate-500">{r.authorName || 'Worker'}</span></span>
                  <Actions c={r} />
                </div>
                <p className="whitespace-pre-line break-words text-slate-800">{r.body}</p>
              </div>
            ))}
            {!isOwner && (
              showReview ? (
                <div className="space-y-2">
                  <select className="border border-slate-200 rounded-lg p-2 text-xs bg-white" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{stars(n)} ({n})</option>)}
                  </select>
                  <textarea className="w-full border border-slate-200 rounded-lg p-2 text-xs" rows={3} placeholder="How was working this job?" value={review} onChange={(e) => setReview(e.target.value)} maxLength={1000} />
                  <button disabled={busy || !review.trim()} onClick={() => act({ type: 'post_comment', jobId, kind: 'review', rating, body: review }, () => { setReview(''); setShowReview(false) })} className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">Post review</button>
                </div>
              ) : (
                <button onClick={() => setShowReview(true)} className="text-xs font-bold text-slate-700 underline">Leave a review (after you complete a shift)</button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
