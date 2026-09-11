'use client';

import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ScenarioDetailModal from '../../components/risk/ScenarioDetailModal';
import {
  GitCommit,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  Database,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default function RiskQuantificationPage() {
  const [isAssumptionsExpanded, setIsAssumptionsExpanded] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);

  const pipelineSteps = [
    { title: 'Technical Findings', desc: '1,420 Vulns & Misconfigs', color: 'from-blue-600 to-cyan-600' },
    { title: 'Asset Criticality', desc: '150 Assets Scored', color: 'from-cyan-600 to-teal-600' },
    { title: 'Threat Likelihood', desc: 'Continuous Intel Feeds', color: 'from-teal-600 to-emerald-600' },
    { title: 'Attack Paths', desc: 'Graph Reachability', color: 'from-emerald-600 to-amber-600' },
    { title: 'Financial Impact', desc: 'FAIR Monte Carlo Model', color: 'from-amber-600 to-orange-600' },
    { title: 'Risk Distribution', desc: 'EAL, P90, P95, P99 Exposure', color: 'from-orange-600 to-red-600' },
  ];

  // Top 10 Highest-Risk Assets
  const topAssets = [
    { id: 'PAY-API-01', name: 'Payment Database', type: 'Database', service: 'Payment Gateway', eal: 4200000, formattedEal: '₹42L', percent: 100, criticality: '10/10' },
    { id: 'WEB-FE-03', name: 'Web Server', type: 'Web Server', service: 'Online Banking', eal: 3100000, formattedEal: '₹31L', percent: 74, criticality: '9/10' },
    { id: 'CUST-DB-02', name: 'Customer Database', type: 'Database', service: 'Finance ERP', eal: 2700000, formattedEal: '₹27L', percent: 64, criticality: '10/10' },
    { id: 'API-SRV-04', name: 'API Server', type: 'API Gateway', service: 'Payment Gateway', eal: 1800000, formattedEal: '₹18L', percent: 43, criticality: '9/10' },
    { id: 'AUTH-ID-01', name: 'Identity Server', type: 'Identity / IAM', service: 'Settlement Platform', eal: 1500000, formattedEal: '₹15L', percent: 36, criticality: '9/10' },
    { id: 'K8S-CLUSTER-01', name: 'Kubernetes Cluster', type: 'Cloud Workload', service: 'Online Banking', eal: 1400000, formattedEal: '₹14L', percent: 33, criticality: '8.5/10' },
    { id: 'ERP-FIN-02', name: 'Finance ERP Host', type: 'Application', service: 'Finance ERP', eal: 1200000, formattedEal: '₹12L', percent: 28, criticality: '8/10' },
    { id: 'TREAS-HOST-01', name: 'Treasury System Host', type: 'Database', service: 'Treasury System', eal: 950000, formattedEal: '₹9.5L', percent: 22, criticality: '8/10' },
    { id: 'PAYROLL-DB-01', name: 'Payroll DB Cluster', type: 'Database', service: 'Payroll', eal: 800000, formattedEal: '₹8.0L', percent: 19, criticality: '7/10' },
    { id: 'CRM-CUST-01', name: 'Support CRM Server', type: 'Web Server', service: 'Customer CRM', eal: 650000, formattedEal: '₹6.5L', percent: 15, criticality: '6/10' },
  ];

  // Top 10 Scenarios by EAL
  const topScenarios = [
    {
      rank: 1,
      id: 'RS001',
      threat: 'Ransomware',
      asset: 'Payment DB',
      assetId: 'PAY-API-01',
      likelihood: '19.2%',
      likelihoodVal: '19.23%',
      eal: '₹42L',
      ealVal: 4200000,
      p95: '₹1.28Cr',
      attackPath: ['Internet', 'Web Server', 'Payment Database'],
      vulnerabilities: [
        { cve: 'CVE-2025-10001', cvss: 9.9, severity: 'Critical', status: 'Known Exploited (CISA KEV)' },
        { cve: 'CVE-2024-20012', cvss: 8.4, severity: 'High', status: 'Unpatched' },
      ],
      existingControls: [
        { name: 'EDR', status: 'Active (Fully Implemented)' },
        { name: 'Backup', status: 'Active (Immutable WORM Vault)' },
        { name: 'MFA', status: 'Disabled (Partial Coverage Risk)' },
      ],
    },
    {
      rank: 2,
      id: 'RS002',
      threat: 'Public App Exploit',
      asset: 'Web Server',
      assetId: 'WEB-FE-03',
      likelihood: '15.4%',
      likelihoodVal: '15.40%',
      eal: '₹31L',
      ealVal: 3100000,
      p95: '₹95L',
      attackPath: ['Internet', 'Edge Router', 'Web Server'],
      vulnerabilities: [
        { cve: 'CVE-2024-3094', cvss: 10.0, severity: 'Critical', status: 'Remote Code Execution' },
        { cve: 'CVE-2023-4863', cvss: 8.8, severity: 'High', status: 'Buffer Overflow' },
      ],
      existingControls: [
        { name: 'WAF', status: 'Active (Partial Rules)' },
        { name: 'DDoS Protection', status: 'Active' },
        { name: 'MFA', status: 'Not Enforced' },
      ],
    },
    {
      rank: 3,
      id: 'RS003',
      threat: 'Data Exfiltration',
      asset: 'Customer DB',
      assetId: 'CUST-DB-02',
      likelihood: '11.8%',
      likelihoodVal: '11.85%',
      eal: '₹27L',
      ealVal: 2700000,
      p95: '₹82L',
      attackPath: ['Internet', 'Web Server', 'API Gateway', 'Customer DB'],
      vulnerabilities: [
        { cve: 'CVE-2024-21626', cvss: 8.8, severity: 'High', status: 'Runc Breakout' },
      ],
      existingControls: [
        { name: 'DB Encryption', status: 'Active (AES-256)' },
        { name: 'DLP Monitoring', status: 'Active' },
        { name: 'MFA', status: 'Required' },
      ],
    },
    {
      rank: 4,
      id: 'RS004',
      threat: 'Credential Theft',
      asset: 'Identity Server',
      assetId: 'AUTH-ID-01',
      likelihood: '18.1%',
      likelihoodVal: '18.10%',
      eal: '₹18L',
      ealVal: 1800000,
      p95: '₹55L',
      attackPath: ['Phishing Email', 'Workstation', 'Identity Server'],
      vulnerabilities: [
        { cve: 'CVE-2023-30021', cvss: 8.8, severity: 'High', status: 'Kerberoasting' },
      ],
      existingControls: [
        { name: 'EDR', status: 'Active' },
        { name: 'PAM', status: 'Partial' },
        { name: 'MFA', status: 'Enforced' },
      ],
    },
    {
      rank: 5,
      id: 'RS005',
      threat: 'Cloud Compromise',
      asset: 'K8s Cluster',
      assetId: 'K8S-CLUSTER-01',
      likelihood: '14.2%',
      likelihoodVal: '14.20%',
      eal: '₹14L',
      ealVal: 1400000,
      p95: '₹42L',
      attackPath: ['Internet', 'Public Container Registry', 'K8s Cluster'],
      vulnerabilities: [
        { cve: 'CVE-2025-10110', cvss: 7.4, severity: 'Medium', status: 'Container Privilege Escalation' },
      ],
      existingControls: [
        { name: 'CSPM', status: 'Monitored' },
        { name: 'Container Scanning', status: 'Active' },
      ],
    },
    {
      rank: 6,
      id: 'RS006',
      threat: 'Supply Chain Attack',
      asset: 'Finance ERP Host',
      assetId: 'ERP-FIN-02',
      likelihood: '8.4%',
      likelihoodVal: '8.40%',
      eal: '₹12L',
      ealVal: 1200000,
      p95: '₹38L',
      attackPath: ['3rd Party Vendor', 'VPN Tunnel', 'Finance ERP Host'],
      vulnerabilities: [
        { cve: 'CVE-2024-21009', cvss: 7.2, severity: 'Medium', status: 'Third-Party Library Flaw' },
      ],
      existingControls: [
        { name: 'VPN Gateway', status: 'Active' },
        { name: 'Network Segmentation', status: 'Partial' },
      ],
    },
    {
      rank: 7,
      id: 'RS007',
      threat: 'Denial of Service',
      asset: 'API Server',
      assetId: 'API-SRV-04',
      likelihood: '14.3%',
      likelihoodVal: '14.30%',
      eal: '₹9.5L',
      ealVal: 950000,
      p95: '₹28L',
      attackPath: ['Internet Botnet', 'API Gateway', 'API Server'],
      vulnerabilities: [
        { cve: 'CVE-2025-10002', cvss: 7.9, severity: 'High', status: 'Rate Limit Exhaustion' },
      ],
      existingControls: [
        { name: 'API Throttling', status: 'Active' },
        { name: 'Cloudflare DDoS', status: 'Active' },
      ],
    },
    {
      rank: 8,
      id: 'RS008',
      threat: 'Insider Threat',
      asset: 'Treasury System Host',
      assetId: 'TREAS-HOST-01',
      likelihood: '6.2%',
      likelihoodVal: '6.20%',
      eal: '₹8.0L',
      ealVal: 800000,
      p95: '₹24L',
      attackPath: ['Internal User', 'Privileged Workstation', 'Treasury System Host'],
      vulnerabilities: [
        { cve: 'CVE-2023-20011', cvss: 6.5, severity: 'Medium', status: 'Privilege Misconfiguration' },
      ],
      existingControls: [
        { name: 'PAM', status: 'Active' },
        { name: 'SIEM Audit Logs', status: 'Active' },
      ],
    },
    {
      rank: 9,
      id: 'RS009',
      threat: 'Web Session Hijacking',
      asset: 'Support CRM Server',
      assetId: 'CRM-CUST-01',
      likelihood: '9.8%',
      likelihoodVal: '9.80%',
      eal: '₹6.5L',
      ealVal: 650000,
      p95: '₹19L',
      attackPath: ['Internet', 'Support CRM Server'],
      vulnerabilities: [
        { cve: 'CVE-2025-10003', cvss: 6.2, severity: 'Medium', status: 'XSS Session Fixation' },
      ],
      existingControls: [
        { name: 'WAF', status: 'Active' },
      ],
    },
    {
      rank: 10,
      id: 'RS010',
      threat: 'Database Extortion',
      asset: 'Payroll DB Cluster',
      assetId: 'PAYROLL-DB-01',
      likelihood: '5.1%',
      likelihoodVal: '5.10%',
      eal: '₹5.0L',
      ealVal: 500000,
      p95: '₹15L',
      attackPath: ['Internal Network', 'Payroll DB Cluster'],
      vulnerabilities: [
        { cve: 'CVE-2024-20011', cvss: 5.6, severity: 'Medium', status: 'SQL Injection' },
      ],
      existingControls: [
        { name: 'DB Firewall', status: 'Active' },
        { name: 'Encrypted Backups', status: 'Active' },
      ],
    },
  ];

  return (
    <PageContainer
      title="Risk Quantification Engine"
      subtitle="Continuous FAIR & Monte Carlo financial risk modeling pipeline"
      action={
        <Button variant="outline" size="sm" className="gap-1.5 border-slate-700">
          <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export Loss Model CSV</span>
        </Button>
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

        {/* Primary Benchmark Scenario Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Model Threat Likelihood</span>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">19.2%</div>
            <span className="text-[10px] text-slate-500 font-mono">Calibrated XGBoost Output</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Single Event Potential Impact</span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">₹2.20 Cr</div>
            <span className="text-[10px] text-slate-500 font-mono">Business Downtime + Data Loss</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Total Enterprise EAL</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">₹1.83 Cr</div>
            <span className="text-[10px] text-slate-500 font-mono">Likelihood × Single Event Loss</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Model Confidence Level</span>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono mt-1 flex items-center gap-2">
              <span>High</span>
              <Badge variant="success">85% Confidence</Badge>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Based on 11 verified data feeds</span>
          </div>
        </div>

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
        </Card>

        {/* SECTION 2: TOP RISK DRIVERS (Top 10 Scenarios by EAL) */}
        <Card
          title="Top Risk Drivers"
          subtitle="Top 10 risk scenarios ranked by Expected Annual Loss (EAL) — Click any row to inspect details"
        >
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
        </Card>

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
