import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user?.labels?.includes('admin')) return <Navigate to="/dashboard/compliance" replace />
  return <>{children}</>
}
