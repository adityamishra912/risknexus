'use client';

import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import {
  Calculator,
  Sliders,
  CheckSquare,
  Square,
  ArrowRight,
  TrendingDown,
  PieChart,
  GitFork,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import Link from 'next/link';
import { useRiskContext } from '../../providers/RiskProvider';

export default function SimulatorPage() {
  const {
    simulatedControls,
    setSimulatedControls,
    mfaCoverage,
    setMfaCoverage,
    patchDelayDays,
    setPatchDelayDays,
    setSelectedInitiativeIds,
  } = useRiskContext();

  const toggleControl = (key) => {
    setSimulatedControls(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Dynamic calculations based on active checkboxes and sliders
  let simulatedInvestment = 0;
  let simulatedRiskReduction = 0;
  let maxTimeDays = 14;

  if (simulatedControls.mfa) {
    const extraMfa = (mfaCoverage - 62) * 20000;
    simulatedInvestment += 1500000 + Math.max(0, extraMfa);
    simulatedRiskReduction += 1400000 * (mfaCoverage / 100);
    maxTimeDays = Math.max(maxTimeDays, 30);
  }

  if (simulatedControls.patching) {
    simulatedInvestment += 1000000;
    const patchMultiplier = patchDelayDays <= 14 ? 1.2 : patchDelayDays <= 30 ? 0.9 : 0.6;
    simulatedRiskReduction += 2500000 * patchMultiplier;
    maxTimeDays = Math.max(maxTimeDays, 14);
  }

  if (simulatedControls.edr) {
    simulatedInvestment += 3000000;
    simulatedRiskReduction += 3000000;
    maxTimeDays = Math.max(maxTimeDays, 45);
  }

  if (simulatedControls.segmentation) {
    simulatedInvestment += 5000000;
    simulatedRiskReduction += 4000000;
    maxTimeDays = Math.max(maxTimeDays, 90);
  }

  if (simulatedControls.backup) {
    simulatedInvestment += 2000000;
    simulatedRiskReduction += 2200000;
    maxTimeDays = Math.max(maxTimeDays, 14);
  }

  const currentEAL = 16000000; // ₹1.60 Cr
  const currentP95 = 41000000; // ₹4.10 Cr

  const simulatedEAL = Math.max(1500000, currentEAL - simulatedRiskReduction);
  const simulatedP95 = Math.max(10000000, currentP95 - (simulatedRiskReduction * 1.35));

  const totalReductionAmount = currentEAL - simulatedEAL;
  const reductionPercentage = ((totalReductionAmount / currentEAL) * 100).toFixed(1);
  const estimatedROSI = simulatedInvestment > 0 ? (totalReductionAmount / simulatedInvestment).toFixed(2) : '0.00';

  const chartData = [
    {
      metric: 'Expected Annual Loss (EAL)',
      'Current Baseline': currentEAL / 100000,
      'Simulated Exposure': simulatedEAL / 100000,
    },
    {
      metric: 'P95 Extreme Exposure',
      'Current Baseline': currentP95 / 100000,
      'Simulated Exposure': simulatedP95 / 100000,
    },
  ];

  const handleApplyToOptimizer = () => {
    const activeIds = [];
    if (simulatedControls.patching) activeIds.push('INIT-01');
    if (simulatedControls.mfa) activeIds.push('INIT-02');
    if (simulatedControls.edr) activeIds.push('INIT-03');
    if (simulatedControls.backup) activeIds.push('INIT-04');
    if (simulatedControls.segmentation) activeIds.push('INIT-05');
    setSelectedInitiativeIds(activeIds);
  };

  return (
    <PageContainer
      title="What-If Risk Simulator"
      subtitle="Model the financial effect of security decisions and control deployments before spending budget"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Scenario Controls Panel */}
          <div className="lg:col-span-5 space-y-4">
            <Card title="Scenario Controls & Parameters" subtitle="Select security initiatives & tune coverage sliders">
              <div className="space-y-4 text-xs">
                {/* Initiative Checkboxes */}
                <div className="space-y-2.5">
                  <span className="text-slate-300 font-semibold block">Select Controls to Model:</span>

                  {[
                    { key: 'mfa', label: 'Enable MFA Across Privileged Endpoints', cost: '₹15L' },
                    { key: 'patching', label: 'Patch Critical Zero-Day Vulnerabilities', cost: '₹10L' },
                    { key: 'edr', label: 'Deploy EDR Agent to 1,250 Workstations', cost: '₹30L' },
                    { key: 'segmentation', label: 'Implement Micro-Segmentation', cost: '₹50L' },
                    { key: 'backup', label: 'Harden Immutable Air-Gapped Backups', cost: '₹20L' },
                  ].map((ctrl) => (
                    <div
                      key={ctrl.key}
                      onClick={() => toggleControl(ctrl.key)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        simulatedControls[ctrl.key]
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {simulatedControls[ctrl.key] ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="font-medium text-slate-200">{ctrl.label}</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-400">{ctrl.cost}</span>
                    </div>
                  ))}
                </div>

                {/* Slider 1: MFA Coverage */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-300 font-semibold">MFA Coverage Level</span>
                    <span className="text-cyan-400 font-bold">{mfaCoverage}% (Simulated)</span>
                  </div>
                  <input
                    type="range"
                    min="62"
                    max="100"
                    value={mfaCoverage}
                    onChange={(e) => setMfaCoverage(Number(e.target.value))}
                    className="w-full accent-cyan-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Current Baseline: 62%</span>
                    <span>Target Target: 100%</span>
                  </div>
                </div>

                {/* Slider 2: Patch SLA Delay */}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-300 font-semibold">Remediation Patch Delay SLA</span>
                    <span className="text-amber-400 font-bold">{patchDelayDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min="7"
                    max="60"
                    value={patchDelayDays}
                    onChange={(e) => setPatchDelayDays(Number(e.target.value))}
                    className="w-full accent-amber-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Aggressive: 7 days</span>
                    <span>Standard: 14 days</span>
                    <span>Relaxed: 60 days</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Results & Comparison Output Panel */}
          <div className="lg:col-span-7 space-y-6">
            {/* Before vs After Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CURRENT */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <Badge variant="warning">CURRENT BASELINE</Badge>
                <div className="pt-1">
                  <span className="text-xs text-slate-400 block">Expected Annual Loss (EAL)</span>
                  <span className="text-2xl font-extrabold text-amber-400 font-mono">{formatCurrency(currentEAL)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">P95 Extreme Exposure</span>
                  <span className="text-lg font-bold text-red-400 font-mono">{formatCurrency(currentP95)}</span>
                </div>
              </div>

              {/* SIMULATED */}
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 space-y-2">
                <Badge variant="success">SIMULATED STATE</Badge>
                <div className="pt-1">
                  <span className="text-xs text-slate-400 block">Simulated Annual Loss (EAL)</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">{formatCurrency(simulatedEAL)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Simulated P95 Exposure</span>
                  <span className="text-lg font-bold text-emerald-300 font-mono">{formatCurrency(simulatedP95)}</span>
                </div>
              </div>
            </div>

            {/* Simulation Result Callout Box */}
            <Card title="Modeled Risk Reduction Output">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Net Risk Reduction</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">{formatCurrency(totalReductionAmount)}</span>
                  <span className="text-[10px] text-emerald-500 font-mono block">↓ {reductionPercentage}%</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Required Capital</span>
                  <span className="text-base font-bold text-slate-200 font-mono">{formatCurrency(simulatedInvestment)}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Modeled ROSI</span>
                  <span className="text-base font-bold text-cyan-400 font-mono">{estimatedROSI}x</span>
                  <span className="text-[10px] text-cyan-500 font-mono block">Return Multiplier</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Implementation Time</span>
                  <span className="text-base font-bold text-white font-mono">{maxTimeDays} Days</span>
                </div>
              </div>

              {/* Large Comparison Bar Chart */}
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#e2e8f0', fontSize: 11 }} />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(val) => `₹${val}L`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#0B0F17] border border-cyan-800 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-semibold text-white">{payload[0].payload.metric}</p>
                              <p className="text-amber-400 font-mono">Current: ₹{payload[0].value}L</p>
                              <p className="text-emerald-400 font-mono">Simulated: ₹{payload[1].value}L</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Current Baseline" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Simulated Exposure" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
                <Link href="/optimizer" onClick={handleApplyToOptimizer}>
                  <Button variant="primary" size="md" className="gap-2">
                    <PieChart className="w-4 h-4" />
                    <span>Apply Scenario to Investment Optimizer</span>
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Affected Attack Paths Callout */}
            <Card title="Mitigated Attack Paths" subtitle="Attack paths neutralized by this simulated scenario">
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Internet → Web Server → Payment API → Customer DB</span>
                  <Badge variant="success">NEUTRALIZED BY MFA</Badge>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">K8s Pod → Container Escape → Cloud IAM Admin</span>
                  <Badge variant="success">MITIGATED BY PATCHING</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
