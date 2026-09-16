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
import { useRiskContext } from '../../providers/RiskProvider';

function formatInr(val) {
  if (!val || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
  return `₹${Math.round(val / 1000)}K`;
}

export default function RiskDistribution() {
  const { lossDistributionData, apiSummary, apiLoading } = useRiskContext();

  // Use empirical curve from backend Monte Carlo output
  const curveData = (lossDistributionData?.curve ?? []).map((pt) => ({
    loss:       pt.loss,
    prob:       pt.exceedance_probability,
    lossLabel:  pt.loss_formatted ?? formatInr(pt.loss),
  }));

  // Fallback metric labels from the distribution endpoint or apiSummary
  const meanEAL = lossDistributionData?.mean_eal ?? apiSummary?.mean_eal ?? 0;
  const p90     = lossDistributionData?.p90      ?? apiSummary?.p90_loss  ?? 0;
  const p95     = lossDistributionData?.p95      ?? apiSummary?.p95_loss  ?? 0;
  const p99     = lossDistributionData?.p99      ?? apiSummary?.p99_loss  ?? 0;

  const meanEALLabel = formatInr(meanEAL);
  const p90Label     = formatInr(p90);
  const p95Label     = formatInr(p95);
  const p99Label     = formatInr(p99);

  // Find reference-line anchor points by matching closest loss value
  const findAnchor = (target) =>
    curveData.reduce((best, pt) =>
      Math.abs(pt.loss - target) < Math.abs(best.loss - target) ? pt : best
    , curveData[0] ?? { loss: 0, lossLabel: '' });

  const meanPoint = meanEAL > 0 && curveData.length > 0 ? findAnchor(meanEAL) : null;
  const p90Point  = p90 > 0   && curveData.length > 0 ? findAnchor(p90)     : null;
  const p95Point  = p95 > 0   && curveData.length > 0 ? findAnchor(p95)     : null;
  const p99Point  = p99 > 0   && curveData.length > 0 ? findAnchor(p99)     : null;

  const isEmpty = !apiLoading && curveData.length === 0;

  return (
    <Card
      title="Risk Exposure Distribution (Monte Carlo)"
      subtitle="Empirical annual loss exceedance probability from enterprise simulation"
      headerAction={
        <div className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-full font-mono">
          <Info className="w-3.5 h-3.5" />
          <span>{apiLoading ? 'Loading…' : lossDistributionData ? '10,000 Iterations (Empirical)' : 'Awaiting data'}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {isEmpty ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
            Loss distribution data not yet available.
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="lossLabel"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  interval={Math.floor(curveData.length / 6)}
                  angle={-20}
                  textAnchor="end"
                  height={44}
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
                            Exceedance:{' '}
                            <span className="font-mono font-bold text-white">
                              {(data.prob * 100).toFixed(1)}%
                            </span>
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            P(annual loss &gt; {data.lossLabel}) = {(data.prob * 100).toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="prob"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRisk)"
                />

                {meanPoint && (
                  <ReferenceLine
                    x={meanPoint.lossLabel}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: `EAL ${meanEALLabel}`, fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }}
                  />
                )}
                {p90Point && (
                  <ReferenceLine
                    x={p90Point.lossLabel}
                    stroke="#fb923c"
                    strokeDasharray="4 4"
                    label={{ value: `P90 ${p90Label}`, fill: '#fb923c', fontSize: 9, position: 'insideTopRight' }}
                  />
                )}
                {p95Point && (
                  <ReferenceLine
                    x={p95Point.lossLabel}
                    stroke="#f87171"
                    strokeDasharray="4 4"
                    label={{ value: `P95 ${p95Label}`, fill: '#f87171', fontSize: 9, position: 'insideTopRight' }}
                  />
                )}
                {p99Point && (
                  <ReferenceLine
                    x={p99Point.lossLabel}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    label={{ value: `P99 ${p99Label}`, fill: '#f43f5e', fontSize: 9, position: 'insideTopRight' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Enterprise EAL: {meanEALLabel}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> P90: {p90Label}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"    /> P95: {p95Label}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"   /> P99: {p99Label}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 italic text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Empirical curve from enterprise Monte Carlo. Independent event aggregation.</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
