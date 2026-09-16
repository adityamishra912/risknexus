'use client';

import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { VULNERABILITY_LIST } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { ShieldAlert, HelpCircle, ArrowRight, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default function VulnerabilitiesPage() {
  const [expandedCve, setExpandedCve] = useState('CVE-2024-3094');

  return (
    <PageContainer
      title="Vulnerability Risk Prioritization"
      subtitle="Contextual risk-based vulnerability triage driven by financial exposure & attack path reachability"
    >
      <div className="space-y-6">
        {/* Contextual Prioritization Formula Callout */}
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Risk Quantification Triage Formula</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Traditional CVSS sorting ignores business context. RiskNexus prioritizes findings based on actual financial loss potential.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-cyan-300 flex flex-wrap items-center gap-1.5 shadow-inner">
              <span className="text-slate-400">Prioritization =</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">CVSS</span>
              <span>+</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">Asset Criticality</span>
              <span>+</span>
              <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">Exploitability</span>
              <span>+</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Attack Path Reach</span>
              <span>+</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 font-sans">Business Loss Impact</span>
            </div>
          </div>
        </Card>

        {/* Vulnerabilities Prioritized Table */}
        <Card title="Ranked Vulnerability Exposure Table" subtitle="Sorted by Financial EAL Contribution rather than raw CVSS">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-3 px-4">CVE ID</th>
                  <th className="py-3 px-4">Affected Asset</th>
                  <th className="py-3 px-4">CVSS Score</th>
                  <th className="py-3 px-4">Known Exploited</th>
                  <th className="py-3 px-4">Asset Criticality</th>
                  <th className="py-3 px-4">Attack Path</th>
                  <th className="py-3 px-4">Financial Exposure</th>
                  <th className="py-3 px-4">Recommended Action</th>
                  <th className="py-3 px-4 text-right">Days Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {VULNERABILITY_LIST.map((vuln) => {
                  const isExpanded = expandedCve === vuln.cve;
                  return (
                    <React.Fragment key={vuln.cve}>
                      <tr
                        onClick={() => setExpandedCve(isExpanded ? null : vuln.cve)}
                        className={`hover:bg-slate-900/80 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-900/90 border-l-2 border-l-cyan-400' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-1.5">
                          <span>{vuln.cve}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-cyan-300">{vuln.assetName}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-red-400 px-2 py-0.5 rounded bg-red-950/60 border border-red-800/60">
                            {vuln.cvss}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {vuln.knownExploited ? (
                            <Badge variant="critical">CISA KEV Active</Badge>
                          ) : (
                            <Badge variant="neutral">Unconfirmed</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{vuln.assetCriticality}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px] truncate max-w-[180px]">{vuln.attackPath}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{formatCurrency(vuln.exposure)}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">{vuln.action}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-400">{vuln.daysOpen} d</td>
                      </tr>

                      {/* "Why is this prioritized?" Explanation Box */}
                      {isExpanded && (
                        <tr className="bg-[#0A0E18] border-b border-slate-800">
                          <td colSpan={9} className="p-4">
                            <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-800/50 space-y-2 text-xs">
                              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                                <HelpCircle className="w-4 h-4 text-cyan-400" />
                                <span>Why is {vuln.cve} prioritized as Top Risk?</span>
                              </div>
                              <p className="text-slate-300 text-xs leading-relaxed pl-6">
                                "{vuln.reason}"
                              </p>
                              <div className="pl-6 pt-1 flex items-center gap-4 text-[11px] font-mono text-slate-400">
                                <span>Risk Contribution: <strong className="text-amber-400">{formatCurrency(vuln.exposure)}</strong></span>
                                <span>•</span>
                                <span>CVSS Weight: 30%</span>
                                <span>•</span>
                                <span>Attack Path Reachability Weight: 70%</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
