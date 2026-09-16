'use client';

import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Loading from '../ui/Loading';
import ErrorState from '../ui/ErrorState';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useRiskContext } from '../../providers/RiskProvider';

export default function RiskByAsset() {
  const { topRiskAssets, apiLoading, apiError, refreshData } = useRiskContext();

  if (apiLoading) return (
    <Card title="Risk by Asset" subtitle="Top 10 highest-risk assets sorted by financial EAL exposure">
      <Loading message="Loading assets from backend..." />
    </Card>
  );

  if (apiError) return (
    <Card title="Risk by Asset" subtitle="Top 10 highest-risk assets sorted by financial EAL exposure">
      <ErrorState title="Assets API Error" message={apiError} onRetry={refreshData} />
    </Card>
  );

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
      {topRiskAssets.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">No high-risk assets returned by backend.</div>
      ) : (
        <div className="space-y-2.5">
          {topRiskAssets.map((asset) => (
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
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
