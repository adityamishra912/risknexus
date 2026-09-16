'use client';

import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { ArrowRight, ShieldCheck, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRiskContext } from '../../providers/RiskProvider';

export default function InvestmentSummary() {
  const { initiativesList } = useRiskContext();

  const initiatives = initiativesList.length > 0 ? initiativesList.slice(0, 3) : [];

  return (
    <Card
      title="High-ROI Risk Reduction Opportunities"
      subtitle="Top candidate security controls sorted by Benefit-to-Cost Ratio (BCR)"
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
        {initiatives.map((item) => {
          const cid = item.control_id || item.id;
          const cName = item.control_name || item.name || cid;
          const costVal = item.cost ?? 0;
          const redVal = item.risk_reduction ?? item.reduction ?? 0;
          const bcrVal = item.benefit_cost_ratio ?? item.rosi ?? 0;
          const citation = item.source_citation || item.description || 'Reference Table';

          return (
            <div
              key={cid}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-3 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {cName}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    BCR {typeof bcrVal === 'number' ? bcrVal.toFixed(2) : bcrVal}x
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{citation}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Required Cost</span>
                  <span className="font-mono font-bold text-white text-xs">{formatCurrency(costVal)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Marginal Reduction</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">{formatCurrency(redVal)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span className="flex items-center gap-1 text-[10px] text-cyan-400">
                  <ShieldCheck className="w-3 h-3" />
                  {item.control_type || item.category || 'Security Control'}
                </span>
                <span className="text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer text-[10px]">
                  {cid} →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
