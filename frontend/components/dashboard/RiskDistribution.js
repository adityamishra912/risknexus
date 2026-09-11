'use client';

import React from 'react';
import Card from '../ui/Card';
import { Info, HelpCircle } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { RISK_DISTRIBUTION_CURVE } from '../../lib/constants';

export default function RiskDistribution() {
  return (
    <Card
      title="Risk Exposure Distribution (Monte Carlo Model)"
      subtitle="Financial loss probability density & tail risk thresholds"
      headerAction={
        <div className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-full font-mono">
          <Info className="w-3.5 h-3.5" />
          <span>100,000 Iterations</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Chart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={RISK_DISTRIBUTION_CURVE} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="lossLabel"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                domain={[0, 1]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0B0F17] border border-cyan-800/80 p-3 rounded-lg shadow-xl text-xs font-sans space-y-1">
                        <p className="font-semibold text-cyan-300 font-mono">{data.lossLabel}</p>
                        <p className="text-slate-300">
                          Exceedance Probability: <span className="font-mono font-bold text-white">{(data.probability * 100).toFixed(1)}%</span>
                        </p>
                        {data.isEAL && <p className="text-amber-400 font-mono font-semibold">★ Expected Annual Loss (EAL)</p>}
                        {data.isP90 && <p className="text-orange-400 font-mono font-semibold">▲ P90 Tail Exposure Threshold</p>}
                        {data.isP95 && <p className="text-red-400 font-mono font-semibold">▲ P95 Severe Exposure Threshold</p>}
                        {data.isP99 && <p className="text-rose-500 font-mono font-semibold">▲ P99 Catastrophic Exposure Threshold</p>}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="probability" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRisk)" />
              
              {/* Threshold Reference Lines */}
              <ReferenceLine x="₹1.6 Cr (EAL)" stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'EAL ₹1.6Cr', fill: '#f59e0b', fontSize: 10, position: 'top' }} />
              <ReferenceLine x="₹3.2 Cr (P90)" stroke="#fb923c" strokeDasharray="4 4" label={{ value: 'P90 ₹3.2Cr', fill: '#fb923c', fontSize: 10, position: 'top' }} />
              <ReferenceLine x="₹4.1 Cr (P95)" stroke="#f87171" strokeDasharray="4 4" label={{ value: 'P95 ₹4.1Cr', fill: '#f87171', fontSize: 10, position: 'top' }} />
              <ReferenceLine x="₹5.8 Cr (P99)" stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'P99 ₹5.8Cr', fill: '#f43f5e', fontSize: 10, position: 'top' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend and Explanatory Tooltip Callout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> EAL (Mean): ₹1.60 Cr</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span> P90: ₹3.20 Cr</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> P95: ₹4.10 Cr</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> P99: ₹5.80 Cr</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 italic text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>"Percentile values represent modeled annual loss thresholds, not guaranteed losses."</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
