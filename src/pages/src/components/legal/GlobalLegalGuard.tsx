import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileSignature } from 'lucide-react';

interface LegalGuardProps {
  children: React.ReactNode;
  userId: string;
  userRole: 'worker' | 'employer';
}

export default function GlobalLegalGuard({ children, userId, userRole }: LegalGuardProps) {
  const [isCleared, setIsCleared] = useState<boolean>(false);
  const [fullName, setFullName] = useState('');

  const handleSignatureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim()) setIsCleared(true);
  };

  if (isCleared) return <>{children}</>;

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
            <button type="submit" className="w-full bg-slate-950 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              <FileSignature size={16} /> Authorize & Access System Pipelines
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
