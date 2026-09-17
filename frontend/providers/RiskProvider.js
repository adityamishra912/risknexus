'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getRiskScenarios, getTopRiskDrivers, getBusinessUnitRisk, getRiskTrend, getLossDistribution } from '../lib/api/risk';
import { getAssetsList, getTopRiskAssets } from '../lib/api/assets';
import { getVulnerabilities } from '../lib/api/vulnerabilities';
import { getAttackPathsAnalysis } from '../lib/api/attackPaths';
import { evaluatePortfolio, getInitiatives } from '../lib/api/optimization';
import { simulateControlToggles } from '../lib/api/whatIf';

const RiskContext = createContext();

export function RiskProvider({ children }) {
  const [budget, setBudget] = useState(10000000); // ₹1 Crore
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
  const [simulationData, setSimulationData] = useState(null);

  // Optimizer state
  const [selectedInitiativeIds, setSelectedInitiativeIds] = useState([
    'INIT-01',
    'INIT-02',
    'INIT-04',
  ]);
  const [initiativesList, setInitiativesList] = useState([]);
  const [optimizationEvaluation, setOptimizationEvaluation] = useState(null);

  // Backend datasets
  const [assetsList, setAssetsList] = useState([]);
  const [topRiskAssets, setTopRiskAssets] = useState([]);
  const [topRiskDrivers, setTopRiskDrivers] = useState([]);
  const [vulnerabilitiesList, setVulnerabilitiesList] = useState([]);
  const [attackGraphData, setAttackGraphData] = useState(null);
  // Backend-derived dashboard data (replaces frontend-computed fixed fractions / multipliers)
  const [businessUnitData, setBusinessUnitData] = useState(null);
  const [riskTrendData, setRiskTrendData] = useState(null);
  const [lossDistributionData, setLossDistributionData] = useState(null);

  // Active selection states
  const [activeAssetId, setActiveAssetId] = useState('PAY-API-01');
  const [activeVulnerabilityCve, setActiveVulnerabilityCve] = useState('CVE-2024-3094');
  const [activeAttackNodeId, setActiveAttackNodeId] = useState('node-3');
  const [isAttackDrawerOpen, setIsAttackDrawerOpen] = useState(false);

  const [apiSummary, setApiSummary] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  // Guard: only fetch once per session unless manually refreshed
  const hasFetched = useRef(false);

  const loadAllData = useCallback((force = false) => {
    // Skip if already loaded and not forced
    if (hasFetched.current && !force) return;

    hasFetched.current = true;
    setApiLoading(true);
    setApiError(null);

    Promise.allSettled([
      getRiskScenarios(),
      getAssetsList(),
      getVulnerabilities(),
      getAttackPathsAnalysis(),
      getInitiatives(),
      getTopRiskAssets(10),
      getTopRiskDrivers(10),
      getBusinessUnitRisk(),
      getRiskTrend(30),
      getLossDistribution(30),
    ])
      .then(([riskRes, assetsRes, vulnsRes, pathsRes, initsRes, topAssetsRes, topDriversRes, buRes, trendRes, distRes]) => {
        if (riskRes.status === 'fulfilled' && riskRes.value?.summary) {
          setApiSummary(riskRes.value.summary);
        }
        if (assetsRes.status === 'fulfilled' && assetsRes.value?.assets) {
          setAssetsList(assetsRes.value.assets);
        }
        if (vulnsRes.status === 'fulfilled' && vulnsRes.value?.vulnerabilities) {
          setVulnerabilitiesList(vulnsRes.value.vulnerabilities);
        }
        if (pathsRes.status === 'fulfilled' && pathsRes.value) {
          setAttackGraphData(pathsRes.value);
        }
        if (initsRes.status === 'fulfilled' && initsRes.value?.initiatives) {
          setInitiativesList(initsRes.value.initiatives);
        }
        if (topAssetsRes.status === 'fulfilled' && topAssetsRes.value?.top_assets) {
          const mapped = topAssetsRes.value.top_assets.map((a) => ({
            id: a.id || a.asset_id,
            name: a.name || a.asset_name,
            type: a.type || a.asset_type || 'Server',
            service: a.service_name || 'Enterprise Service',
            eal: a.total_eal,
            formattedEal:
              a.formatted_eal ||
              (a.total_eal >= 10000000
                ? `₹${(a.total_eal / 10000000).toFixed(2)}Cr`
                : `₹${Math.round(a.total_eal / 100000)}L`),
            percent: a.bar_percent || 50,
            criticality: `${a.criticality || 8}/10`,
          }));
          setTopRiskAssets(mapped);
        }
        if (topDriversRes.status === 'fulfilled' && topDriversRes.value?.top_drivers) {
          const mapped = topDriversRes.value.top_drivers.map((d) => ({
            rank: d.rank,
            id: d.scenario_id,
            threat: d.threat,
            asset: d.asset,
            assetId: d.asset_id,
            likelihood: d.likelihood_formatted,
            likelihoodVal: `${(d.likelihood * 100).toFixed(1)}%`,
            eal: d.eal_formatted,
            ealVal: d.eal,
            p95: d.p95_formatted,
            attackPath: d.attack_path,
            vulnerabilities: (d.contributing_vulnerabilities || []).map((cve) => ({
              cve,
              cvss: 8.5,
              severity: 'High',
              status: 'Active Vulnerability',
            })),
            existingControls: (d.existing_controls || []).map((ctrl) => ({
              name: ctrl,
              status: 'Active',
            })),
          }));
          setTopRiskDrivers(mapped);
        }
        // Backend-derived dashboard data
        if (buRes.status === 'fulfilled' && buRes.value?.business_units) {
          setBusinessUnitData(buRes.value);
        }
        if (trendRes.status === 'fulfilled' && trendRes.value) {
          setRiskTrendData(trendRes.value);
        }
        if (distRes.status === 'fulfilled' && distRes.value?.curve) {
          setLossDistributionData(distRes.value);
        }

        setLastFetchedAt(new Date());
        setApiLoading(false);
      })
      .catch((err) => {
        console.error('[RiskProvider API Error]:', err.message);
        setApiError(err.message || 'Failed to connect to backend server');
        setApiLoading(false);
      });
  }, []);

  // Fetch on first mount only
  useEffect(() => {
    loadAllData(false);
  }, [loadAllData]);

  // Manual refresh handler — exposed in context
  const refreshData = useCallback(() => {
    hasFetched.current = false;
    loadAllData(true);
  }, [loadAllData]);

  // Debounced evaluatePortfolio — waits 600ms after last change to avoid hammering the MC engine
  const evaluateDebounceRef = useRef(null);
  useEffect(() => {
    let isMounted = true;

    if (evaluateDebounceRef.current) {
      clearTimeout(evaluateDebounceRef.current);
    }

    evaluateDebounceRef.current = setTimeout(() => {
      evaluatePortfolio({
        selected_initiative_ids: selectedInitiativeIds,
        budget: budget,
        objective: optimizationObjective,
        include_curve: false, // fast path — curve only fetched via recommendPortfolio
      })
        .then((res) => {
          if (isMounted && res) {
            setOptimizationEvaluation(res);
          }
        })
        .catch((err) => {
          console.error('[Optimization Evaluate Error]:', err.message);
        });
    }, 600);

    return () => {
      isMounted = false;
      if (evaluateDebounceRef.current) {
        clearTimeout(evaluateDebounceRef.current);
      }
    };
  }, [selectedInitiativeIds, budget, optimizationObjective]);

  // Fetch Backend What-If Simulation whenever controls or sliders change (debounced 150ms)
  const simulationDebounceRef = useRef(null);
  useEffect(() => {
    let isMounted = true;
    if (simulationDebounceRef.current) {
      clearTimeout(simulationDebounceRef.current);
    }
    simulationDebounceRef.current = setTimeout(() => {
      simulateControlToggles({
        simulated_controls: simulatedControls,
        mfa_coverage: mfaCoverage,
        patch_delay_days: patchDelayDays,
      })
        .then((res) => {
          if (isMounted && res) {
            setSimulationData(res);
          }
        })
        .catch((err) => {
          console.error('[Control Simulation Error]:', err.message);
        });
    }, 150);

    return () => {
      isMounted = false;
      if (simulationDebounceRef.current) {
        clearTimeout(simulationDebounceRef.current);
      }
    };
  }, [simulatedControls, mfaCoverage, patchDelayDays]);

  const toggleInitiative = (id) => {
    setSelectedInitiativeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Purely select active records from backend arrays without client calculation
  const activeAsset =
    assetsList.find((a) => (a.id || a.asset_id) === activeAssetId) || assetsList[0] || null;
  const activeVulnerability =
    vulnerabilitiesList.find((v) => (v.cve || v.cve_id) === activeVulnerabilityCve) ||
    vulnerabilitiesList[0] ||
    null;
  const activeAttackNode =
    attackGraphData?.nodes?.find((n) => n.id === activeAttackNodeId) ||
    attackGraphData?.nodes?.[0] ||
    null;

  // Consume pre-calculated backend metrics directly
  const totalSelectedInvestment = optimizationEvaluation?.total_selected_investment ?? 0;
  const totalExpectedRiskReduction = optimizationEvaluation?.total_expected_risk_reduction ?? 0;
  const currentEAL = optimizationEvaluation?.current_eal ?? (apiSummary?.total_eal ?? 0);
  const residualEAL = optimizationEvaluation?.residual_eal ?? currentEAL;
  const currentP95 = optimizationEvaluation?.current_p95 ?? (apiSummary?.p95_loss ?? 0);
  const residualP95 = optimizationEvaluation?.residual_p95 ?? currentP95;
  const budgetRemaining = optimizationEvaluation?.budget_remaining ?? budget;
  const portfolioROSI = optimizationEvaluation?.portfolio_rosi ?? 0;

  return (
    <RiskContext.Provider
      value={{
        apiSummary,
        apiLoading,
        apiError,
        lastFetchedAt,
        refreshData,
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
        simulationData,
        selectedInitiativeIds,
        setSelectedInitiativeIds,
        initiativesList,
        optimizationEvaluation,
        assetsList,
        topRiskAssets,
        topRiskDrivers,
        vulnerabilitiesList,
        attackGraphData,
        businessUnitData,
        riskTrendData,
        lossDistributionData,
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
