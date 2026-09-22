import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const { user, login, signup } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [role, setRole] = useState<'worker' | 'employer'>('worker')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/dashboard/compliance" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await signup(email, password, name, role)
      navigate('/dashboard/compliance')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h1 className="text-2xl font-black text-slate-900">
          {mode === 'login' ? 'Sign in to GigNow' : 'Create your account'}
        </h1>
        {mode === 'signup' && (
          <>
            <input className="w-full border border-slate-200 rounded-xl p-3" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
            <select className="w-full border border-slate-200 rounded-xl p-3 bg-white" value={role} onChange={(e) => setRole(e.target.value as 'worker' | 'employer')}>
              <option value="worker">I'm looking for work</option>
              <option value="employer">I'm hiring</option>
            </select>
          </>
        )}
        <input className="w-full border border-slate-200 rounded-xl p-3" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border border-slate-200 rounded-xl p-3" type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="w-full bg-slate-900 text-white font-bold rounded-xl p-3 disabled:opacity-50">
          {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="w-full text-sm text-slate-500">
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
        <p className="text-xs text-center text-slate-400 pt-2">
          By continuing you agree to our <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
        </p>
      </form>
    </div>
  )
}
