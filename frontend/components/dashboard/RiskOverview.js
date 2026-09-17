'use client';

import React from 'react';
import { useRiskContext } from '../../providers/RiskProvider';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { TrendingDown, ShieldAlert, Wallet, Activity } from 'lucide-react';
import Loading from '../ui/Loading';
import ErrorState from '../ui/ErrorState';

export default function RiskOverview() {
  const { currentEAL, currentP95, budget, apiSummary, apiLoading, apiError } = useRiskContext();

  if (apiLoading) {
    return <Loading message="Loading risk metrics from backend..." />;
  }

  if (apiError || !apiSummary) {
    return (
      <ErrorState
        title="Risk Metrics API Error"
        message={apiError || "Could not load risk metrics summary from FastAPI backend."}
      />
    );
  }

  const technicalExposure = apiSummary.technical_scenario_exposure ?? apiSummary.total_eal ?? 0;
  const enterpriseEAL     = apiSummary.mean_eal ?? 0;
  const totalScenarios    = apiSummary.total_technical_scenarios ?? apiSummary.total_scenarios ?? 0;
  const totalEvents       = apiSummary.total_loss_events ?? 0;

  const kpis = [
    {
      title:   'Technical Scenario Exposure',
      value:   formatCurrency(technicalExposure),
      subtext: `Σ(P×Impact) across ${totalScenarios} canonical scenarios`,
      icon:    TrendingDown,
      color:   'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-800/40',
      badge:   'Baseline',
    },
    {
      title:   'Enterprise EAL',
      value:   formatCurrency(enterpriseEAL),
      subtext: `Monte Carlo mean — ${totalEvents} consolidated events`,
      icon:    Activity,
      color:   'text-orange-400',
      bgColor: 'bg-orange-950/40 border-orange-800/40',
      badge:   'Monte Carlo',
    },
    {
      title:   'P95 Exposure',
      value:   formatCurrency(apiSummary.p95_loss),
      subtext: '95th percentile annual loss',
      icon:    ShieldAlert,
      color:   'text-red-400',
      bgColor: 'bg-red-950/40 border-red-800/40',
      badge:   '95th Percentile',
    },
    {
      title:   'P99 Exposure',
      value:   formatCurrency(apiSummary.p99_loss),
      subtext: '99th percentile annual loss',
      icon:    ShieldAlert,
      color:   'text-rose-500',
      bgColor: 'bg-rose-950/40 border-rose-800/40',
      badge:   '99th Percentile',
    },
    {
      title:   'High Risk Scenarios',
      value:   `${apiSummary.high_risk_scenarios_count}`,
      subtext: 'EAL ≥ ₹50L scenarios',
      icon:    TrendingDown,
      color:   'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-800/40',
      badge:   'High Priority',
    },
    {
      title:   'Current Security Budget',
      value:   formatCurrency(budget),
      subtext: 'FY 2026 allocation',
      icon:    Wallet,
      color:   'text-cyan-400',
      bgColor: 'bg-cyan-950/40 border-cyan-800/40',
      badge:   'Active',
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
