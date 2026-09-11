'use client';

import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { RISK_REDUCTION_OPPORTUNITIES } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { ArrowRight, ShieldCheck, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function InvestmentSummary() {
  return (
    <Card
      title="High-ROI Risk Reduction Opportunities"
      subtitle="Top modeled security initiatives sorted by Return on Security Investment (ROSI)"
      headerAction={
        <Link href="/optimizer">
          <Button variant="primary" size="sm" className="gap-1.5">
            <span>View Investment Optimizer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {RISK_REDUCTION_OPPORTUNITIES.slice(0, 3).map((item) => {
          return (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-3 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {item.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    ROSI {item.rosi}x
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Required Investment</span>
                  <span className="font-mono font-bold text-white text-xs">{formatCurrency(item.cost)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Expected Risk Reduction</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">{formatCurrency(item.reduction)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {item.time}
                </span>
                <span className="text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer">
                  Model Details →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
