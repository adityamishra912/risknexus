'use client';

import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import {
  PieChart,
  Sliders,
  DollarSign,
  TrendingUp,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Clock,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceDot,
} from 'recharts';
import Link from 'next/link';
import { useRiskContext } from '../../providers/RiskProvider';
import { RISK_REDUCTION_OPPORTUNITIES } from '../../lib/constants';

export default function OptimizerPage() {
  const {
    budget,
    setBudget,
    optimizationObjective,
    setOptimizationObjective,
    selectedInitiativeIds,
    toggleInitiative,
    totalSelectedInvestment,
    totalExpectedRiskReduction,
    residualEAL,
    budgetRemaining,
    portfolioROSI,
  } = useRiskContext();

  const [isAiExplainOpen, setIsAiExplainOpen] = useState(true);

  // Investment Curve Data (Spend vs Risk Reduction)
  const curveData = [
    { spend: 0, spendLabel: '₹0', reduction: 0 },
    { spend: 1000000, spendLabel: '₹10L', reduction: 2500000, zone: 'Optimal' },
    { spend: 2500000, spendLabel: '₹25L', reduction: 3900000, zone: 'Optimal' },
    { spend: 5500000, spendLabel: '₹55L', reduction: 6900000, zone: 'Optimal' },
    { spend: 7500000, spendLabel: '₹75L', reduction: 9100000, zone: 'Optimal' },
    { spend: 12500000, spendLabel: '₹1.25 Cr', reduction: 13100000, zone: 'Diminishing Returns' },
    { spend: 20000000, spendLabel: '₹2.00 Cr', reduction: 14500000, zone: 'Diminishing Returns' },
  ];

  return (
    <PageContainer
      title="Cybersecurity Investment Optimizer"
      subtitle="Find the highest-value security investment portfolio under explicit budget & time constraints"
      action={
        <Link href="/copilot">
          <Button variant="primary" size="sm" className="gap-1.5 shadow-lg shadow-cyan-950">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI Why</span>
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Top Controls Bar */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Budget Input / Slider */}
            <div>
              <label className="text-xs font-semibold text-slate-300 flex justify-between mb-1 font-mono">
                <span>Maximum Available Budget:</span>
                <span className="text-cyan-400 font-bold">{formatCurrency(budget)}</span>
              </label>
              <input
                type="range"
                min="2000000"
                max="20000000"
                step="500000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-cyan-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* Implementation Horizon */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
                Implementation Horizon:
              </label>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-200">
                90 Days (Q3/Q4 Execution Window)
              </div>
            </div>

            {/* Optimization Objective Dropdown */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
                Optimization Objective:
              </label>
              <select
                value={optimizationObjective}
                onChange={(e) => setOptimizationObjective(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="max_reduction">Maximum Risk Reduction (Highest EAL Cut)</option>
                <option value="max_rosi">Maximum ROSI (Best Capital Efficiency)</option>
                <option value="min_residual">Minimum Residual Risk (Crown Jewel Protection)</option>
                <option value="balanced">Balanced Portfolio (Time + Cost + Risk)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Hero Recommended Portfolio Box */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border border-cyan-500/40 shadow-2xl shadow-cyan-950/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-800/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                <Zap className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">Recommended Optimal Portfolio</h3>
                <p className="text-xs text-cyan-300">Algorithmic knapsack optimization output under ₹1.00 Cr budget constraint</p>
              </div>
            </div>
            <Badge variant="success" className="text-xs font-mono px-3 py-1">
              Optimal Portfolio Found
            </Badge>
          </div>

          {/* Key Output Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-sans">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total Investment</span>
              <span className="text-lg font-extrabold text-white font-mono">{formatCurrency(totalSelectedInvestment)}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Expected Risk Reduction</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">{formatCurrency(totalExpectedRiskReduction)}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Residual EAL Exposure</span>
              <span className="text-lg font-extrabold text-amber-400 font-mono">{formatCurrency(residualEAL)}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Unallocated Budget</span>
              <span className="text-lg font-extrabold text-cyan-300 font-mono">{formatCurrency(budgetRemaining)}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Portfolio ROSI Multiplier</span>
              <span className="text-lg font-extrabold text-cyan-400 font-mono">{portfolioROSI}x</span>
            </div>
          </div>
        </div>

        {/* Investment Options Table & Portfolio Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Initiative Toggles Table */}
          <div className="lg:col-span-7">
            <Card title="Available Security Initiatives" subtitle="Toggle initiatives to customize your execution portfolio">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                      <th className="py-3 px-3">Select</th>
                      <th className="py-3 px-3">Initiative</th>
                      <th className="py-3 px-3">Cost</th>
                      <th className="py-3 px-3">Risk Reduction</th>
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3 text-right">ROSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {RISK_REDUCTION_OPPORTUNITIES.map((item) => {
                      const isSelected = selectedInitiativeIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleInitiative(item.id)}
                          className={`hover:bg-slate-900/80 transition-colors cursor-pointer ${
                            isSelected ? 'bg-cyan-950/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-white">
                            {item.name}
                            <span className="text-[10px] text-slate-400 block font-normal font-mono truncate max-w-[200px]">
                              {item.description}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-200">{formatCurrency(item.cost)}</td>
                          <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">{formatCurrency(item.reduction)}</td>
                          <td className="py-3.5 px-3 font-mono text-slate-400">{item.time}</td>
                          <td className="py-3.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                              {item.rosi}x
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Investment vs Risk Reduction Curve Chart */}
          <div className="lg:col-span-5">
            <Card
              title="Investment vs Risk Reduction Curve"
              subtitle="Capital efficiency curve illustrating optimal zone vs diminishing returns"
            >
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curveData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="spendLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0B0F17] border border-cyan-800 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-semibold text-white">Capital Spend: {data.spendLabel}</p>
                              <p className="text-emerald-400 font-mono">Risk Reduction: {formatCurrency(data.reduction)}</p>
                              {data.zone && <p className="text-cyan-300 font-mono text-[10px]">Zone: {data.zone}</p>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="reduction"
                      stroke="#38bdf8"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#38bdf8' }}
                    />
                    <ReferenceDot x="₹75L" y={9100000} r={7} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Optimal Zone (₹10L - ₹75L)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Diminishing Returns (&gt;₹1.25 Cr)</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Expandable AI Explanation Box */}
        <Card
          title="AI Investment Rationale & Trade-off Explanation"
          subtitle="Generated by Cyber Risk Copilot using FAIR optimization constraints"
          headerAction={
            <Link href="/copilot">
              <Button variant="outline" size="sm" className="gap-1 border-cyan-500/40 text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask Copilot Detail</span>
              </Button>
            </Link>
          }
        >
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-800/40 space-y-3 text-xs leading-relaxed">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <p className="text-slate-200">
                  <strong className="text-white">Critical Patching (₹10L)</strong> was prioritized first because it provides immediate risk reduction (₹25L EAL cut) at low cost with a rapid 14-day implementation timeline.
                </p>
                <p className="text-slate-300">
                  <strong className="text-white">MFA (₹15L)</strong> and <strong className="text-white">EDR (₹30L)</strong> provide systemic perimeter and lateral containment across Digital Banking assets.
                </p>
                <p className="text-slate-400 italic">
                  "Network Segmentation (₹50L) was omitted from the recommended portfolio because it requires 90 days execution time and consumes 50% of total budget while producing lower ROSI (0.80x) than the combined Patching + MFA + EDR bundle."
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
