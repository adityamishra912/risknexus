'use client';

import React from 'react';

export default function Card({ children, className = '', title, subtitle, headerAction }) {
  return (
    <div className={`bg-[#0E131F]/90 border border-slate-800/80 rounded-xl p-5 shadow-xl shadow-black/20 backdrop-blur ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
          <div>
            {title && <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
