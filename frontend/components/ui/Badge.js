'use client';

import React from 'react';

export default function Badge({ children, variant = 'info', className = '' }) {
  const variantStyles = {
    critical: 'bg-red-950/60 text-red-400 border-red-800/60',
    warning: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    info: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60',
    neutral: 'bg-slate-900 text-slate-300 border-slate-750',
  };

  const style = variantStyles[variant] || variantStyles.info;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${style} ${className}`}
    >
      {children}
    </span>
  );
}
