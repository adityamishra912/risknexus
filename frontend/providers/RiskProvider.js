'use client';

import React, { createContext, useContext, useState } from 'react';
import {
  INITIAL_METRICS,
  RISK_REDUCTION_OPPORTUNITIES,
  ASSET_LIST,
  VULNERABILITY_LIST,
  ATTACK_NODES,
} from '../lib/constants';

const RiskContext = createContext();

export function RiskProvider({ children }) {
  const [budget, setBudget] = useState(INITIAL_METRICS.budget); // 1 Cr
  const [optimizationObjective, setOptimizationObjective] = useState('max_reduction');

  // Simulator state
  const [simulatedControls, setSimulatedControls] = useState({
    mfa: true,
    patching: true,
    edr: false,
    segmentation: false,
    backup: true,
  });
  const [mfaCoverage, setMfaCoverage] = useState(62);
  const [patchDelayDays, setPatchDelayDays] = useState(14);

  // Optimizer state: initiative IDs selected
  const [selectedInitiativeIds, setSelectedInitiativeIds] = useState([
    'INIT-01',
    'INIT-02',
    'INIT-04',
  ]);

  // Drawer / Detail states
  const [activeAssetId, setActiveAssetId] = useState('PAY-API-01');
  const [activeVulnerabilityCve, setActiveVulnerabilityCve] = useState('CVE-2024-3094');
  const [activeAttackNodeId, setActiveAttackNodeId] = useState('node-3');
  const [isAttackDrawerOpen, setIsAttackDrawerOpen] = useState(false);

  // Dynamic calculations
  const totalSelectedInvestment = RISK_REDUCTION_OPPORTUNITIES
    .filter(i => selectedInitiativeIds.includes(i.id))
    .reduce((sum, i) => sum + i.cost, 0);

  const totalExpectedRiskReduction = RISK_REDUCTION_OPPORTUNITIES
    .filter(i => selectedInitiativeIds.includes(i.id))
    .reduce((sum, i) => sum + i.reduction, 0);

  const currentEAL = INITIAL_METRICS.eal;
  const residualEAL = Math.max(2000000, currentEAL - totalExpectedRiskReduction);
  const currentP95 = INITIAL_METRICS.p95;
  const residualP95 = Math.max(12000000, currentP95 - (totalExpectedRiskReduction * 1.4));

  const budgetRemaining = Math.max(0, budget - totalSelectedInvestment);
  const portfolioROSI = totalSelectedInvestment > 0 ? (totalExpectedRiskReduction / totalSelectedInvestment).toFixed(2) : 0;

  const toggleInitiative = (id) => {
    setSelectedInitiativeIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const activeAsset = ASSET_LIST.find(a => a.id === activeAssetId) || ASSET_LIST[0];
  const activeVulnerability = VULNERABILITY_LIST.find(v => v.cve === activeVulnerabilityCve) || VULNERABILITY_LIST[0];
  const activeAttackNode = ATTACK_NODES.find(n => n.id === activeAttackNodeId) || ATTACK_NODES[2];

  return (
    <RiskContext.Provider
      value={{
        budget,
        setBudget,
        optimizationObjective,
        setOptimizationObjective,
        simulatedControls,
        setSimulatedControls,
        mfaCoverage,
        setMfaCoverage,
        patchDelayDays,
        setPatchDelayDays,
        selectedInitiativeIds,
        setSelectedInitiativeIds,
        toggleInitiative,
        totalSelectedInvestment,
        totalExpectedRiskReduction,
        currentEAL,
        residualEAL,
        currentP95,
        residualP95,
        budgetRemaining,
        portfolioROSI,
        activeAssetId,
        setActiveAssetId,
        activeAsset,
        activeVulnerabilityCve,
        setActiveVulnerabilityCve,
        activeVulnerability,
        activeAttackNodeId,
        setActiveAttackNodeId,
        activeAttackNode,
        isAttackDrawerOpen,
        setIsAttackDrawerOpen,
      }}
    >
      {children}
    </RiskContext.Provider>
  );
}

export function useRiskContext() {
  return useContext(RiskContext);
}

export default RiskProvider;
