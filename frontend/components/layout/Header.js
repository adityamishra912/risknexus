'use client';

import React from 'react';
import { Search, Bell, Clock, RefreshCw, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="h-14 bg-[#0B0F17]/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20 font-sans">
      {/* Search and Context */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assets, CVEs, scenarios, controls, or ask AI..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>
      </div>

      {/* Global Indicators & Actions */}
      <div className="flex items-center gap-4">
        {/* Data Freshness Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[11px] font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden sm:inline font-sans font-medium text-slate-300">Continuous Sync:</span>
          <span>2 mins ago</span>
          <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin-slow ml-0.5" />
        </div>

        {/* Environment Tag */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-white">IndoBank</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400 font-mono">PROD</span>
        </div>

        {/* Copilot Quick Launch */}
        <Link
          href="/copilot"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/40 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask AI Copilot</span>
        </Link>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400"></span>
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-xs font-bold text-cyan-300">
          RM
        </div>
      </div>
    </header>
  );
}
