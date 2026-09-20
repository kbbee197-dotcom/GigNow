import React from 'react';
import { DollarSign, Layers, ShieldCheck } from 'lucide-react';

export default function AdminProfitOps() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Global Financial Operations Hub</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Live Platform GMV Flow</span>
            <div className="text-2xl font-black text-slate-900">$485,000</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={20} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Escrow Contract Float</span>
            <div className="text-2xl font-black text-slate-900">$124,500</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Layers size={20} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">1099 Gate Pass Compliance</span>
            <div className="text-2xl font-black text-slate-900">94.2%</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ShieldCheck size={20} /></div>
        </div>
      </div>
    </div>
  );
}
