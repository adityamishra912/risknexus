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
import { recommendPortfolio } from '../../lib/api/optimization';

export default function OptimizerPage() {
  const {
    budget,
    setBudget,
    optimizationObjective,
    setOptimizationObjective,
    selectedInitiativeIds,
    setSelectedInitiativeIds,
    toggleInitiative,
    totalSelectedInvestment,
    totalExpectedRiskReduction,
    residualEAL,
    currentEAL,
    budgetRemaining,
    portfolioROSI,
    initiativesList,
    optimizationEvaluation,
  } = useRiskContext();

  const [isAiExplainOpen, setIsAiExplainOpen] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  // Curve data is populated from /recommend (explicit Run Optimizer click)
  const [curveData, setCurveData] = useState([]);
  const [curveLoading, setCurveLoading] = useState(false);

  // Run 0/1 Knapsack optimizer + fetch investment curve for current budget
  const handleAutoOptimize = async () => {
    setIsOptimizing(true);
    setCurveLoading(true);
    try {
      const res = await recommendPortfolio({
        budget,
        objective: optimizationObjective,
        include_curve: true,
      });
      if (res && res.selected_initiative_ids) {
        setSelectedInitiativeIds(res.selected_initiative_ids);
      }
      // Populate the investment curve from the recommend response
      if (res && Array.isArray(res.investment_curve) && res.investment_curve.length > 0) {
        setCurveData(
          res.investment_curve.map((p) => ({
            spend: p.spend,
            spendLabel: p.spend_label || formatCurrency(p.spend),
            reduction: p.risk_reduction,
            residualEal: p.residual_eal,
            zone: p.zone || (p.spend <= budget ? 'Optimal Zone' : 'Diminishing Returns'),
          }))
        );
      }
    } catch (err) {
      console.error('Auto-optimization error:', err);
    } finally {
      setIsOptimizing(false);
      setCurveLoading(false);
    }
  };

  // curveData is local state — populated via handleAutoOptimize (Run Knapsack Solver button)

  const initiativesToDisplay = initiativesList.length > 0 ? initiativesList : [];

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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
            {/* Budget Input / Slider */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 flex justify-between mb-1 font-mono">
                <span>Maximum Available Budget:</span>
                <span className="text-cyan-400 font-bold">{formatCurrency(budget)}</span>
              </label>
              <input
                type="range"
                min="2000000"
                max="30000000"
                step="500000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-cyan-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
              />
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
              </select>
            </div>

            {/* Run Auto-Optimizer Button */}
            <div className="flex items-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAutoOptimize}
                disabled={isOptimizing}
                className="w-full h-9 gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs shadow-md shadow-cyan-950/50"
              >
                <Zap className="w-4 h-4" />
                <span>{isOptimizing ? 'Optimizing...' : 'Run 0/1 Knapsack Solver'}</span>
              </Button>
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
                <h3 className="text-base font-bold text-white tracking-wide">Backend Knapsack Portfolio Evaluation</h3>
                <p className="text-xs text-cyan-300">
                  Joint portfolio Monte Carlo validation under {formatCurrency(budget)} budget constraint
                </p>
              </div>
            </div>
            <Badge variant="success" className="text-xs font-mono px-3 py-1">
              Solver: {optimizationEvaluation?.solver_status || 'OPTIMAL'}
            </Badge>
          </div>

          {/* Key Output Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-sans">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total Investment Cost</span>
              <span className="text-lg font-extrabold text-white font-mono">{formatCurrency(totalSelectedInvestment)}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Joint Portfolio Risk Reduction</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">{formatCurrency(totalExpectedRiskReduction)}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Residual Enterprise EAL</span>
              <span className="text-lg font-extrabold text-amber-400 font-mono">{formatCurrency(residualEAL)}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Unallocated Budget</span>
              <span className="text-lg font-extrabold text-cyan-300 font-mono">{formatCurrency(budgetRemaining)}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Portfolio ROSI</span>
              <span className="text-lg font-extrabold text-cyan-400 font-mono">{portfolioROSI}x</span>
            </div>
          </div>
        </div>

        {/* Investment Options Table & Portfolio Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Initiative Toggles Table */}
          <div className="lg:col-span-7">
            <Card title="Available Security Candidate Controls" subtitle="Select candidate controls to evaluate portfolio risk mitigation">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                      <th className="py-3 px-3">Select</th>
                      <th className="py-3 px-3">Control / Category</th>
                      <th className="py-3 px-3">Cost</th>
                      <th className="py-3 px-3">Marginal Reduction</th>
                      <th className="py-3 px-3">Source Citation</th>
                      <th className="py-3 px-3 text-right">BCR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {initiativesToDisplay.map((item) => {
                      const cid = item.control_id || item.id;
                      const isSelected = selectedInitiativeIds.includes(cid);
                      const costVal = item.cost ?? 0;
                      const redVal = item.risk_reduction ?? item.reduction ?? 0;
                      const bcrVal = item.benefit_cost_ratio ?? item.rosi ?? 0;
                      const cName = item.control_name || item.name || cid;
                      const cType = item.control_type || item.category || 'Security Control';
                      const citation = item.source_citation || item.description || 'Reference Table';

                      return (
                        <tr
                          key={cid}
                          onClick={() => toggleInitiative(cid)}
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
                            {cName}
                            <span className="text-[10px] text-cyan-400 block font-mono">
                              {cType} ({cid})
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-200">{formatCurrency(costVal)}</td>
                          <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">{formatCurrency(redVal)}</td>
                          <td className="py-3.5 px-3 font-mono text-slate-400 text-[10px] truncate max-w-[150px]">
                            {citation}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                              {typeof bcrVal === 'number' ? bcrVal.toFixed(2) : bcrVal}x
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
              title="Dynamic Investment vs Risk Reduction Curve"
              subtitle="Backend Monte Carlo efficient frontier — click Run Solver to generate"
            >
              {curveLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-mono">Running Monte Carlo simulations…</p>
                  </div>
                </div>
              ) : curveData.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center space-y-3 px-6">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto">
                      <Zap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">No curve generated yet</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Click <span className="text-cyan-400 font-mono font-bold">Run Knapsack Solver</span> above to compute the investment efficiency frontier via Monte Carlo simulation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curveData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="spendLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickFormatter={(val) => formatCurrency(val)}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#0B0F17] border border-cyan-800 p-2.5 rounded-lg shadow-xl text-xs space-y-1 font-mono">
                                <p className="font-semibold text-white">Capital Spend: {data.spendLabel}</p>
                                <p className="text-emerald-400 font-bold">Joint Reduction: {formatCurrency(data.reduction)}</p>
                                <p className="text-amber-400 font-bold">Residual EAL: {formatCurrency(data.residualEal)}</p>
                                {data.zone && <p className="text-cyan-300 text-[10px]">Zone: {data.zone}</p>}
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
                        dot={{ r: 4, fill: '#38bdf8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex justify-between text-slate-400 font-mono">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Optimal Feasible Zone</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Diminishing Returns</span>
              </div>
            </Card>
          </div>
        </div>

        {/* AI Explanation Box */}
        <Card
          title="Backend Portfolio Optimization Rationale"
          subtitle="Generated by OR-Tools CP-SAT knapsack solver and Monte Carlo loss engine"
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
                  <strong className="text-white">Knapsack Selection Constraint:</strong> The algorithm selects candidate controls that maximize risk reduction within the strict {formatCurrency(budget)} budget constraint.
                </p>
                <p className="text-slate-300">
                  <strong className="text-white">Simultaneous Monte Carlo Validation:</strong> All selected controls are applied simultaneously to threat breach probabilities. Overlapping controls protect against shared threats without double-counting reductions.
                </p>
                <p className="text-slate-400 italic">
                  "Baseline Enterprise EAL is {formatCurrency(currentEAL)}. Applying the selected portfolio reduces Enterprise EAL down to {formatCurrency(residualEAL)}, yielding an exact validated portfolio risk reduction of {formatCurrency(totalExpectedRiskReduction)}."
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
