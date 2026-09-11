'use client';

import React from 'react';
import Card from '../ui/Card';
import { TOP_RISK_DRIVERS } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { ChevronRight, AlertTriangle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useRiskContext } from '../../providers/RiskProvider';

export default function TopRiskDrivers() {
  const { setActiveAssetId } = useRiskContext();

  return (
    <Card
      title="Top Financial Risk Contributors"
      subtitle="Highest EAL impact drivers across assets & threat vectors"
      headerAction={
        <Link href="/risk" className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium">
          <span>View All Drivers</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      <div className="space-y-2.5">
        {TOP_RISK_DRIVERS.map((item, index) => {
          const maxAmount = TOP_RISK_DRIVERS[0].amount;
          const percentWidth = (item.amount / maxAmount) * 100;

          return (
            <Link
              key={item.id}
              href={`/assets/${item.assetId}`}
              onClick={() => setActiveAssetId(item.assetId)}
              className="group block p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-850 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px] font-bold flex items-center justify-center border border-slate-700">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                      {item.name}
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {item.type}
                      </span>
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-amber-400 font-mono">
                    {formatCurrency(item.amount)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Progress bar background */}
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentWidth}%` }}
                ></div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
