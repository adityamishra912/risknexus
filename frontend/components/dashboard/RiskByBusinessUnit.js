'use client';

import React from 'react';
import Card from '../ui/Card';
import { BUSINESS_UNITS_RISK } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function RiskByBusinessUnit() {
  const COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185'];

  return (
    <Card
      title="Risk Exposure by Business Unit"
      subtitle="Financial loss allocation across operational business domains"
    >
      <div className="space-y-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={BUSINESS_UNITS_RISK}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#64748b"
                tick={{ fill: '#e2e8f0', fontSize: 11 }}
                width={100}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0B0F17] border border-cyan-800 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                        <p className="font-semibold text-white">{data.name}</p>
                        <p className="text-cyan-400 font-mono">EAL: {formatCurrency(data.eal)}</p>
                        <p className="text-slate-400 text-[11px]">Share: {data.percent}% of total risk</p>
                        <p className="text-slate-400 text-[11px]">Assets Monitored: {data.assets}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="eal" radius={[0, 4, 4, 0]}>
                {BUSINESS_UNITS_RISK.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Business Unit Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUSINESS_UNITS_RISK.map((bu, idx) => (
            <div key={idx} className="p-2 rounded bg-slate-900/60 border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] block">{bu.name}</span>
              <span className="font-mono font-bold text-white text-xs">{formatCurrency(bu.eal)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
