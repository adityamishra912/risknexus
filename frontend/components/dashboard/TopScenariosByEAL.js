'use client';

import React, { useState } from 'react';
import Card from '../ui/Card';
import { ArrowUpRight } from 'lucide-react';
import ScenarioDetailModal from '../risk/ScenarioDetailModal';

export default function TopScenariosByEAL() {
  const [selectedScenario, setSelectedScenario] = useState(null);

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
        { name: 'EDR', status: 'Active' },
        { name: 'Backup', status: 'Active' },
        { name: 'MFA', status: 'Disabled' },
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
        { name: 'WAF', status: 'Active' },
        { name: 'DDoS Protection', status: 'Active' },
        { name: 'MFA', status: 'Disabled' },
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
        { name: 'DB Encryption', status: 'Active' },
        { name: 'DLP Audit', status: 'Active' },
        { name: 'MFA', status: 'Active' },
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
        { name: 'PAM', status: 'Active' },
        { name: 'MFA', status: 'Active' },
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
        { name: 'CSPM', status: 'Active' },
        { name: 'Container Guard', status: 'Active' },
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
        { name: 'Network Segmentation', status: 'Disabled' },
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
    <>
      <Card
        title="Top 10 Scenarios by EAL"
        subtitle="Highest financial loss risk scenarios — Click any scenario row to view full details"
      >
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
              {topScenarios.map((row) => (
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
