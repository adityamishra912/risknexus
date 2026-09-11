'use client';

import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { ASSET_LIST } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { Server, Search, Filter, ArrowUpRight, ShieldAlert, Globe, Layers, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRiskContext } from '../../providers/RiskProvider';

export default function AssetInventoryPage() {
  const { setActiveAssetId } = useRiskContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredAssets = ASSET_LIST.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.businessService.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'critical') return matchesSearch && asset.criticalityVal >= 9;
    if (filterType === 'exposed') return matchesSearch && asset.internetExposed;
    return matchesSearch;
  });

  return (
    <PageContainer
      title="Enterprise Asset Inventory"
      subtitle="Criticality scoring, financial exposure, and attack path reachability for 150 monitored business assets"
    >
      <div className="space-y-6">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Assets Monitored</span>
              <div className="text-2xl font-extrabold text-white font-mono mt-1">150</div>
              <span className="text-[10px] text-slate-500 font-mono">100% CMDB Synced</span>
            </div>
            <Server className="w-8 h-8 text-cyan-400 opacity-80" />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Critical Crown Jewels</span>
              <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">42</div>
              <span className="text-[10px] text-slate-500 font-mono">Tier 1 Financial Impact</span>
            </div>
            <ShieldAlert className="w-8 h-8 text-red-400 opacity-80" />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Internet Exposed Assets</span>
              <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">38</div>
              <span className="text-[10px] text-slate-500 font-mono">Public Perimeter Nodes</span>
            </div>
            <Globe className="w-8 h-8 text-amber-400 opacity-80" />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">High Financial Risk Assets</span>
              <div className="text-2xl font-extrabold text-orange-400 font-mono mt-1">27</div>
              <span className="text-[10px] text-slate-500 font-mono">Exposure &gt; ₹15L</span>
            </div>
            <Layers className="w-8 h-8 text-orange-400 opacity-80" />
          </div>
        </div>

        {/* Filter and Search Bar */}
        <Card>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by asset name, ID, or business service..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  filterType === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                All Assets ({ASSET_LIST.length})
              </button>
              <button
                onClick={() => setFilterType('critical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  filterType === 'critical' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                Critical Crown Jewels
              </button>
              <button
                onClick={() => setFilterType('exposed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  filterType === 'exposed' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                Internet Exposed
              </button>
            </div>
          </div>
        </Card>

        {/* Asset Table */}
        <Card title="Monitored Asset Registry" subtitle="Click any asset row to view complete security & dependency breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-3 px-4">Asset ID / Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Business Service</th>
                  <th className="py-3 px-4">Criticality</th>
                  <th className="py-3 px-4">Internet Exposure</th>
                  <th className="py-3 px-4">Vulnerabilities</th>
                  <th className="py-3 px-4">Control Status</th>
                  <th className="py-3 px-4">Financial Exposure</th>
                  <th className="py-3 px-4">Risk Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => setActiveAssetId(asset.id)}
                    className="hover:bg-slate-900/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <Link href={`/assets/${asset.id}`} className="block">
                        <span className="font-bold text-white group-hover:text-cyan-300 transition-colors block">{asset.name}</span>
                        <span className="text-[10px] font-mono text-cyan-400 block">{asset.id} • {asset.ip}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{asset.type}</td>
                    <td className="py-3 px-4 text-slate-300">{asset.businessService}</td>
                    <td className="py-3 px-4 font-mono font-bold text-red-400">{asset.criticality}</td>
                    <td className="py-3 px-4">
                      {asset.internetExposed ? (
                        <Badge variant="warning">YES (Exposed)</Badge>
                      ) : (
                        <Badge variant="neutral">NO (Internal)</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {asset.vulnerabilitiesCount} Open CVEs
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-[140px]">{asset.controls}</td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{formatCurrency(asset.exposure)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={asset.riskStatus === 'Critical' ? 'critical' : asset.riskStatus === 'High' ? 'warning' : 'info'}>
                        {asset.riskStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/assets/${asset.id}`} className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}