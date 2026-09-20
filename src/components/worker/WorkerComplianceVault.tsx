import React from 'react';
import { ShieldCheck, UploadCloud } from 'lucide-react';

export default function WorkerComplianceVault() {
  return (
    <div className="max-w-xl mx-auto p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
        <ShieldCheck size={16} /> Global Compliance Security Vault
      </div>
      <h2 className="text-xl font-bold text-slate-900">Dynamic Identity Screening Grid</h2>
      <div className="p-4 border rounded-xl flex items-center justify-between bg-slate-50">
        <div>
          <div className="text-sm font-bold text-slate-800">Unified Background Clearance Status</div>
          <p className="text-xs text-slate-400">Verifying federal tracking registries via background check integration webhooks.</p>
        </div>
        <button className="flex items-center gap-1 bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg"><UploadCloud size={14} /> Sync Docs</button>
      </div>
    </div>
  );
}
