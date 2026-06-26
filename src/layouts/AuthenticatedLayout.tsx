import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import GlobalLegalGuard from '../components/legal/GlobalLegalGuard';

// Simulating connection loop context wrapper hooks
const useAuthMock = () => ({
  user: { id: "usr-prod-99901", role: "worker" as const },
  loading: false
});

export default function AuthenticatedLayout() {
  const { user, loading } = useAuthMock();

  if (loading) return <div className="h-screen w-screen bg-slate-50" />;
  if (!user) return <Navigate to="/" replace />;

  return (
    <GlobalLegalGuard userId={user.id} userRole={user.role}>
      <div className="flex min-h-screen bg-slate-50">
        <aside className="w-64 bg-slate-900 text-white p-4 font-bold">GigNow Navigation Drawer</aside>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </GlobalLegalGuard>
  );
}
