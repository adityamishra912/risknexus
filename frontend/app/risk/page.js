'use client';

import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';
import ErrorState from '../../components/ui/ErrorState';
import ScenarioDetailModal from '../../components/risk/ScenarioDetailModal';
import {
  GitCommit,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  ArrowUpRight,
  RefreshCw,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useRiskContext } from '../../providers/RiskProvider';

export default function RiskQuantificationPage() {
  const [isAssumptionsExpanded, setIsAssumptionsExpanded] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const {
    topRiskAssets: topAssets,
    topRiskDrivers: topScenarios,
    apiLoading: loading,
    apiError: error,
    refreshData,
    lastFetchedAt,
  } = useRiskContext();

  const pipelineSteps = [
    { title: 'Technical Findings', desc: 'Continuous Vulnerability Aggregation', color: 'from-blue-600 to-cyan-600' },
    { title: 'Asset Criticality', desc: 'CMDB & Service Value Scoring', color: 'from-cyan-600 to-teal-600' },
    { title: 'Threat Likelihood', desc: 'Calibrated Threat Intel', color: 'from-teal-600 to-emerald-600' },
    { title: 'Attack Paths', desc: 'Network Graph Reachability', color: 'from-emerald-600 to-amber-600' },
    { title: 'Financial Impact', desc: 'FAIR Monte Carlo Simulator', color: 'from-amber-600 to-orange-600' },
    { title: 'Risk Distribution', desc: 'EAL, P90, P95, P99 Percentiles', color: 'from-orange-600 to-red-600' },
  ];

  const timeLabel = lastFetchedAt
    ? lastFetchedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <PageContainer
      title="Risk Quantification Engine"
      subtitle="Continuous FAIR & Monte Carlo financial risk modeling pipeline"
      action={
        <div className="flex items-center gap-2">
          {timeLabel && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3 text-cyan-500" />
              <span>Updated {timeLabel}</span>
            </div>
          )}
          <Button
            variant="outline" size="sm"
            className="gap-1.5 border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-300"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 border-slate-700">
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Loss Model CSV</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Calculation Pipeline Visualizer */}
        <Card title="Risk Calculation Pipeline" subtitle="End-to-end continuous risk modeling flow">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipelineSteps.map((step, idx) => (
              <div key={idx} className="relative group">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center border border-slate-700">
                      {idx + 1}
                    </span>
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color}`}></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{step.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">{step.desc}</p>
                  </div>
                </div>
                {idx < pipelineSteps.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {loading ? (
          <Loading message="Fetching risk quantification engine data from backend..." />
        ) : error ? (
          <ErrorState
            title="Risk Engine Backend Error"
            message={error}
            onRetry={fetchRiskData}
          />
        ) : (
          <>
            {/* SECTION 1: RISK BY ASSET (Top 10 Highest-Risk Assets) */}
            <Card
              title="Risk by Asset"
              subtitle="Top 10 highest-risk enterprise assets sorted by financial EAL exposure"
              headerAction={
                <Link href="/assets">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-700 hover:border-cyan-500">
                    <span>View all assets</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                  </Button>
                </Link>
              }
            >
              {topAssets.length === 0 ? (
                <div className="p-4 text-xs text-slate-400 text-center">No asset risk data returned from backend API.</div>
              ) : (
                <div className="space-y-3 pt-1">
                  {topAssets.map((asset) => (
                    <Link href={`/assets/${asset.id}`} key={asset.id} className="block group">
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {asset.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({asset.type} • {asset.service})
                            </span>
                            <Badge variant={asset.percent > 50 ? 'critical' : asset.percent > 30 ? 'warning' : 'info'}>
                              {asset.criticality}
                            </Badge>
                          </div>
                          <div className="font-mono font-extrabold text-amber-400 text-sm">
                            {asset.formattedEal}
                          </div>
                        </div>

                        {/* Progress / Risk Bar */}
                        <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              asset.percent > 60
                                ? 'bg-gradient-to-r from-red-600 to-amber-500'
                                : asset.percent > 30
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            }`}
                            style={{ width: `${asset.percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* SECTION 2: TOP RISK DRIVERS (Top 10 Scenarios by EAL) */}
            <Card
              title="Top Risk Drivers"
              subtitle="Top 10 risk scenarios ranked by Expected Annual Loss (EAL) — Click any row to inspect details"
            >
              {topScenarios.length === 0 ? (
                <div className="p-4 text-xs text-slate-400 text-center">No risk drivers returned from backend API.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                        <th className="py-3 px-4 w-16">Rank</th>
                        <th className="py-3 px-4">Threat</th>
                        <th className="py-3 px-4">Asset</th>
                        <th className="py-3 px-4">Likelihood</th>
                        <th className="py-3 px-4">EAL</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {topScenarios.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedScenario(row)}
                          className="hover:bg-slate-900/80 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center border border-slate-700">
                              {row.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-white group-hover:text-cyan-300 transition-colors">
                            {row.threat}
                          </td>
                          <td className="py-3 px-4 text-cyan-300 font-mono text-[11px]">
                            {row.asset}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {row.likelihood}
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                            {row.eal}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-cyan-400 hover:text-cyan-300 text-xs font-medium inline-flex items-center gap-1">
                              Inspect
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Model Assumptions Expandable Panel */}
        <Card
          headerAction={
            <button
              onClick={() => setIsAssumptionsExpanded(!isAssumptionsExpanded)}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>{isAssumptionsExpanded ? 'Collapse Model Parameters' : 'Expand Parameters & Assumptions'}</span>
              {isAssumptionsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          }
          title="Risk Engine Model Assumptions & Parameters"
          subtitle="Governing mathematical constraints, data confidence parameters, and FAIR model state"
        >
          {isAssumptionsExpanded && (
            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Probability Assumptions</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Threat Event Frequency (TEF) modeled via Poisson distribution using continuous threat intelligence feeds and historical peer banking attack rates.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Impact Magnitude Assumptions</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Financial loss includes incident response fees (₹15L), regulatory penalties (₹45L), customer notification & credit monitoring (₹25L), and business interruption loss.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Control Effectiveness</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Controls evaluated dynamically. Partial MFA coverage reduces exploit probability by 55%, while full MFA enforcement provides 92% reduction efficiency.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Reusable Scenario Detail Modal */}
      {selectedScenario && (
        <ScenarioDetailModal
          scenario={selectedScenario}
          onClose={() => setSelectedScenario(null)}
        />
      )}
    </PageContainer>
  );
}
