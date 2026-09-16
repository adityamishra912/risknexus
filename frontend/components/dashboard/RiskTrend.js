'use client';

import React from 'react';
import Card from '../ui/Card';
import { Calendar, ShieldCheck, Zap, BarChart2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { useRiskContext } from '../../providers/RiskProvider';

function formatInr(val) {
  if (!val || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
  return `₹${Math.round(val / 1000)}K`;
}

export default function RiskTrend() {
  const { riskTrendData, apiLoading } = useRiskContext();

  const hasHistory = riskTrendData?.has_history === true;
  const snapshots  = riskTrendData?.snapshots ?? [];

  // No history recorded yet — show informational empty state
  if (!apiLoading && !hasHistory) {
    return (
      <Card
        title="Risk Trend (Historical)"
        subtitle="Enterprise EAL over time — populated as the engine runs periodically"
      >
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-center px-8">
          <BarChart2 className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 text-sm font-medium">No historical snapshots yet</p>
          <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
            The risk engine writes a snapshot to <span className="font-mono text-slate-400">risk_snapshots.csv</span> on
            each run. Re-run the engine periodically to build a trend history. Fabricated trend data
            is not shown.
          </p>
        </div>
      </Card>
    );
  }

  const trendData = snapshots.map((s) => ({
    date: s.date,
    eal: s.enterprise_eal,
    p95: s.p95,
  }));

  const values  = trendData.map((d) => d.eal).filter(Boolean);
  const minVal  = Math.min(...values);
  const maxVal  = Math.max(...values);
  const pad     = (maxVal - minVal) * 0.15 || maxVal * 0.1;
  const yDomain = [Math.max(0, minVal - pad), maxVal + pad];

  const firstDate = snapshots[0]?.date ?? '';
  const lastDate  = snapshots[snapshots.length - 1]?.date ?? '';

  return (
    <Card
      title="Risk Trend (Historical)"
      subtitle="Enterprise EAL over time from recorded risk snapshots"
      headerAction={
        <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>{firstDate} – {lastDate}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={formatInr}
                domain={yDomain}
                width={60}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0B0F17] border border-cyan-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
                        <p className="text-slate-400">{d.date}</p>
                        <p className="text-sm font-bold text-white font-mono">
                          Enterprise EAL: {formatInr(d.eal)}
                        </p>
                        {d.p95 > 0 && (
                          <p className="text-slate-400 font-mono text-[11px]">
                            P95: {formatInr(d.p95)}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="eal"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 5, fill: '#10b981', stroke: '#064e3b', strokeWidth: 2 }}
                activeDot={{ r: 8, fill: '#34d399' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Showing {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}.
            Enterprise EAL = Monte Carlo mean across consolidated Business Loss Events.
          </span>
        </div>
      </div>
    </Card>
  );
}
