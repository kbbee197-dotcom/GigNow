import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import IndustryGrid from './pages/Index';
import Login from './pages/Login';
import Jobs from './pages/Jobs';
import RequireAdmin from './components/admin/RequireAdmin';
import AdminDocuments from './components/admin/AdminDocuments';
import AdminProfitOps from './components/admin/AdminProfitOps';
import MobileClockIn from './components/worker/MobileClockIn';
import WorkerComplianceVault from './components/worker/WorkerComplianceVault';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Marketing Layer */}
          <Route path="/" element={<IndustryGrid />} />
          <Route path="/login" element={<Login />} />

          {/* Core Secure Business Application Routes Layer */}
          <Route path="/dashboard" element={<AuthenticatedLayout />}>
            <Route path="admin" element={<RequireAdmin><AdminProfitOps /></RequireAdmin>} />
            <Route path="admin/documents" element={<RequireAdmin><AdminDocuments /></RequireAdmin>} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="clock-in" element={<MobileClockIn />} />
            <Route path="compliance" element={<WorkerComplianceVault />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
