import React, { useState } from 'react';
import { MapPin, Camera, CheckCircle } from 'lucide-react';

export default function MobileClockIn() {
  const [step, setStep] = useState(1);
  const [verified, setVerified] = useState(false);

  return (
    <div className="max-w-md mx-auto bg-white border rounded-2xl p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Autonomous Geofence Attendance</h2>
      
      {step === 1 && (
        <button onClick={() => setStep(2)} className="w-full flex items-center justify-center gap-2 bg-slate-950 text-white p-4 rounded-xl font-semibold text-sm">
          <MapPin size={18} /> Cross-Reference Site Geofence Anchor
        </button>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-bold">✓ Geofence Confirmed Point Coordinates Matched</div>
          <div onClick={() => { setVerified(true); setStep(3); }} className="h-40 bg-slate-100 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer">
            <Camera size={24} />
            <span className="text-xs font-medium mt-1">Tap to capture verification facial selfie</span>
          </div>
        </div>
      )}

      {verified && (
        <div className="p-4 bg-emerald-500 text-white rounded-xl text-center font-bold text-sm flex items-center justify-center gap-2">
          <CheckCircle size={18} /> Shift Verification Complete. Payout Cleared.
        </div>
      )}
    </div>
  );
}
