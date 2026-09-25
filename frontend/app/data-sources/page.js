'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, CheckCircle2, FileUp, Plug, Radio, RefreshCw, UploadCloud } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import AgentDataViewer from '../../components/data-sources/AgentDataViewer';
import { getDataSourceStatus, runDataSources, uploadDataset } from '../../lib/api/ingestion';
import { useRiskContext } from '../../providers/RiskProvider';

const DATASETS = [
  ['business_units', 'Business Units', 'Organizational ownership and revenue context.'],
  ['business_services', 'Business Services', 'Services that connect assets to business impact.'],
  ['assets', 'Assets', 'Canonical infrastructure inventory for the risk graph.'],
  ['asset_relationships', 'Asset Relationships', 'Directed connections used to build attack paths.'],
  ['vulnerabilities', 'Vulnerabilities', 'Vulnerability findings associated with assets.'],
  ['controls', 'Controls', 'Security controls and investment parameters.'],
  ['control_status', 'Control Status', 'Control coverage and maturity by asset.'],
  ['control_effectiveness', 'Control Effectiveness', 'Threat-specific control effectiveness evidence.'],
  ['threat_scenarios', 'Threat Scenarios', 'Threat frequency and attack-vector assumptions.'],
  ['vulnerability_threat_rules', 'Vulnerability Threat Rules', 'Rules linking findings to threat scenarios.'],
];

const initialUploadState = Object.fromEntries(DATASETS.map(([id]) => [id, { file: null, status: 'Not uploaded', result: null, error: null, uploading: false }]));

export default function DataSourcesPage() {
  const router = useRouter();
  const { refreshData } = useRiskContext();
  const [tab, setTab] = useState('main');
  const [uploads, setUploads] = useState(initialUploadState);
  const [sourceModes, setSourceModes] = useState(Object.fromEntries(DATASETS.map(([id]) => [id, 'upload'])));
  const [status, setStatus] = useState({ datasets: [], uploaded_count: 0, required_count: DATASETS.length });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [runState, setRunState] = useState('Run');
  const inputRefs = useRef({});

  const loadStatus = useCallback(() => {
    setLoadingStatus(true);
    getDataSourceStatus().then((response) => { if (response.mysql) setStatus(response.mysql); }).catch(() => {}).finally(() => setLoadingStatus(false));
  }, []);

  useEffect(() => { setTab(new URLSearchParams(window.location.search).get('tab') === 'agent-data' ? 'agent-data' : 'main'); }, []);
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const statusMap = useMemo(() => Object.fromEntries((status.datasets || []).map((item) => [item.dataset_type, item])), [status.datasets]);
  const setActiveTab = (nextTab) => { setTab(nextTab); router.push(`/data-sources?tab=${nextTab}`); };
  const selectFile = (datasetType, file) => {
    if (!file) return;
    setUploads((current) => ({ ...current, [datasetType]: { ...current[datasetType], file, status: 'Upload pending', result: null, error: null } }));
  };
  const upload = async (datasetType) => {
    const selected = uploads[datasetType].file;
    if (!selected) return;
    setUploads((current) => ({ ...current, [datasetType]: { ...current[datasetType], uploading: true, error: null } }));
    const formData = new FormData();
    formData.append('dataset_type', datasetType);
    formData.append('file', selected);
    try {
      const result = await uploadDataset(formData);
      setUploads((current) => ({ ...current, [datasetType]: { ...current[datasetType], uploading: false, status: 'Uploaded', result } }));
      loadStatus();
    } catch (error) {
      setUploads((current) => ({ ...current, [datasetType]: { ...current[datasetType], uploading: false, status: 'Error', error: error.message } }));
    }
  };
  const run = async () => {
    setRunState('Running...');
    try { await runDataSources(); setRunState('Run Complete'); refreshData(); loadStatus(); } catch (error) { setRunState(`Run Failed: ${error.message}`); }
  };

  return (
    <PageContainer title="Security Data Sources & Onboarding Hub" subtitle="Load canonical datasets into MySQL and run the existing risk pipeline from the active database state." action={<Button variant="primary" size="sm" onClick={run} disabled={runState === 'Running...'} className="gap-1.5"><RefreshCw className={`h-4 w-4 ${runState === 'Running...' ? 'animate-spin' : ''}`} />{runState}</Button>}>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex gap-2 text-xs"><button type="button" onClick={() => setActiveTab('main')} className={`rounded px-3 py-2 ${tab === 'main' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:text-white'}`}>Main</button><button type="button" onClick={() => setActiveTab('agent-data')} className={`rounded px-3 py-2 ${tab === 'agent-data' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:text-white'}`}>Agent Data</button></div>
          {tab === 'main' && <span className="text-xs text-slate-400">{loadingStatus ? 'Checking MySQL...' : `${status.uploaded_count} of ${status.required_count} datasets uploaded`}</span>}
        </div>
        {tab === 'agent-data' ? <AgentDataViewer /> : <>
          <Card><div className="flex items-center gap-3"><Activity className="h-5 w-5 text-cyan-400" /><div><h2 className="text-sm font-bold text-white">MySQL data readiness</h2><p className="text-xs text-slate-400">Readiness reflects tables confirmed by the backend, not selected browser files.</p></div><Badge variant={status.uploaded_count === status.required_count ? 'success' : 'warning'} className="ml-auto">{status.uploaded_count}/{status.required_count} Ready</Badge></div></Card>
          <div className="grid gap-4 xl:grid-cols-2">{DATASETS.map(([datasetType, title, description]) => { const state = uploads[datasetType]; const stored = statusMap[datasetType]; return <DatasetCard key={datasetType} title={title} description={description} mode={sourceModes[datasetType]} setMode={(mode) => setSourceModes((current) => ({ ...current, [datasetType]: mode }))} state={state} stored={stored} inputRef={(node) => { inputRefs.current[datasetType] = node; }} onFile={(file) => selectFile(datasetType, file)} onUpload={() => upload(datasetType)} onChoose={() => inputRefs.current[datasetType]?.click()} />; })}</div>
          <Card title="SIEM / EDR Live Telemetry Stream" subtitle="Connect live SOC alert volume and endpoint events for future risk re-baselining." headerAction={<Badge variant="info">OPTIONAL CONNECTOR</Badge>}><div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><Radio className="mt-1 h-5 w-5 text-cyan-400" /><div><p className="text-sm font-bold text-white">Live SIEM / EDR Telemetry Connector</p><p className="text-xs text-slate-400">Prototype connector surface retained from the existing Data Sources page.</p></div></div><Button variant="outline" size="sm" className="gap-2"><Plug className="h-4 w-4" />Connect</Button></div></Card>
        </>}
      </div>
    </PageContainer>
  );
}

