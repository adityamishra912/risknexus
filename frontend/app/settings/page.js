'use client';

import React from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { CONTINUOUS_ACTIVITY_TIMELINE } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { ShieldCheck, Lock, Server, Key, FileCode2, ArrowRight, Activity, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SecuritySettingsPage() {
  return (
    <PageContainer
      title="Platform Security, Trust Center & Activity Log"
      subtitle="Enterprise tenant data isolation, encryption architecture, and continuous risk event audit trail"
    >
      <div className="space-y-6">
        {/* SECTION 13: Continuous Risk Activity Timeline */}
        <Card
          title="Continuous Risk Quantification Activity Log"
          subtitle="Real-time audit log of security events triggering automated FAIR re-calculations"
        >
          <div className="space-y-3">
            {CONTINUOUS_ACTIVITY_TIMELINE.map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{act.event}</span>
                      <Badge variant={act.severity === 'critical' ? 'critical' : act.severity === 'warning' ? 'warning' : 'success'}>
                        {act.type}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{act.time}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono text-[11px]">
                    <span className="text-slate-400 block text-[10px]">Modeled EAL Delta:</span>
                    <span className={act.increase > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {act.increase > 0 ? `+${formatCurrency(act.increase)}` : formatCurrency(act.increase)}
                    </span>
                  </div>
                  <Link href="/optimizer">
                    <Button variant="outline" size="sm" className="text-[11px] py-1 border-slate-700">
                      {act.action}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SECTION 14: Platform Security & Data Protection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Principles */}
          <Card title="Platform Data Isolation & Encryption" subtitle="How RiskNexus protects IndoBank's sensitive cybersecurity data">
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-cyan-300 block flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Strict Multi-Tenant Isolation</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Customer data is logically and cryptographically isolated per tenant using unique AWS KMS data keys.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-emerald-300 block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>End-to-End Encryption</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  TLS 1.3 in transit with mTLS connector endpoints. AES-256 GCM encryption at rest for all risk model ledgers.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-amber-300 block flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  <span>Role-Based Access Control (RBAC) & Auditability</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  SAML 2.0 / Okta SSO integration with mandatory hardware MFA. 100% immutable audit log of all model modifications.
                </p>
              </div>
            </div>
          </Card>

          {/* Deployment Options */}
          <Card title="Deployment Architecture Options" subtitle="Choose the deployment model suited to your banking compliance policies">
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">SaaS (Multi-Tenant Cloud)</span>
                  <span className="text-[11px] text-slate-400">Fully managed, instant updates, SOC 2 Type II certified</span>
                </div>
                <Badge variant="info">Standard</Badge>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Private Cloud (Dedicated VPC)</span>
                  <span className="text-[11px] text-slate-400">Isolated AWS/Azure instance with customer-managed keys (BYOK)</span>
                </div>
                <Badge variant="success">Active (IndoBank)</Badge>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Customer-Controlled / On-Premise</span>
                  <span className="text-[11px] text-slate-400">Air-gapped Kubernetes container distribution for strict banking data sovereignty</span>
                </div>
                <Badge variant="neutral">Air-Gapped Ready</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Architecture Diagram Box */}
        <Card title="RiskNexus Enterprise Data Flow Architecture" subtitle="Zero raw payload ingestion — normalized risk telemetry only">
          <div className="p-4 rounded-xl bg-[#06090F] border border-slate-850 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center w-full md:w-auto">
              <Server className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <span className="font-bold text-white block">Customer Environment</span>
              <span className="text-[10px] text-slate-400">Scanners, EDR, SIEM</span>
            </div>

            <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 hidden md:block" />

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center w-full md:w-auto">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <span className="font-bold text-white block">Secure Connector</span>
              <span className="text-[10px] text-slate-400">Local Sanitization & Hash</span>
            </div>

            <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 hidden md:block" />

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center w-full md:w-auto">
              <FileCode2 className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <span className="font-bold text-white block">Normalization Engine</span>
              <span className="text-[10px] text-slate-400">CVSS + FAIR Schema</span>
            </div>

            <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 hidden md:block" />

            <div className="p-3 rounded-lg bg-cyan-950 border border-cyan-800 text-center w-full md:w-auto">
              <Activity className="w-5 h-5 text-cyan-300 mx-auto mb-1" />
              <span className="font-bold text-white block">FAIR Monte Carlo Risk Engine</span>
              <span className="text-[10px] text-cyan-400">Quantified Financial EAL</span>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
