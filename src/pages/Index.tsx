import React from 'react';
import { Link } from 'react-router-dom';

const industries = [
  { id: 'hospitality', name: 'Hospitality', pros: '1,240 pros', icon: '🍴' },
  { id: 'construction', name: 'Construction', pros: '890 pros', icon: '🏗️' },
  { id: 'healthcare', name: 'Healthcare', pros: '670 pros', icon: '🏥' },
  { id: 'retail', name: 'Retail', pros: '1,520 pros', icon: '🛍️' },
  { id: 'logistics', name: 'Logistics', pros: '📦' },
  { id: 'events', name: 'Events', pros: '540 pros', icon: '🎉' },
];

export default function IndustryGrid() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Every industry, on demand</h1>
        <p className="text-slate-500 text-lg">Hire skilled workers across all major sectors.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {industries.map((category) => (
          <Link 
            key={category.id}
            to={`/dashboard/compliance?category=${category.id}`} 
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group active:scale-95"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{category.icon}</div>
            <h3 className="font-bold text-slate-900">{category.name}</h3>
            <p className="text-xs text-slate-400">{category.pros}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
