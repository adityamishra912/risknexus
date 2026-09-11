'use client';

import React from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { X, ArrowRight, ExternalLink, ShieldAlert, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ScenarioDetailModal({ scenario, onClose }) {
  if (!scenario) return null;

  const scenarioId = scenario.id || scenario.scenario_id || 'RS001';
  const threatName = scenario.threat || scenario.scenario_name?.split(' on ')[0] || 'Ransomware';
  const assetName = scenario.asset || scenario.asset_name || 'Payment Database';
  const assetId = scenario.assetId || scenario.asset_id || 'PAY-API-01';
  const likelihood = scenario.likelihoodVal || scenario.likelihood || '19.23%';
  const eal = scenario.eal || scenario.formattedEal || '₹42L';
  const p95 = scenario.p95 || '₹1.28Cr';

  const attackPath = scenario.attackPath || ['Internet', 'Web Server', assetName];
  const vulnerabilities = scenario.vulnerabilities || [
    { cve: 'CVE-2025-10001', cvss: 9.9, severity: 'Critical', status: 'Known Exploited (CISA KEV)' },
    { cve: 'CVE-2024-20012', cvss: 8.4, severity: 'High', status: 'Unpatched' },
  ];
  const existingControls = scenario.existingControls || [
    { name: 'EDR', status: 'Active (Fully Implemented)' },
    { name: 'Backup', status: 'Active (Immutable WORM Vault)' },
    { name: 'MFA', status: 'Disabled (Partial Coverage Risk)' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40">
                {scenarioId}
              </span>
              <h3 className="text-base font-bold text-white">
                {threatName} → {assetName}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Detailed scenario driver breakdown & attack path reachability</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Key Financial Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Likelihood</span>
              <div className="text-lg font-extrabold text-amber-400 font-mono mt-0.5">
                {likelihood}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Point Estimate EAL</span>
              <div className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5">
                {eal}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">P95 Financial Loss</span>
              <div className="text-lg font-extrabold text-red-400 font-mono mt-0.5">
                {p95}
              </div>
            </div>
          </div>

          {/* Attack Path */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300 block">Attack Path:</span>
            <div className="flex flex-col gap-2 pt-1">
              {attackPath.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between font-mono text-xs text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 text-[10px] font-bold flex items-center justify-center border border-slate-700">
                        {idx + 1}
                      </span>
                      <span>{typeof step === 'string' ? step : step.name || step.label}</span>
                    </div>
                    {idx === 0 ? (
                      <Badge variant="warning">Ingress Point</Badge>
                    ) : idx === attackPath.length - 1 ? (
                      <Badge variant="critical">Target Asset</Badge>
                    ) : (
                      <Badge variant="info font-mono">Pivot Hop</Badge>
                    )}
                  </div>
                  {idx < attackPath.length - 1 && (
                    <div className="flex justify-center -my-1">
                      <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Contributing Vulnerabilities */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 block">Contributing vulnerabilities:</span>
            <div className="space-y-2">
              {vulnerabilities.map((v, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-red-400 block">{v.cve}</span>
                    <span className="text-[11px] text-slate-400 block">{v.status}</span>
                  </div>
                  <Badge variant={v.cvss >= 9.0 ? 'critical' : 'warning'}>CVSS {v.cvss}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Controls */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 block">Existing controls:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {existingControls.map((c, i) => {
                const cName = typeof c === 'string' ? c : c.name;
                const cStatus = typeof c === 'string' ? 'Active' : c.status;
                const isBad = cStatus.toLowerCase().includes('disabled') || cStatus.toLowerCase().includes('not');
                return (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{cName}</span>
                    <Badge variant={isBad ? 'critical' : 'success'}>
                      {isBad ? 'Disabled' : 'Active'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <Link href={`/assets/${assetId}`} onClick={onClose}>
            <Button variant="outline" size="sm" className="gap-1.5 border-slate-700">
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Asset Detail Page</span>
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={onClose}>
            <span>Close</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
