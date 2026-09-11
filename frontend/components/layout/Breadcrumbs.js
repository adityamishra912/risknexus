'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname || pathname === '/' || pathname === '/dashboard') return null;

  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-4 font-sans">
      <Link href="/dashboard" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </Link>
      {segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const formattedName = segment
          .replace(/-/g, ' ')
          .replace(/^\[|\]$/g, '')
          .replace(/\b\w/g, c => c.toUpperCase());

        return (
          <React.Fragment key={url}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            {isLast ? (
              <span className="text-cyan-400 font-medium">{formattedName}</span>
            ) : (
              <Link href={url} className="hover:text-slate-200 transition-colors">
                {formattedName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
