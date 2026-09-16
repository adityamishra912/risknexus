'use client';

import React from 'react';
import Card from '../ui/Card';
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
import { useRiskContext } from '../../providers/RiskProvider';

const COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185'];

function formatInr(val) {
  if (!val || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
  return `₹${Math.round(val / 1000)}K`;
}

export default function RiskByBusinessUnit() {
  const { businessUnitData, apiLoading } = useRiskContext();

  const buData = businessUnitData?.business_units ?? [];

  if (!apiLoading && buData.length === 0) {
    return (
      <Card
        title="Risk Exposure by Business Unit"
        subtitle="Financial loss allocation across operational business domains"
      >
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          No business unit data available.
        </div>
      </Card>
    );
  }

  // Take top 5 for readability
  const chartData = buData.slice(0, 5).map((bu) => ({
    name: bu.service_name?.length > 18 ? bu.service_name.substring(0, 16) + '…' : bu.service_name,
    fullName: bu.service_name,
    eal: bu.eal,
    percent: bu.percent,
    asset_count: bu.asset_count,
    eal_formatted: bu.eal_formatted,
  }));

  return (
    <Card
      title="Risk Exposure by Business Unit"
      subtitle="Technical scenario exposure aggregated from actual risk scenarios — not fixed fractions"
    >
      <div className="space-y-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) =>
                  val >= 10000000
                    ? `₹${(val / 10000000).toFixed(1)}Cr`
                    : `₹${(val / 100000).toFixed(0)}L`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#64748b"
                tick={{ fill: '#e2e8f0', fontSize: 11 }}
                width={110}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0B0F17] border border-cyan-800 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                        <p className="font-semibold text-white">{d.fullName}</p>
                        <p className="text-cyan-400 font-mono">Technical Exposure: {d.eal_formatted}</p>
                        <p className="text-slate-400 text-[11px]">Share: {d.percent}% of total</p>
                        <p className="text-slate-400 text-[11px]">Assets: {d.asset_count}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="eal" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* BU Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {chartData.map((bu, idx) => (
            <div key={idx} className="p-2 rounded bg-slate-900/60 border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] block truncate">{bu.fullName}</span>
              <span className="font-mono font-bold text-white text-xs">{bu.eal_formatted}</span>
              <span className="text-slate-500 text-[10px] block">{bu.percent}% of total</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
