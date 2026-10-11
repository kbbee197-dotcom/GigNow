import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { account } from '../lib/appwrite'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const userId = params.get('userId') || ''
  const secret = params.get('secret') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      await account.updateRecovery({ userId, secret, password })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password. The link may have expired.')
    } finally {
      setBusy(false)
    }
  }

  if (!userId || !secret) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h1 className="text-2xl font-black text-slate-900">Reset link not valid</h1>
          <p className="text-sm text-slate-600">Open the link from your reset email, or request a new one from the sign-in page.</p>
          <Link to="/login" className="block text-center text-sm font-bold text-slate-900 underline">Back to sign in</Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h1 className="text-2xl font-black text-slate-900">Password updated</h1>
          <p className="text-sm text-slate-600">You can now sign in with your new password.</p>
          <Link to="/login" className="block text-center bg-slate-900 text-white font-bold rounded-xl p-3">Sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h1 className="text-2xl font-black text-slate-900">Choose a new password</h1>
        <div className="relative">
          <input className="w-full border border-slate-200 rounded-xl p-3 pr-16" type={showPw ? 'text' : 'password'} placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{showPw ? 'Hide' : 'Show'}</button>
        </div>
        <input className="w-full border border-slate-200 rounded-xl p-3" type={showPw ? 'text' : 'password'} placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="w-full bg-slate-900 text-white font-bold rounded-xl p-3 disabled:opacity-50">
          {busy ? 'Please wait...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