function DatasetCard({ title, description, mode, setMode, state, stored, inputRef, onFile, onUpload, onChoose }) {
  const optionClass = (value) => `rounded border px-2 py-1 text-xs ${mode === value ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`;
  return <Card title={title} subtitle={description} headerAction={<Badge variant={stored?.status === 'uploaded' || state.status === 'Uploaded' ? 'success' : state.status === 'Error' ? 'danger' : 'warning'}>{stored?.status === 'uploaded' ? `Uploaded • ${stored.rows} rows` : state.status}</Badge>}><div className="space-y-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setMode('agent')} className={optionClass('agent')}>Connect Agent</button><button type="button" onClick={() => setMode('upload')} className={optionClass('upload')}>Upload File</button><button type="button" onClick={() => setMode('integrate')} className={optionClass('integrate')}>Integrate other platforms</button></div>{mode === 'agent' && <p className="text-xs text-cyan-300">Prototype selected. Agent connection is not configured.</p>}{mode === 'integrate' && <p className="text-xs text-slate-400">Integration coming soon. No connector has been configured.</p>}{mode === 'upload' && <><input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} /><button type="button" onClick={onChoose} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/60 p-5 text-xs text-slate-300 hover:border-cyan-500/50"><UploadCloud className="h-5 w-5 text-cyan-400" />Choose CSV file</button>{state.file && <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs"><span className="flex items-center gap-2 text-white"><FileUp className="h-4 w-4 text-cyan-400" />{state.file.name} <span className="text-slate-500">({Math.ceil(state.file.size / 1024)} KB)</span></span><Button size="sm" variant="primary" onClick={onUpload} disabled={state.uploading}>{state.uploading ? 'Uploading...' : 'Upload'}</Button></div>}{state.result && <p className="flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" />{state.result.rows_inserted} rows imported into {state.result.table_name}</p>}{state.error && <p className="text-xs text-red-300">Upload failed: {state.error}</p>}</>}</div></Card>;
}
