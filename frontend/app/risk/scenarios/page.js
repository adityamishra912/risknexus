'use client';

import React, { useState, useEffect } from 'react';
import PageContainer from '../../../components/layout/PageContainer';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import { getControlsPosture } from '../../../lib/api/risk';
import { formatCurrency } from '../../../lib/utils/formatCurrency';
import { ShieldCheck, Clock, DollarSign, Wrench, Play, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function ControlsPosturePage() {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPostureData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getControlsPosture();
      if (res && res.controls) {
        setControls(res.controls);
      } else {
        setControls([]);
      }
    } catch (err) {
      console.error('Failed to load controls posture data:', err);
      setError(err.message || 'Could not fetch live controls posture metrics from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostureData();
  }, []);

  return (
    <PageContainer
      title="Security Control Posture"
      subtitle="Coverage, maturity, and financial risk mitigation capability across enterprise security controls"
      action={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchPostureData} disabled={loading} title="Refresh Controls Posture">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/simulator">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Control Coverage Increase</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <ErrorState
            title="Failed to Load Security Controls"
            message={error}
            onRetry={fetchPostureData}
          />
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 animate-pulse space-y-4">
                <div className="h-5 bg-slate-800 rounded w-2/3"></div>
                <div className="h-3 bg-slate-800/80 rounded w-1/2"></div>
                <div className="h-2 bg-slate-800 rounded w-full"></div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="h-12 bg-slate-950 rounded"></div>
                  <div className="h-12 bg-slate-950 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {controls.map((control) => (
              <Card
                key={control.control_id}
                title={control.name}
                subtitle={`Status: ${control.status} • Maturity Rating: ${control.maturity}`}
                headerAction={
                  <div className="flex items-center gap-2">
                    {control.data_incomplete && (
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Incomplete Data
                      </Badge>
                    )}
                    <Badge
                      variant={
                        control.coverage >= 70 ? 'success' : control.coverage >= 40 ? 'info' : 'warning'
                      }
                    >
                      {control.coverage}% Coverage
                    </Badge>
                  </div>
                }
              >
                <div className="space-y-4 text-xs">
                  {/* Coverage Bar */}
                  <div>
                    <div className="flex justify-between text-slate-400 font-mono text-[11px] mb-1">
                      <span>Implementation Coverage</span>
                      <span className="text-cyan-400 font-bold">{control.monitored_pct}% Monitored</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${control.coverage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Risk Reduction Potential</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {control.potentialReduction > 0
                          ? formatCurrency(control.potentialReduction)
                          : '₹0 (Data Incomplete)'}
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
                      <span className="text-white">{formatCurrency(control.maintenanceCost)} / yr</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Applicable Threat Vectors:</span>
                      <span className="text-cyan-300 truncate max-w-[220px]" title={control.applicableThreats}>
                        {control.applicableThreats}
                      </span>
                    </div>
                    {control.data_incomplete && control.incomplete_reason && (
                      <div className="text-amber-400 text-[10px] pt-1">
                        Note: {control.incomplete_reason}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

