'use client';

import React, { useState } from 'react';
import Card from '../ui/Card';
import Loading from '../ui/Loading';
import ErrorState from '../ui/ErrorState';
import { ArrowUpRight } from 'lucide-react';
import ScenarioDetailModal from '../risk/ScenarioDetailModal';
import { useRiskContext } from '../../providers/RiskProvider';

export default function TopScenariosByEAL() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const { topRiskDrivers, apiLoading, apiError, refreshData } = useRiskContext();

  if (apiLoading) return (
    <Card title="Top 10 Scenarios by EAL" subtitle="Highest financial loss risk scenarios">
      <Loading message="Loading top risk drivers from backend..." />
    </Card>
  );

  if (apiError) return (
    <Card title="Top 10 Scenarios by EAL" subtitle="Highest financial loss risk scenarios">
      <ErrorState title="Risk Drivers API Error" message={apiError} onRetry={refreshData} />
    </Card>
  );

  return (
    <>
      <Card
        title="Top 10 Scenarios by EAL"
        subtitle="Highest financial loss risk scenarios — Click any scenario row to view full details"
      >
        {topRiskDrivers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No risk scenarios returned by backend.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-2.5 px-3 w-12">Rank</th>
                  <th className="py-2.5 px-3">Threat</th>
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">Likelihood</th>
                  <th className="py-2.5 px-3">EAL</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topRiskDrivers.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedScenario(row)}
                    className="hover:bg-slate-900/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center border border-slate-700">
                        {row.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {row.threat}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-mono text-[11px]">
                      {row.asset}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                      {row.likelihood}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-extrabold text-emerald-400 text-xs">
                      {row.eal}
                    </td>
                    <td className="py-2.5 px-3 text-right">
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

      {/* Scenario Inspection Modal */}
      {selectedScenario && (
        <ScenarioDetailModal
          scenario={selectedScenario}
          onClose={() => setSelectedScenario(null)}
        />
      )}
    </>
  );
}
