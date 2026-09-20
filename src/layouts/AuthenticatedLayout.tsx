import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import GlobalLegalGuard from '../components/legal/GlobalLegalGuard'
import { useAuth } from '../lib/AuthContext'

export default function AuthenticatedLayout() {
  const { user, loading, logout } = useAuth()

  if (loading) return <div className="h-screen w-screen bg-slate-50" />
  if (!user) return <Navigate to="/login" replace />

  const role = (user.prefs as { role?: string }).role === 'employer' ? 'employer' : 'worker'

  return (
    <GlobalLegalGuard userId={user.$id} userRole={role}>
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
        <aside className="w-full md:w-64 bg-slate-900 text-white p-4 font-bold space-y-4">
          <div>GigNow Navigation Drawer</div>
          <button onClick={logout} className="text-sm font-normal text-slate-300 underline">Sign out</button>
        </aside>
        <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </GlobalLegalGuard>
  )
}
