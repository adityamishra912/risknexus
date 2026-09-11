'use client';

import React from 'react';
import PageContainer from '../../../components/layout/PageContainer';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { CONTROLS_POSTURE } from '../../../lib/constants';
import { formatCurrency } from '../../../lib/utils/formatCurrency';
import { Sliders, ShieldCheck, Clock, DollarSign, Wrench, Play } from 'lucide-react';
import Link from 'next/link';

export default function ControlsPosturePage() {
  return (
    <PageContainer
      title="Security Control Posture"
      subtitle="Coverage, maturity, and financial risk mitigation capability across enterprise security controls"
      action={
        <Link href="/simulator">
          <Button variant="primary" size="sm" className="gap-1.5">
            <Play className="w-3.5 h-3.5" />
            <span>Simulate Control Coverage Increase</span>
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CONTROLS_POSTURE.map((control, idx) => (
            <Card
              key={idx}
              title={control.name}
              subtitle={`Status: ${control.status} • Maturity Rating: ${control.maturity}`}
              headerAction={
                <Badge
                  variant={
                    control.coverage >= 80 ? 'success' : control.coverage >= 60 ? 'info' : 'warning'
                  }
                >
                  {control.coverage}% Coverage
                </Badge>
              }
            >
              <div className="space-y-4 text-xs">
                {/* Coverage Bar */}
                <div>
                  <div className="flex justify-between text-slate-400 font-mono text-[11px] mb-1">
                    <span>Implementation Coverage</span>
                    <span className="text-cyan-400 font-bold">{control.coverage}% Monitored</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full"
                      style={{ width: `${control.coverage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Risk Reduction Potential</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {formatCurrency(control.potentialReduction)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Implementation Cost</span>
                    <span className="text-sm font-bold text-slate-200 font-mono">
                      {formatCurrency(control.cost)}
                    </span>
                  </div>
                </div>

                {/* Technical Meta Table */}
                <div className="space-y-2 pt-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Implementation Timeframe:</span>
                    <span className="text-white">{control.implementationTime}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Annual Maintenance Expense:</span>
                    <span className="text-white">{control.maintenanceCost}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Applicable Threat Vectors:</span>
                    <span className="text-cyan-300 truncate max-w-[200px]">{control.applicableThreats}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
