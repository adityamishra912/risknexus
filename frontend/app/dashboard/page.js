'use client';

import React from 'react';
import PageContainer from '../../components/layout/PageContainer';
import RiskOverview from '../../components/dashboard/RiskOverview';
import RiskDistribution from '../../components/dashboard/RiskDistribution';
import RiskTrend from '../../components/dashboard/RiskTrend';
import RiskByAsset from '../../components/dashboard/RiskByAsset';
import TopScenariosByEAL from '../../components/dashboard/TopScenariosByEAL';
import RiskByBusinessUnit from '../../components/dashboard/RiskByBusinessUnit';
import InvestmentSummary from '../../components/dashboard/InvestmentSummary';
import Button from '../../components/ui/Button';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <PageContainer
      title="Enterprise Cyber Risk"
      subtitle="Financial exposure, risk drivers, and investment opportunities for IndoBank Financial Services"
      action={
        <div className="flex items-center gap-2">
          <Link href="/copilot">
            <Button variant="outline" size="sm" className="gap-1.5 border-cyan-500/40 text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ask Copilot Why</span>
            </Button>
          </Link>
          <Link href="/optimizer">
            <Button variant="primary" size="sm">
              Optimize Investment Portfolio
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Financial KPI Metrics */}
        <RiskOverview />

        {/* Middle Section: Risk Exposure Distribution & 30-Day Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskDistribution />
          <RiskTrend />
        </div>

        {/* SEPARATE VIEWS: Risk by Asset & Top 10 Scenarios by EAL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskByAsset />
          <TopScenariosByEAL />
        </div>

        {/* Lower Middle: Risk by Business Unit & Investment Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskByBusinessUnit />
          <InvestmentSummary />
        </div>
      </div>
    </PageContainer>
  );
}
