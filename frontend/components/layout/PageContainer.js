'use client';

import React from 'react';
import Breadcrumbs from './Breadcrumbs';

export default function PageContainer({ title, subtitle, action, children }) {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-100 min-h-[calc(100vh-3.5rem)]">
      <Breadcrumbs />
      
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            {title && (
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {children}
    </div>
  );
}
