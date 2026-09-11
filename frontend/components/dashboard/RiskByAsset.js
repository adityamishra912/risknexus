'use client';

import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function RiskByAsset() {
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

  return (
    <Card
      title="Risk by Asset"
      subtitle="Top 10 highest-risk assets sorted by financial EAL exposure"
      headerAction={
        <Link href="/assets">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-700 hover:border-cyan-500">
            <span>View all assets</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
          </Button>
        </Link>
      }
    >
      <div className="space-y-2.5">
        {topAssets.map((asset) => (
          <Link href={`/assets/${asset.id}`} key={asset.id} className="block group">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {asset.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    ({asset.type})
                  </span>
                  <Badge variant={asset.percent > 50 ? 'critical' : asset.percent > 30 ? 'warning' : 'info'}>
                    {asset.criticality}
                  </Badge>
                </div>
                <div className="font-mono font-extrabold text-amber-400 text-sm">
                  {asset.formattedEal}
                </div>
              </div>

              {/* Relative EAL Risk Bar */}
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
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
  );
}
