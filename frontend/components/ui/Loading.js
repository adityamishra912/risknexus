'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading({ message = 'Loading live data from RiskNexus backend...' }) {
  return (
    <div className="p-8 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3 min-h-[160px]">
      <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
      <p className="text-xs font-mono text-slate-400">{message}</p>
    </div>
  );
}
