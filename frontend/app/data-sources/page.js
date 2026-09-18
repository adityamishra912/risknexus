'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { DATA_SOURCES } from '../../lib/constants';
import {
  Database,
  Upload,
  RefreshCw,
  CheckCircle2,
  FileUp,
  Plug,
  Plus,
  ShieldAlert,
  AlertTriangle,
  Server,
  Cloud,
  Check,
  Eye,
  ArrowRight,
  Sliders,
  Key,
  Globe,
  HelpCircle,
  Activity,
  Layers,
  FileCheck,
  DollarSign,
  History,
  Building,
  Radio,
  FileText,
} from 'lucide-react';
import {
  DATA_SOURCE_MODES,
  DATA_SOURCE_MODE_OPTIONS,
  getActiveDataSourceMode,
  getDataSourceModeLabel,
  readCachedDataSource,
  setActiveDataSourceMode,
  writeCachedDataSource,
} from '../../lib/data-source-modes';
import apiClient from '../../lib/api/client';

export default function DataSourcesPage() {
  const [connectors, setConnectors] = useState(DATA_SOURCES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [selectedDataSourceMode, setSelectedDataSourceMode] = useState(DATA_SOURCE_MODES.SAMPLE);
  const [sourceRunStatus, setSourceRunStatus] = useState('Ready');
  const [sourceLastRunAt, setSourceLastRunAt] = useState(null);
  const [isRunningSource, setIsRunningSource] = useState(false);

  useEffect(() => {
    const savedMode = getActiveDataSourceMode();
    setSelectedDataSourceMode(savedMode);
  }, []);

  const sourceModeSummary = useMemo(() => {
    const selected = DATA_SOURCE_MODE_OPTIONS.find((option) => option.value === selectedDataSourceMode);
    return selected || DATA_SOURCE_MODE_OPTIONS[0];
  }, [selectedDataSourceMode]);

  const handleSourceModeChange = (nextMode) => {
    setSelectedDataSourceMode(nextMode);
    setActiveDataSourceMode(nextMode);
    const cachedData = readCachedDataSource(nextMode);
    if (cachedData) {
      setSourceRunStatus('Loaded from saved source');
      setSourceLastRunAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return;
    }
    setSourceRunStatus('Mode selected');
    setSourceLastRunAt(null);
  };

  const handleRunSelectedSource = async () => {
    setIsRunningSource(true);
    setSourceRunStatus('Loading source');

    try {
      await apiClient.post('/data-sources/run', { mode: selectedDataSourceMode });
    } catch (error) {
      setSourceRunStatus(error.message || 'Source load failed');
      setIsRunningSource(false);
      return;
    }

    const payload = {
      mode: selectedDataSourceMode,
      selectedAt: new Date().toISOString(),
      sourceLabel: getDataSourceModeLabel(selectedDataSourceMode),
      readiness: readinessPercent,
      uploadedRequiredCount,
      requiredSources: 5,
    };

    writeCachedDataSource(selectedDataSourceMode, payload);
    setSourceRunStatus(
      selectedDataSourceMode === DATA_SOURCE_MODES.SAMPLE
        ? 'Sample data refreshed'
        : 'Supabase source loaded successfully'
    );
    setSourceLastRunAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setIsRunningSource(false);
  };

  // New connector form state
  const [newConnectorName, setNewConnectorName] = useState('');
  const [newConnectorType, setNewConnectorType] = useState('Cloud CSPM');
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newSyncFreq, setNewSyncFreq] = useState('Realtime (Webhooks)');

  // Uploaded states per section (sections 1-8)
  const [uploadsState, setUploadsState] = useState({
    sec1: { uploaded: true, filename: 'cmdb_enterprise_assets_q3.csv', records: '150 assets' },
    sec2: { uploaded: true, filename: 'qualys_vulnerability_scan_q3.csv', records: '1,420 CVE findings' },
    sec3: { uploaded: true, filename: 'network_topology_graph.json', records: '480 asset edges' },
    sec4: { uploaded: false, filename: null, records: null },
    sec5: { uploaded: false, filename: null, records: null },
    sec6: { uploaded: false, filename: null, records: null },
    sec7: { uploaded: false, filename: null, records: null },
    sec8: { uploaded: false, filename: null, records: null },
  });

  // Business Impact Preset Tier state for Section 6
  const [assetPresetTiers, setAssetPresetTiers] = useState({
    'PAY-API-01': 'Critical',
    'CUST-DB-02': 'Critical',
    'AUTH-ID-01': 'High',
    'WEB-FE-03': 'High',
    'AWS-CLOUD-01': 'High',
    'HR-PORTAL-01': 'Medium',
  });

  // Compliance Selected Frameworks for Section 7
  const [selectedRegFrameworks, setSelectedRegFrameworks] = useState(['RBI', 'SEBI', 'PCI-DSS']);

  // Dynamic Schema Mapping Modal / Flow state
  const [activeUploadSection, setActiveUploadSection] = useState(null); // e.g. 'sec4'
  const [stagedFile, setStagedFile] = useState(null);
  const [isCommitting, setIsCommitting] = useState(false);

  // Calculate readiness score (Sections 1 to 5 are Required)
  const requiredKeys = ['sec1', 'sec2', 'sec3', 'sec4', 'sec5'];
  const uploadedRequiredCount = requiredKeys.filter((k) => uploadsState[k].uploaded).length;
  const readinessPercent = (uploadedRequiredCount / 5) * 100;

  // Catalog categories for Add Connector modal
  const catalogIntegrations = [
    { name: 'Wiz Cloud Security', type: 'Cloud CSPM', icon: Cloud, desc: 'Agentless cloud security & risk posture' },
    { name: 'AWS Security Hub', type: 'Cloud CSPM', icon: Cloud, desc: 'Centralized AWS security findings' },
    { name: 'Prisma Cloud (Palo Alto)', type: 'Cloud CSPM', icon: Cloud, desc: 'Multi-cloud posture & compliance' },
    { name: 'SentinelOne Singularity', type: 'EDR & Endpoint', icon: Server, desc: 'Autonomous endpoint protection' },
    { name: 'Microsoft Defender XDR', type: 'EDR & Endpoint', icon: Server, desc: 'Enterprise endpoint & identity telemetry' },
    { name: 'Rapid7 InsightVM', type: 'Vulnerability Management', icon: ShieldAlert, desc: 'Real-time live vulnerability scanning' },
    { name: 'Datadog Security Monitoring', type: 'SIEM & Analytics', icon: Database, desc: 'Cloud-native log SIEM & security signals' },
    { name: 'Axonius Cyber Asset Management', type: 'CMDB & Inventory', icon: Plug, desc: 'Comprehensive asset inventory discovery' },
  ];

  // Section definitions for Groups 1 & 2
  const requiredSections = [
    {
      id: 'sec1',
      title: '1. Asset Inventory',
      badge: 'REQUIRED',
      variant: 'success',
      desc: 'Upload your CMDB or asset register to build the attack graph',
      expectedFields: ['asset name', 'type', 'owner', 'business unit', 'criticality tier', 'internet-facing flag'],
      providedBy: 'IT / Infrastructure Team',
      icon: Server,
    },
    {
      id: 'sec2',
      title: '2. Vulnerability Scan Export',
      badge: 'REQUIRED',
      variant: 'success',
      desc: 'Import your latest Qualys/Nessus/Tenable scan results',
      expectedFields: ['CVE ID', 'CVSS score', 'affected asset', 'first-detected date', 'patch status'],
      providedBy: 'Security / Vuln Management Team',
      icon: ShieldAlert,
    },
    {
      id: 'sec3',
      title: '3. Network Topology / CMDB Relationships',
      badge: 'REQUIRED',
      variant: 'success',
      desc: 'Map how your assets connect to construct attack paths',
      expectedFields: ['source asset', 'destination asset', 'connection type', 'exposure'],
      providedBy: 'Network & Cloud Team',
      icon: Layers,
    },
    {
      id: 'sec4',
      title: '4. Identity & Access (IAM) Export',
      badge: 'REQUIRED',
      variant: 'success',
      desc: 'Import MFA status and privilege levels per account',
      expectedFields: ['user/service account', 'associated asset', 'MFA status', 'privilege level'],
      providedBy: 'IAM / Identity Team',
      icon: Key,
    },
    {
      id: 'sec5',
      title: '5. Security Controls Inventory',
      badge: 'REQUIRED',
      variant: 'success',
      desc: 'List currently deployed controls (EDR, WAF, MFA, patching)',
      expectedFields: ['control name', 'coverage %', 'assets covered', 'deployment status'],
      providedBy: 'Security Operations (SecOps)',
      icon: Sliders,
    },
  ];

  const optionalSections = [
    {
      id: 'sec6',
      title: '6. Business Impact / Asset Valuation',
      badge: 'OPTIONAL, IMPROVES ACCURACY',
      variant: 'warning',
      desc: 'Estimate financial value or revenue dependency per asset',
      expectedFields: ['asset name', 'estimated value/revenue dependency', 'data classification', 'downtime cost/hour'],
      providedBy: 'Finance + Business Unit Owners',
      icon: DollarSign,
    },
    {
      id: 'sec7',
      title: '7. Compliance / Regulatory Scope',
      badge: 'OPTIONAL, IMPROVES ACCURACY',
      variant: 'warning',
      desc: 'Flag which regulatory frameworks apply to which assets',
      expectedFields: ['applicable frameworks (RBI, PCI-DSS, GDPR, SEBI, other)', 'regulated asset flags'],
      providedBy: 'Compliance / Legal Team',
      icon: FileCheck,
    },
    {
      id: 'sec8',
      title: '8. Historical Incident Log',
      badge: 'OPTIONAL',
      variant: 'warning',
      desc: 'Improve ML model calibration with past incident outcomes',
      expectedFields: ['incident date', 'affected asset', 'root cause', 'financial loss if known'],
      providedBy: 'Security / Incident Response Team',
      icon: History,
    },
  ];

  // Preset financial range mapping for Section 6
  const presetFinancialRanges = {
    Critical: '₹1.00 Cr - ₹5.00 Cr / hr downtime',
    High: '₹50L - ₹1.00 Cr / hr downtime',
    Medium: '₹10L - ₹50L / hr downtime',
    Low: '< ₹10L / hr downtime',
  };

  const handleStartSectionUpload = (secId, file) => {
    setActiveUploadSection(secId);
    setStagedFile(file || { name: `${secId}_export_data.csv` });
  };

  const handleCommitSectionUpload = () => {
    setIsCommitting(true);
    setTimeout(() => {
      setIsCommitting(false);
      if (activeUploadSection) {
        setUploadsState((prev) => ({
          ...prev,
          [activeUploadSection]: {
            uploaded: true,
            filename: stagedFile?.name || `${activeUploadSection}_data.csv`,
            records: '1,240 records imported',
          },
        }));
      }
      setActiveUploadSection(null);
      setStagedFile(null);
    }, 1000);
  };

  const handleCreateConnector = (e) => {
    e.preventDefault();
    const newEntry = {
      id: `DS-${String(connectors.length + 1).padStart(2, '0')}`,
      name: newConnectorName || selectedCatalogItem?.name || 'Live SIEM / EDR Stream',
      type: newConnectorType,
      status: 'Connected',
      lastSync: 'Just now',
      records: '45,000 / sec',
      freshness: '100% Live Realtime',
    };
    setConnectors([...connectors, newEntry]);
    setIsAddModalOpen(false);
    setSelectedCatalogItem(null);
    setNewConnectorName('');
    setNewEndpointUrl('');
    setNewApiKey('');
  };

  return (
    <PageContainer
      title="Security Data Sources & Onboarding Hub"
      subtitle="Ingest telemetry, asset registers, scan exports, and live API feeds to power continuous FAIR risk quantification"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5 shadow-lg shadow-cyan-950"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Connector</span>
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5 border-slate-700">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Force Sync All ({connectors.length})</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <Card
          title="Data Source Mode"
          subtitle="Use the current sample workflow or switch to a Supabase-backed source without removing the built-in default."
          headerAction={
            <Badge variant="info" className="text-[11px] font-mono">
              {getDataSourceModeLabel(selectedDataSourceMode)}
            </Badge>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {DATA_SOURCE_MODE_OPTIONS.map((option) => {
                const isSelected = selectedDataSourceMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSourceModeChange(option.value)}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/40 shadow-lg shadow-cyan-950/20'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-white">{option.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{option.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current mode</p>
                <p className="text-sm font-semibold text-white">{sourceModeSummary.label}</p>
                <p className="text-[11px] text-slate-400">{sourceModeSummary.description}</p>
              </div>

              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="text-[10px] font-mono uppercase text-cyan-300">Status</span>
                <span className="text-xs text-slate-200">{sourceRunStatus}</span>
                {sourceLastRunAt && <span className="text-[10px] text-slate-500 font-mono">Last run: {sourceLastRunAt}</span>}
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleRunSelectedSource}
                disabled={isRunningSource}
                className="gap-1.5 shadow-lg shadow-cyan-950"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningSource ? 'animate-spin' : ''}`} />
                <span>{isRunningSource ? 'Loading Source...' : 'Run Selected Source'}</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* TOP PROGRESS INDICATOR: Risk Quantification Readiness */}
        <Card>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Risk Quantification Readiness Status
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete required data sources to establish high-confidence FAIR baseline modeling
                </p>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className="text-xs text-slate-300 font-semibold">
                  {uploadedRequiredCount} of 5 required sources uploaded
                </span>
                <Badge variant={uploadedRequiredCount === 5 ? 'success' : 'warning'} className="text-xs px-2.5 py-1 font-bold">
                  {readinessPercent}% Ready
                </Badge>
              </div>
            </div>

            {/* Horizontal Readiness Progress Bar */}
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 flex">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${readinessPercent}%` }}
              ></div>
            </div>
          </div>
        </Card>

        {/* Telemetry & Asset Monitoring Coverage Banner */}
        <Card
          title="Enterprise Asset Telemetry Coverage & Blindspot Signal"
          subtitle="Continuous monitoring health across total asset registry"
          headerAction={<Badge variant="warning font-mono">22 Unmonitored Assets (6.1% Blindspot)</Badge>}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Monitored Assets</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">340 Assets (93.9%)</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>

              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Unmonitored Blindspots</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">22 Assets (6.1%)</span>
                </div>
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              </div>

              <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Model Uncertainty Penalty</span>
                  <span className="text-sm font-bold text-red-400 font-mono">+₹12.5L Added to EAL</span>
                </div>
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
              </div>
            </div>
          </div>
        </Card>

        {/* GROUP 1: REQUIRED FOR RISK QUANTIFICATION (SECTIONS 1 to 5) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pt-2 pb-1 border-b border-slate-800">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Required for Risk Quantification
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              (Core foundational datasets for FAIR loss modeling & attack graph construction)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {requiredSections.map((sec) => {
              const secState = uploadsState[sec.id];
              const Icon = sec.icon;

              return (
                <Card
                  key={sec.id}
                  title={sec.title}
                  subtitle={sec.desc}
                  headerAction={
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border border-emerald-800/80 text-emerald-400 bg-emerald-950/40">
                      {sec.badge}
                    </span>
                  }
                >
                  <div className="space-y-3.5 text-xs">
                    {/* Expected Fields Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold font-mono">Expected Fields:</span>
                      {sec.expectedFields.map((field, fIdx) => (
                        <span
                          key={fIdx}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono"
                        >
                          {field}
                        </span>
                      ))}
                    </div>

                    {/* Upload Zone */}
                    {!secState.uploaded ? (
                      <div
                        onClick={() => handleStartSectionUpload(sec.id)}
                        className="p-5 rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-900/50 cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                          <FileUp className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                            Click or drag file to upload {sec.title.split('. ')[1]}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Supports .csv, .json, or .xml up to 50MB</p>
                        </div>
                      </div>
                    ) : (
                      /* Inline Success Banner */
                      <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between gap-3 text-emerald-300 font-mono">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold text-white block text-xs">
                              Successfully imported dataset from "{secState.filename}"
                            </span>
                            <span className="text-[11px] text-emerald-400 block">{secState.records} • Verified and mapped to FAIR engine</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartSectionUpload(sec.id)}
                          className="border-emerald-800/60 text-emerald-300 hover:bg-emerald-950 text-[11px] py-1 shrink-0"
                        >
                          Re-upload / Replace
                        </Button>
                      </div>
                    )}

                    {/* Muted Team Sub-label */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                      <span className="italic">Provided by: {sec.providedBy}</span>
                      <span>Format: UTF-8 Encoded Standard CSV / JSON</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* GROUP 2: OPTIONAL — IMPROVES ACCURACY (SECTIONS 6 to 8) */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Optional — Improves Accuracy
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              (Refines Monte Carlo financial loss ranges & regulatory compliance mapping)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {optionalSections.map((sec) => {
              const secState = uploadsState[sec.id];

              return (
                <Card
                  key={sec.id}
                  title={sec.title}
                  subtitle={sec.desc}
                  headerAction={
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border border-amber-800/80 text-amber-400 bg-amber-950/40">
                      {sec.badge}
                    </span>
                  }
                >
                  <div className="space-y-3.5 text-xs">
                    {/* Expected Fields */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold font-mono">Expected Fields:</span>
                      {sec.expectedFields.map((field, fIdx) => (
                        <span
                          key={fIdx}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono"
                        >
                          {field}
                        </span>
                      ))}
                    </div>

                    {/* SECTION 6 SPECIAL FALLBACK PRESET TIER SELECTOR */}
                    {sec.id === 'sec6' && (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-cyan-400" />
                            <span>Fallback Asset Financial Value Preset Tiers</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Use presets if exact financial figures are unavailable
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {Object.entries(assetPresetTiers).map(([assetId, currentTier]) => (
                            <div
                              key={assetId}
                              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                            >
                              <span className="font-mono font-bold text-white text-[11px]">{assetId}</span>
                              <select
                                value={currentTier}
                                onChange={(e) =>
                                  setAssetPresetTiers((prev) => ({ ...prev, [assetId]: e.target.value }))
                                }
                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-cyan-300 font-mono font-bold focus:outline-none"
                              >
                                <option value="Critical">Critical (₹1Cr - ₹5Cr/hr)</option>
                                <option value="High">High (₹50L - ₹1Cr/hr)</option>
                                <option value="Medium">Medium (₹10L - ₹50L/hr)</option>
                                <option value="Low">Low (&lt; ₹10L/hr)</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION 7 SPECIAL COMPLIANCE FRAMEWORK SELECTOR */}
                    {sec.id === 'sec7' && (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="font-semibold text-slate-200 block text-[11px]">
                          Select Applicable Regulatory Frameworks:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {['RBI Cyber Security Framework', 'SEBI CSCRF', 'PCI-DSS v4.0', 'GDPR / DPDP', 'ISO 27001', 'NIST CSF v2.0'].map(
                            (fwName, idx) => (
                              <label
                                key={idx}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 cursor-pointer hover:border-cyan-500/40"
                              >
                                <input type="checkbox" defaultChecked={idx < 3} className="accent-cyan-500 rounded" />
                                <span>{fwName}</span>
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Upload Zone */}
                    {!secState.uploaded ? (
                      <div
                        onClick={() => handleStartSectionUpload(sec.id)}
                        className="p-5 rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-900/50 cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                          <FileUp className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                            Click or drag file to upload {sec.title.split('. ')[1]}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Supports .csv, .json, or .xml up to 50MB</p>
                        </div>
                      </div>
                    ) : (
                      /* Inline Success Banner */
                      <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between gap-3 text-emerald-300 font-mono">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold text-white block text-xs">
                              Successfully imported dataset from "{secState.filename}"
                            </span>
                            <span className="text-[11px] text-emerald-400 block">{secState.records} • Model accuracy calibrated</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartSectionUpload(sec.id)}
                          className="border-emerald-800/60 text-emerald-300 hover:bg-emerald-950 text-[11px] py-1 shrink-0"
                        >
                          Re-upload / Replace
                        </Button>
                      </div>
                    )}

                    {/* Muted Team Sub-label */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                      <span className="italic">Provided by: {sec.providedBy}</span>
                      <span>Format: UTF-8 Encoded Standard CSV / JSON</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* GROUP 3: CONTINUOUS MONITORING (API) (SECTION 9) */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Continuous Monitoring (API)
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              (Live stream SOC alert volume & real-time telemetry connectors)
            </span>
          </div>

          <Card
            title="9. SIEM / EDR Live Telemetry Stream"
            subtitle="Enable continuous re-quantification from live SOC alert volume & endpoint events"
            headerAction={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border border-cyan-800/80 text-cyan-400 bg-cyan-950/40">
                OPTIONAL, API CONNECTOR
              </span>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Live SIEM / EDR Telemetry Connector</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ingests real-time alert spikes from Splunk, CrowdStrike Falcon, or SentinelOne to trigger automated risk re-baselining.
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsAddModalOpen(true)}
                  className="gap-2 shrink-0 shadow-lg shadow-cyan-950"
                >
                  <Plug className="w-4 h-4" />
                  <span>Connect Live SIEM / EDR Stream</span>
                </Button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span className="italic">Provided by: SOC Team & Threat Intel Analysts</span>
                <span>Protocol: Encrypted Webhook / gRPC Stream</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Existing Active Connectors Grid */}
        {/* <Card
          title="Active Enterprise Data Connectors"
          subtitle="Real-time automated API sync pipelines feeding the continuous risk model"
          headerAction={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1.5 border-cyan-500/40 text-cyan-300 text-xs"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Add Connector</span>
            </Button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectors.map((ds) => (
              <div
                key={ds.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 hover:border-cyan-500/40 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{ds.type}</span>
                  <Badge variant="success">{ds.status}</Badge>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{ds.name}</h4>
                  <p className="text-[11px] font-mono text-cyan-400 mt-0.5">{ds.records} Records Imported</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Last Sync: {ds.lastSync}</span>
                  <span className="text-emerald-400">{ds.freshness}</span>
                </div>
              </div>
            ))}
          </div>
        </Card> */}
      </div>

      {/* SCHEMA PREVIEW & MAPPING MODAL FOR SECTION UPLOADS */}
      <Modal
        isOpen={Boolean(activeUploadSection)}
        onClose={() => { setActiveUploadSection(null); setStagedFile(null); }}
        title="Detected Schema Verification & Field Mapping"
        subtitle="Verify detected column headers before committing dataset to FAIR loss engine"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileUp className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white font-mono">{stagedFile?.name || 'security_dataset.csv'}</span>
              <Badge variant="info">1,240 Records Recognized</Badge>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Format: Standard CSV</span>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Target Schema Field Mapping:</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono bg-slate-950">
                    <th className="py-2.5 px-3">File Column Header</th>
                    <th className="py-2.5 px-3">Mapped Target Field</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr className="hover:bg-slate-900/60">
                    <td className="py-2 px-3 font-mono font-bold text-amber-300">asset_identifier</td>
                    <td className="py-2 px-3 font-semibold text-white">Target Asset Name / Hostname</td>
                    <td className="py-2 px-3 font-mono text-emerald-400">100% Match</td>
                    <td className="py-2 px-3 text-right"><Badge variant="success">Mapped</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-900/60">
                    <td className="py-2 px-3 font-mono font-bold text-amber-300">finding_cve_code</td>
                    <td className="py-2 px-3 font-semibold text-white">CVE Vulnerability Code</td>
                    <td className="py-2 px-3 font-mono text-emerald-400">98% Match</td>
                    <td className="py-2 px-3 text-right"><Badge variant="success">Mapped</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-900/60">
                    <td className="py-2 px-3 font-mono font-bold text-amber-300">cvss_score_v3</td>
                    <td className="py-2 px-3 font-semibold text-white">CVSS Base Severity Score</td>
                    <td className="py-2 px-3 font-mono text-emerald-400">100% Match</td>
                    <td className="py-2 px-3 text-right"><Badge variant="success">Mapped</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setActiveUploadSection(null); setStagedFile(null); }}
              className="border-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleCommitSectionUpload}
              disabled={isCommitting}
              className="gap-2 shadow-lg shadow-cyan-950"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Committing to FAIR Engine...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm & Commit Dataset to Baseline</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ADD CONNECTOR CATALOG MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setSelectedCatalogItem(null); }}
        title="Add Security Data Connector"
        subtitle="Onboard new security telemetry tools to expand risk coverage"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {!selectedCatalogItem ? (
            <div className="space-y-3">
              <span className="text-slate-300 font-semibold block text-xs">Select Integration Tool from Catalog:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catalogIntegrations.map((cat, idx) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedCatalogItem(cat);
                        setNewConnectorName(cat.name);
                        setNewConnectorType(cat.type);
                      }}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 cursor-pointer transition-all flex items-start gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-cyan-400 block">{cat.type}</span>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{cat.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{cat.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateConnector} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 block">Selected Integration</span>
                  <span className="font-bold text-white text-sm">{selectedCatalogItem.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCatalogItem(null)}
                  className="text-xs text-slate-400 hover:text-white underline font-mono"
                >
                  Change Tool
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Connector Display Name</label>
                  <input
                    type="text"
                    value={newConnectorName}
                    onChange={(e) => setNewConnectorName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">API Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://api.wiz.io/v1/findings"
                      value={newEndpointUrl}
                      onChange={(e) => setNewEndpointUrl(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Ingestion Frequency</label>
                    <select
                      value={newSyncFreq}
                      onChange={(e) => setNewSyncFreq(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="Realtime (Webhooks)">Realtime (Webhooks)</option>
                      <option value="Every 5 minutes">Every 5 minutes</option>
                      <option value="Hourly Batch">Hourly Batch</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">API Token / Secret Key</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••••••••••"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="border-slate-700"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" className="gap-1.5 shadow-lg shadow-cyan-950">
                  <Plug className="w-4 h-4" />
                  <span>Establish Connection & Run Initial Sync</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
