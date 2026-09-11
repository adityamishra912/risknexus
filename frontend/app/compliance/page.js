'use client';

import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { COMPLIANCE_FRAMEWORKS } from '../../lib/constants';
import { FileCheck, Download, Eye, FileText, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

export default function CompliancePage() {
  const [selectedFramework, setSelectedFramework] = useState(COMPLIANCE_FRAMEWORKS[0]);

  const mappings = [
    {
      req: 'NIST CSF PR.AA-01 (MFA Enforcement)',
      control: 'Multi-Factor Authentication (MFA)',
      status: 'Partial',
      evidence: 'Okta Authentication Logs (62% Coverage)',
      risk: '₹14L Exposure',
      owner: 'IAM Security Team',
    },
    {
      req: 'RBI Cyber Security Framework Sec 3.2 (API Tokenization)',
      control: 'Payment Gateway TLS & API Gateway',
      status: 'Implemented',
      evidence: 'AWS API Gateway Token Audit Log',
      risk: 'Mitigated',
      owner: 'Payments Eng',
    },
    {
      req: 'SEBI CSCRF Guideline 4.1 (Endpoint EDR Protection)',
      control: 'CrowdStrike Falcon EDR Sensor',
      status: 'Implemented',
      evidence: 'CrowdStrike Admin Fleet Status (1,250 Agents)',
      risk: 'Mitigated',
      owner: 'SOC Operations',
    },
    {
      req: 'ISO 27001 A.8.24 (Use of Cryptography)',
      control: 'PostgreSQL DB Encryption at Rest (AES-256)',
      status: 'Implemented',
      evidence: 'AWS KMS Key Policy & Volume Verification',
      risk: 'Mitigated',
      owner: 'DBA Team',
    },
    {
      req: 'CIS Control 11 (Data Recovery & Immutable Backups)',
      control: 'Air-Gapped Backup Vault',
      status: 'Gap',
      evidence: 'Missing WORM Immutable Lock Policy on Node 2',
      risk: '₹22L Exposure',
      owner: 'Infrastructure Team',
    },
  ];

  const reports = [
    { title: 'Executive Cyber Risk Report', type: 'C-Suite Summary', date: 'Sep 2026' },
    { title: 'Board Investment & ROSI Portfolio Report', type: 'Board of Directors', date: 'Q3 2026' },
    { title: 'CISO Technical Vulnerability & Path Report', type: 'Technical Operations', date: 'Sep 2026' },
    { title: 'RBI & SEBI Regulatory Compliance Audit Package', type: 'Regulatory Auditor', date: 'FY 2026' },
    { title: 'Model Risk Reduction & Simulation Ledger', type: 'Risk & Audit Committee', date: 'Sep 2026' },
  ];

  return (
    <PageContainer
      title="Compliance & Regulatory Framework Mapping"
      subtitle="Automated mapping of quantified risk controls to NIST CSF, ISO 27001, CIS, RBI, and SEBI frameworks"
      action={
        <Button variant="primary" size="sm" className="gap-1.5">
          <FileCheck className="w-3.5 h-3.5" />
          <span>Generate Auditor Evidence Package</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Framework Scorecards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {COMPLIANCE_FRAMEWORKS.map((fw) => {
            const isSelected = selectedFramework.id === fw.id;
            return (
              <div
                key={fw.id}
                onClick={() => setSelectedFramework(fw)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 scale-105 shadow-xl'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold text-slate-400">{fw.id}</span>
                  <span className="font-mono font-extrabold text-cyan-400 text-sm">{fw.coverage}%</span>
                </div>

                <h4 className="text-xs font-bold text-white line-clamp-1">{fw.name}</h4>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden my-2 border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full"
                    style={{ width: `${fw.coverage}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1">
                  <span className="text-emerald-400">{fw.implemented} Pass</span>
                  <span className="text-amber-400">{fw.partial} Partial</span>
                  <span className="text-red-400">{fw.gap} Gap</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Framework Control Breakdown Table */}
        <Card
          title={`Control Mapping: ${selectedFramework.name}`}
          subtitle="Detailed mapping of regulatory requirements to technical security controls and evidence artifacts"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-3 px-4">Regulatory Requirement</th>
                  <th className="py-3 px-4">Mapped Technical Control</th>
                  <th className="py-3 px-4">Implementation Status</th>
                  <th className="py-3 px-4">Audit Evidence</th>
                  <th className="py-3 px-4">Financial Risk Impact</th>
                  <th className="py-3 px-4 text-right">Control Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mappings.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{row.req}</td>
                    <td className="py-3.5 px-4 text-cyan-300 font-mono text-[11px]">{row.control}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={row.status === 'Implemented' ? 'success' : row.status === 'Partial' ? 'warning' : 'critical'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">{row.evidence}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{row.risk}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono">{row.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Risk & Investment Reports Section */}
        <Card title="Executive Risk & Board Reports Center" subtitle="Generate, preview, and export formal PDF risk governance documentation">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reports.map((rep, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">{rep.type}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{rep.date}</span>
                </div>
                <h4 className="text-xs font-bold text-white">{rep.title}</h4>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <Button variant="primary" size="sm" className="flex-1 text-[11px] py-1 gap-1">
                    <FileText className="w-3 h-3" />
                    <span>Generate</span>
                  </Button>
                  <Button variant="outline" size="sm" className="px-2 py-1 text-[11px] border-slate-700">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="px-2 py-1 text-[11px] border-slate-700">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
