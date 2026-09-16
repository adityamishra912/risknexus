'use client';

import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import {
  GitFork,
  ShieldAlert,
  ArrowRight,
  Filter,
  X,
  Play,
  Server,
  Lock,
  Globe,
  Database,
  Key,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { ATTACK_NODES, ATTACK_EDGES } from '../../lib/constants';
import Link from 'next/link';
import { useRiskContext } from '../../providers/RiskProvider';

import Loading from '../../components/ui/Loading';
import ErrorState from '../../components/ui/ErrorState';

export default function AttackPathsPage() {
  const { setActiveAssetId } = useRiskContext();
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [graphAnalysis, setGraphAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGraph = () => {
    setLoading(true);
    setError(null);
    import('../../lib/api/attackPaths').then(({ getAttackPathsAnalysis }) => {
      getAttackPathsAnalysis()
        .then((res) => {
          if (res) {
            setGraphAnalysis(res);
            if (res.nodes && res.nodes.length > 0) {
              setSelectedNode(res.nodes[0]);
              setIsDrawerOpen(true);
            }
          }
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to fetch attack graph analysis from FastAPI backend.');
          setLoading(false);
        });
    });
  };

  React.useEffect(() => {
    fetchGraph();
  }, []);

  const getNodeIcon = (type) => {
    switch (type) {
      case 'entry': return Globe;
      case 'web': return Server;
      case 'api': return Layers;
      case 'iam': return Key;
      case 'database': return Database;
      case 'service': return Lock;
      default: return Server;
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setIsDrawerOpen(true);
    if (node.id === 'node-3') setActiveAssetId('PAY-API-01');
    if (node.id === 'node-5') setActiveAssetId('CUST-DB-02');
  };

  return (
    <PageContainer
      title="Attack Path Analysis"
      subtitle="Identify how attackers move from internet entry points to crown-jewel business services"
      action={
        <div className="flex items-center gap-2">
          <Link href="/simulator">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Path Mitigation</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0E131F]/90 border border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white">Graph Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Paths (5)' },
              { id: 'critical', label: 'Critical Assets (10/10)' },
              { id: 'exposed', label: 'Internet Exposed' },
              { id: 'exploited', label: 'Known Exploited CVEs' },
              { id: 'high_financial', label: 'High Financial Exposure (>₹30L)' },
              { id: 'unprotected', label: 'Unprotected Paths (No MFA)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === f.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Loading message="Fetching attack graph topology from backend..." />
        ) : error ? (
          <ErrorState title="Attack Paths API Error" message={error} onRetry={fetchGraph} />
        ) : (
        /* Interactive Graph Canvas Area */
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[520px]">
          {/* Main Visual Graph Node Chain */}
          <div className={`${isDrawerOpen ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all`}>
            <Card
              title="Attack Vector Graph Canvas"
              subtitle="Click any node to inspect blast radius, vulnerable edges, and financial impact"
            >
              <div className="p-6 rounded-xl bg-[#070A10] border border-slate-850 min-h-[440px] flex flex-col justify-center items-center overflow-x-auto relative">
                
                {/* Horizontal Attack Flow Nodes */}
                <div className="flex items-center gap-4 sm:gap-6 my-8 py-4">
                  {ATTACK_NODES.map((node, idx) => {
                    const NodeIcon = getNodeIcon(node.type);
                    const isSelected = selectedNode?.id === node.id;
                    const edgeToNext = ATTACK_EDGES[idx];

                    return (
                      <React.Fragment key={node.id}>
                        {/* Node Card */}
                        <div
                          onClick={() => handleNodeClick(node)}
                          className={`relative cursor-pointer p-4 rounded-xl border transition-all duration-200 w-44 shrink-0 ${
                            isSelected
                              ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/30 shadow-xl shadow-cyan-950/50 scale-105'
                              : node.isCrownJewel
                              ? 'bg-red-950/30 border-red-800/80 hover:border-red-500'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          {/* Crown Jewel / Target Badge */}
                          {node.isCrownJewel && (
                            <span className="absolute -top-2.5 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-600 text-white uppercase shadow-md">
                              Crown Jewel
                            </span>
                          )}
                          {node.isTarget && (
                            <span className="absolute -top-2.5 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-600 text-white uppercase shadow-md">
                              Primary Gateway
                            </span>
                          )}

                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                              <NodeIcon className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-mono font-semibold text-slate-400 block uppercase">
                              Crit {node.criticality}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">{node.label}</h4>

                          <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 text-[10px] font-mono">
                            <div className="flex justify-between text-slate-400">
                              <span>Vulnerabilities:</span>
                              <span className="text-red-400 font-bold">{node.vulns} CVEs</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Control:</span>
                              <span className="text-amber-300 truncate max-w-[80px]">{node.status}</span>
                            </div>
                            <div className="flex justify-between text-slate-300 font-semibold pt-0.5">
                              <span>Exposure:</span>
                              <span className="text-amber-400">{formatCurrency(node.exposure)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Edge Arrow Connector */}
                        {edgeToNext && (
                          <div className="flex flex-col items-center justify-center shrink-0 space-y-1">
                            <span className="text-[9px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-center max-w-[110px] truncate">
                              {edgeToNext.method}
                            </span>
                            <div className="flex items-center gap-1">
                              <div className="h-0.5 w-8 bg-gradient-to-r from-cyan-500 to-amber-500"></div>
                              <ArrowRight className="w-4 h-4 text-amber-400" />
                            </div>
                            <span className="text-[9px] font-mono text-red-400">{edgeToNext.risk} Risk</span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Graph Summary Caption */}
                <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Exploitation of CVE-2024-3094 on <strong className="text-white">Payment API</strong> permits lateral pivot to <strong className="text-white">Customer Database Cluster</strong> with ₹42L total financial risk exposure.
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Side Drawer / Inspector Panel */}
          {isDrawerOpen && selectedNode && (
            <div className="lg:col-span-4 transition-all">
              <Card
                title={`Asset Inspector: ${selectedNode.label}`}
                subtitle="Detailed blast radius & path security status"
                headerAction={
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                }
              >
                <div className="space-y-4 text-xs">
                  {/* Metric Pills */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Criticality Score</span>
                      <span className="text-base font-bold text-red-400 font-mono">{selectedNode.criticality}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Internet Exposed</span>
                      <span className="text-base font-bold text-amber-400 font-mono">
                        {selectedNode.id === 'node-1' || selectedNode.id === 'node-2' || selectedNode.id === 'node-3' ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {/* Vulnerabilities & Controls Breakdown */}
                  <div className="space-y-2">
                    <span className="text-slate-300 font-semibold block">Critical Vulnerabilities ({selectedNode.vulns})</span>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between text-red-400 font-bold">
                        <span>CVE-2024-3094 (CVSS 10.0)</span>
                        <span>Known Exploited</span>
                      </div>
                      <p className="text-slate-400 font-sans text-[10px]">
                        XZ Utils Backdoor enabling unauthenticated remote code execution.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-slate-300 font-semibold block">Security Controls Status</span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-300">Multi-Factor Authentication (MFA)</span>
                        <Badge variant="critical">Not Implemented</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-300">Web Application Firewall (WAF)</span>
                        <Badge variant="warning">Partial Rules</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-300">Endpoint Detection (EDR)</span>
                        <Badge variant="success">Active</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Financial Risk & Attack Paths Count */}
                  <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Financial Risk Exposure:</span>
                      <span className="text-base font-extrabold text-amber-400 font-mono">
                        {formatCurrency(selectedNode.exposure)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>Active Attack Paths Passing Through:</span>
                      <span className="font-mono font-bold text-white">3 Paths</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2">
                    <Link href="/simulator">
                      <Button variant="primary" size="md" className="w-full justify-center gap-1.5">
                        <Play className="w-4 h-4" />
                        <span>Simulate Mitigation</span>
                      </Button>
                    </Link>
                    <Link href={`/assets/${selectedNode.id === 'node-5' ? 'CUST-DB-02' : 'PAY-API-01'}`}>
                      <Button variant="outline" size="md" className="w-full justify-center">
                        View Asset Full Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
        )}
      </div>
    </PageContainer>
  );
}
