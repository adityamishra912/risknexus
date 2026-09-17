'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingDown,
  GitFork,
  Server,
  ShieldAlert,
  SlidersHorizontal,
  Calculator,
  PieChart,
  Bot,
  FileCheck,
  FileText,
  Database,
  Settings,
  Building2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Risk Quantification', href: '/risk', icon: TrendingDown },
    { label: 'Attack Paths', href: '/attack-paths', icon: GitFork },
    { label: 'Assets', href: '/assets', icon: Server },
    { label: 'Vulnerabilities', href: '/vulnerabilities', icon: ShieldAlert },
    { label: 'Controls', href: '/risk/scenarios', icon: SlidersHorizontal },
    { label: 'What-If Simulator', href: '/simulator', icon: Calculator },
    { label: 'Investment Optimizer', href: '/optimizer', icon: PieChart, highlight: true },
    { label: 'AI Copilot', href: '/copilot', icon: Bot, badge: 'AI' },
    { label: 'Compliance', href: '/compliance', icon: FileCheck },
    { label: 'Data Sources', href: '/data-sources', icon: Database },
    { label: 'Settings & Security', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0B0F17] border-r border-slate-800 flex flex-col h-screen shrink-0 sticky top-0 text-slate-300 font-sans z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/50 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5.5 h-5.5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-white font-mono">RiskNexus</span>
            </div>
            <p className="text-[11px] text-cyan-400 font-medium tracking-wide uppercase">Risk Intelligence</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Platform Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className={item.highlight ? 'font-semibold text-slate-100' : ''}>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Organization & Profile */}
      <div className="p-3 border-t border-slate-800 bg-[#080B11] space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
          <div className="flex items-center gap-2 overflow-hidden">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="truncate">
              <p className="text-[11px] font-semibold text-white truncate">Enterprise Security</p>
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active System
              </p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-300">
            RM
          </div>
          <div className="truncate flex-1">
            <p className="text-[11px] font-medium text-slate-200 truncate">Raj Maurya</p>
            <p className="text-[10px] text-slate-400 truncate">Chief Risk Officer (CISO)</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
