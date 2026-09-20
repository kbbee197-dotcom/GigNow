import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileSignature } from 'lucide-react';
import { ID, Permission, Query, Role } from 'appwrite';
import { tablesDB, DB_ID, SIGNATURES_TABLE } from '../../lib/appwrite';

interface LegalGuardProps {
  children: React.ReactNode;
  userId: string;
  userRole: 'worker' | 'employer';
}

export default function GlobalLegalGuard({ children, userId, userRole }: LegalGuardProps) {
  const [status, setStatus] = useState<'checking' | 'needed' | 'cleared'>('checking');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    tablesDB
      .listRows({
        databaseId: DB_ID,
        tableId: SIGNATURES_TABLE,
        queries: [Query.equal('userId', userId), Query.limit(1)],
      })
      .then((res) => setStatus(res.total > 0 ? 'cleared' : 'needed'))
      .catch(() => {
        setError('Could not check your agreement status. Please refresh.');
        setStatus('needed');
      });
  }, [userId]);

  const handleSignatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setBusy(true);
    setError('');
    try {
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: SIGNATURES_TABLE,
        rowId: ID.unique(),
        data: { userId, fullName: fullName.trim(), role: userRole },
        permissions: [Permission.read(Role.user(userId))],
      });
      setStatus('cleared');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your signature');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'cleared') return <>{children}</>;
  if (status === 'checking') return <div className="h-screen w-screen bg-slate-50" />;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-950 p-6 text-white flex items-center gap-4">
          <ShieldAlert size={24} className="text-amber-400" />
          <div>
            <h2 className="text-xl font-bold">Mandatory Liability Shield Update</h2>
            <p className="text-xs text-slate-400">System Verification Token Needed for Account Authorization</p>
          </div>
        </div>
        <div className="p-6 space-y-4 text-sm text-slate-600">
          <div className="bg-slate-50 p-4 border rounded-xl font-mono text-xs h-48 overflow-y-auto">
            GIGNOW MARKETPLACE ACCOUNT SERVICE AGREEMENT CONTRACT:
            By typing your full signature below, you affirm that GigNow operates strictly as a technology software intermediary pipeline platform conduit...
          </div>
          <form onSubmit={handleSignatureSubmit} className="space-y-4">
            <input
              type="text"
              required
              placeholder="Type legal name to confirm binding signature"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-slate-950 text-sm font-medium"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-slate-950 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <FileSignature size={16} /> {busy ? 'Saving...' : 'Authorize & Access System Pipelines'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
