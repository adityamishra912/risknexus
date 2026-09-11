'use client';

import React from 'react';
import { useRiskContext } from '../../providers/RiskProvider';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { TrendingDown, ShieldAlert, DollarSign, Wallet, Activity } from 'lucide-react';

export default function RiskOverview() {
  const { currentEAL, currentP95, budget } = useRiskContext();

  const kpis = [
    {
      title: 'Expected Annual Loss (EAL)',
      value: formatCurrency(currentEAL),
      subtext: 'Modeled mean exposure',
      icon: TrendingDown,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-800/40',
      badge: 'Baseline',
    },
    {
      title: 'P90 Exposure',
      value: '₹3.20 Cr',
      subtext: '90th percentile annual loss',
      icon: Activity,
      color: 'text-orange-400',
      bgColor: 'bg-orange-950/40 border-orange-800/40',
      badge: 'High Tail',
    },
    {
      title: 'P95 Exposure',
      value: formatCurrency(currentP95),
      subtext: '95th percentile annual loss',
      icon: ShieldAlert,
      color: 'text-red-400',
      bgColor: 'bg-red-950/40 border-red-800/40',
      badge: 'Extreme Tail',
    },
    {
      title: 'P99 Exposure',
      value: '₹5.80 Cr',
      subtext: 'Worst-case catastrophic loss',
      icon: ShieldAlert,
      color: 'text-rose-500',
      bgColor: 'bg-rose-950/40 border-rose-800/40',
      badge: 'Catastrophic',
    },
    {
      title: '30-Day Risk Trend',
      value: '↓ 12.4%',
      subtext: 'Net financial reduction',
      icon: TrendingDown,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-800/40',
      badge: 'Improving',
    },
    {
      title: 'Current Security Budget',
      value: formatCurrency(budget),
      subtext: 'FY 2026 allocation',
      icon: Wallet,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40 border-cyan-800/40',
      badge: 'Active',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className={`p-4 rounded-xl border ${kpi.bgColor} backdrop-blur bg-[#0E131F]/90 shadow-lg hover:border-cyan-500/40 transition-all flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 truncate">{kpi.title}</span>
              <Icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <div className="my-2">
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono tracking-tight">{kpi.value}</div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="truncate">{kpi.subtext}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-sans">
                {kpi.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
