'use client';

import React from 'react';
import Card from '../ui/Card';
import { Calendar, ShieldCheck, Zap } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RISK_TREND_30DAYS } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils/formatCurrency';

export default function RiskTrend() {
  return (
    <Card
      title="Continuous Risk Trend (30 Days)"
      subtitle="Dynamic financial exposure tracking with security event milestones"
      headerAction={
        <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>Aug 04 - Sep 03, 2026</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={RISK_TREND_30DAYS} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`}
                domain={[10000000, 20000000]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0B0F17] border border-cyan-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
                        <p className="text-slate-400">{data.day} ({data.date})</p>
                        <p className="text-sm font-bold text-white font-mono">
                          EAL: {formatCurrency(data.eal)}
                        </p>
                        {data.event && (
                          <div className="mt-2 pt-2 border-t border-slate-800 text-cyan-300 font-medium flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{data.event}</span>
                          </div>
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

        {/* Milestone Timeline Callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          {RISK_TREND_30DAYS.filter(d => d.event).slice(0, 4).map((item, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-start gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-mono text-[10px] text-slate-400 block">{item.day} • {formatCurrency(item.eal)}</span>
                <span className="text-slate-200 font-medium text-[11px] leading-tight block">{item.event}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
