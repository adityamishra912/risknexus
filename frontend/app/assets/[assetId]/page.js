'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import PageContainer from '../../../components/layout/PageContainer';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { ASSET_LIST, VULNERABILITY_LIST } from '../../../lib/constants';
import { formatCurrency } from '../../../lib/utils/formatCurrency';
import {
  Server,
  ShieldAlert,
  GitFork,
  Lock,
  Activity,
  FileCheck,
  ArrowLeft,
  Play,
  ArrowRight,
  Database,
  Globe,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function AssetDetailPage() {
  const params = useParams();
  const rawId = params?.assetId || 'PAY-API-01';

  // Map asset IDs to rich asset profile data
  const assetMap = {
    'PAY-API-01': {
      id: 'PAY-API-01',
      name: 'Payment Database',
      type: 'Database',
      businessService: 'Payment Gateway',
      criticality: '10/10',
      owner: 'Payments Engineering',
      ip: '192.168.10.45',
      eal: 4200000,
      formattedEal: '₹42L',
      p95: 12800000,
      formattedP95: '₹1.28Cr',
      internetExposed: true,
      downtimeCostPerHour: 4000000,
      dataSensitivity: 'High',
      vulnerabilities: [
        { cve: 'CVE-2025-10001', cvss: 9.9, severity: 'Critical', daysOpen: 47, status: 'Known Exploited (CISA KEV)', action: 'Apply vendor hotfix immediately' },
        { cve: 'CVE-2024-20012', cvss: 8.4, severity: 'High', daysOpen: 36, status: 'Unpatched', action: 'Upgrade PostgreSQL core binary' },
      ],
      controls: [
        { name: 'Endpoint Detection & Response (EDR)', coverage: '100%', status: 'Implemented', badge: 'success' },
        { name: 'Immutable WORM Backup Vault', coverage: '100%', status: 'Implemented', badge: 'success' },
        { name: 'Multi-Factor Authentication (MFA)', coverage: '35%', status: 'Partially Implemented', badge: 'warning' },
        { name: 'Web Application Firewall (WAF)', coverage: '60%', status: 'Partially Implemented', badge: 'warning' },
      ],
      attackPaths: [
        ['Internet', 'Web Server (WEB-FE-03)', 'Payment Database (PAY-API-01)'],
        ['Public API Gateway', 'Payment Database (PAY-API-01)'],
      ],
      riskScenarios: [
        { id: 'RS001', threat: 'Ransomware', likelihood: '19.23%', eal: 4200000, p95: 12800000 },
        { id: 'RS007', threat: 'Denial of Service', likelihood: '14.30%', eal: 950000, p95: 2800000 },
      ],
      topDrivers: [
        'Internet perimeter exposure without full FIDO2 MFA enforcement',
        'Unpatched CVE-2025-10001 with active CISA KEV exploit intelligence',
        'High downtime cost per hour (₹40L/hr) on Payment Gateway service',
      ],
    },
    'WEB-FE-03': {
      id: 'WEB-FE-03',
      name: 'Web Server',
      type: 'Web Server',
      businessService: 'Online Banking',
      criticality: '9/10',
      owner: 'Web Platform Team',
      ip: '198.51.100.24',
      eal: 3100000,
      formattedEal: '₹31L',
      p95: 9500000,
      formattedP95: '₹95L',
      internetExposed: true,
      downtimeCostPerHour: 3000000,
      dataSensitivity: 'High',
      vulnerabilities: [
        { cve: 'CVE-2024-3094', cvss: 10.0, severity: 'Critical', daysOpen: 4, status: 'Remote Code Execution', action: 'Patch xz-utils binary' },
        { cve: 'CVE-2023-4863', cvss: 8.8, severity: 'High', daysOpen: 14, status: 'Buffer Overflow', action: 'Update libwebp dependency' },
      ],
      controls: [
        { name: 'Web Application Firewall (WAF)', coverage: '80%', status: 'Implemented', badge: 'success' },
        { name: 'DDoS Mitigation Shield', coverage: '100%', status: 'Implemented', badge: 'success' },
        { name: 'Multi-Factor Authentication (MFA)', coverage: '0%', status: 'Not Implemented', badge: 'critical' },
      ],
      attackPaths: [
        ['Internet', 'Edge Router', 'Web Server (WEB-FE-03)'],
      ],
      riskScenarios: [
        { id: 'RS002', threat: 'Public App Exploit', likelihood: '15.40%', eal: 3100000, p95: 9500000 },
      ],
      topDrivers: [
        'Direct Internet ingress exposure on port 443 with buffer overflow CVE',
        'High Online Banking downtime cost per hour (₹30L/hr)',
      ],
    },
    'CUST-DB-02': {
      id: 'CUST-DB-02',
      name: 'Customer Database',
      type: 'Database',
      businessService: 'Finance ERP',
      criticality: '10/10',
      owner: 'DBA Team',
      ip: '10.0.4.12',
      eal: 2700000,
      formattedEal: '₹27L',
      p95: 8200000,
      formattedP95: '₹82L',
      internetExposed: false,
      downtimeCostPerHour: 2500000,
      dataSensitivity: 'High',
      vulnerabilities: [
        { cve: 'CVE-2024-21626', cvss: 8.8, severity: 'High', daysOpen: 12, status: 'Runc Container Escape', action: 'Update container runtime' },
      ],
      controls: [
        { name: 'AES-256 DB Encryption', coverage: '100%', status: 'Implemented', badge: 'success' },
        { name: 'DLP Audit Logging', coverage: '100%', status: 'Implemented', badge: 'success' },
        { name: 'Air-gapped Backups', coverage: '100%', status: 'Implemented', badge: 'success' },
      ],
      attackPaths: [
        ['Internet', 'Web Server', 'API Gateway', 'Customer Database (CUST-DB-02)'],
      ],
      riskScenarios: [
        { id: 'RS003', threat: 'Data Exfiltration', likelihood: '11.85%', eal: 2700000, p95: 8200000 },
      ],
      topDrivers: [
        'Sensitive PII and customer financial record repository',
        'Pivot reachability from exposed Web Server',
      ],
    },
  };

  const defaultAsset = {
    id: rawId,
    name: rawId.replace(/-/g, ' '),
    type: 'Enterprise Server',
    businessService: 'Core Infrastructure',
    criticality: '8/10',
    owner: 'IT Infra Team',
    ip: '10.0.1.100',
    eal: 1800000,
    formattedEal: '₹18L',
    p95: 5500000,
    formattedP95: '₹55L',
    internetExposed: true,
    downtimeCostPerHour: 1800000,
    dataSensitivity: 'Medium',
    vulnerabilities: [
      { cve: 'CVE-2025-10002', cvss: 7.9, severity: 'High', daysOpen: 25, status: 'Unpatched', action: 'Apply security update' },
    ],
    controls: [
      { name: 'Endpoint Detection & Response (EDR)', coverage: '100%', status: 'Implemented', badge: 'success' },
      { name: 'Multi-Factor Authentication (MFA)', coverage: '50%', status: 'Partially Implemented', badge: 'warning' },
    ],
    attackPaths: [
      ['Internet', rawId],
    ],
    riskScenarios: [
      { id: 'RS004', threat: 'Credential Theft', likelihood: '18.10%', eal: 1800000, p95: 5500000 },
    ],
    topDrivers: [
      'Unpatched vulnerability with moderate CVSS score',
      'Partial MFA coverage on administrative interfaces',
    ],
  };

  const asset = assetMap[rawId] || defaultAsset;

  return (
    <PageContainer
      title={`Asset Profile: ${asset.name}`}
      subtitle={`ID: ${asset.id} • Business Service: ${asset.businessService} • Owner: ${asset.owner}`}
      action={
        <div className="flex items-center gap-2">
          <Link href="/assets">
            <Button variant="outline" size="sm" className="gap-1 border-slate-700">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Assets</span>
            </Button>
          </Link>
          <Link href="/simulator">
            <Button variant="primary" size="sm" className="gap-1">
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Risk Reduction</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Asset Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Business Criticality</span>
            <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">{asset.criticality}</div>
            <span className="text-[10px] text-slate-500 font-mono">Tier 1 Financial Asset</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Financial EAL Exposure</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{asset.formattedEal}</div>
            <span className="text-[10px] text-slate-500 font-mono">Point-Estimate Expected Annual Loss</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">P95 Maximum Financial Loss</span>
            <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">{asset.formattedP95}</div>
            <span className="text-[10px] text-slate-500 font-mono">95th Percentile Monte Carlo Tail Risk</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Internet Exposure</span>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {asset.internetExposed ? 'Exposed' : 'Internal'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">IP: {asset.ip}</span>
          </div>
        </div>

        {/* Section 1: Business Service & Top Risk Drivers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Service Context */}
          <Card title="Business Service Context" subtitle="Service dependencies & downtime cost breakdown">
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[11px]">Primary Business Service</span>
                <span className="text-sm font-bold text-white block">{asset.businessService}</span>
                <span className="text-slate-400 text-[11px] block">
                  Handles mission-critical financial workflows and transactional state.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Downtime Cost / Hour</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">
                    {formatCurrency(asset.downtimeCostPerHour)}/hr
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Data Sensitivity</span>
                  <Badge variant="critical" className="mt-1">
                    {asset.dataSensitivity} Sensitivity
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Top Risk Drivers */}
          <Card title="Top Risk Drivers" subtitle="Key technical & operational factors driving asset risk score">
            <div className="space-y-2 text-xs">
              {asset.topDrivers.map((driver, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200 leading-relaxed">{driver}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Section 2: Vulnerabilities & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Associated Vulnerabilities */}
          <Card title="Associated Vulnerabilities" subtitle="Detected CVEs contributing to financial risk">
            <div className="space-y-3">
              {asset.vulnerabilities.map((v, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-red-400 text-xs">{v.cve}</span>
                    <Badge variant={v.cvss >= 9.0 ? 'critical' : 'warning'}>CVSS {v.cvss}</Badge>
                  </div>
                  <p className="text-slate-300 font-medium">{v.action}</p>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Days Open: {v.daysOpen} days</span>
                    <span className="text-amber-400 font-bold">{v.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Existing Security Controls */}
          <Card title="Security Controls & Coverage" subtitle="Protective mechanisms deployed on this asset">
            <div className="space-y-3 text-xs">
              {asset.controls.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">{c.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">Coverage: {c.coverage}</span>
                  </div>
                  <Badge variant={c.badge}>{c.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Section 3: Attack Paths & Linked Risk Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attack Paths */}
          <Card title="Attack Paths Reachability" subtitle="Direct ingress sequences reaching this asset">
            <div className="space-y-3 text-xs">
              {asset.attackPaths.map((path, pIdx) => (
                <div key={pIdx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-slate-400 font-mono text-[10px] block font-bold">Path #{pIdx + 1}</span>
                  <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                    {path.map((step, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <span className={`px-2.5 py-1 rounded bg-slate-900 border ${sIdx === path.length - 1 ? 'border-red-500/50 text-red-300 font-bold' : 'border-slate-800 text-slate-300'}`}>
                          {step}
                        </span>
                        {sIdx < path.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-600" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Linked Risk Scenarios */}
          <Card title="Linked Risk Scenarios" subtitle="Scenarios impacting this asset">
            <div className="space-y-3 text-xs">
              {asset.riskScenarios.map((scen, sIdx) => (
                <div key={sIdx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-cyan-300 font-mono block">{scen.id} — {scen.threat}</span>
                    <span className="text-[11px] text-slate-400 font-mono">Likelihood: {scen.likelihood}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-extrabold text-emerald-400 block">{formatCurrency(scen.eal)}</span>
                    <span className="text-[10px] text-slate-500">P95: {formatCurrency(scen.p95)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
