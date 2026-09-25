'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageContainer from '../../components/layout/PageContainer';
import { fetchAPI } from '../../lib/api/client';

export default function GLPIDataPage() {
  const [activeTab, setActiveTab] = useState('glpi');
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trivy, setTrivy] = useState({ rows: [], total: 0, count: 0, loading: true, error: null });

  useEffect(() => {
    fetchAPI('/glpi/tables')
      .then((response) => setTables(response.tables || []))
      .catch((reason) => setError(`GLPI table discovery failed: ${reason.message}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setError(null);
    setData(null);
    fetchAPI(`/glpi/tables/${encodeURIComponent(selected)}?page=1&limit=50`)
      .then(setData)
      .catch((reason) => setError(`GLPI table request failed for ${selected}: ${reason.message}`));
  }, [selected]);

  useEffect(() => {
    fetchAPI('/trivy?page=1&limit=50')
      .then((response) => setTrivy({ rows: response.records || [], total: response.total || 0, count: response.count || 0, loading: false, error: null }))
      .catch((reason) => setTrivy({ rows: [], total: 0, count: 0, loading: false, error: `Trivy Data request failed: ${reason.message}` }));
  }, []);

  return (
    <PageContainer title="GLPI Data" subtitle="Read-only view of the tables collected in the local GLPI MySQL database">
      <div className="flex gap-2 border-b border-slate-800 pb-4 mb-6 text-xs">
        <Link href="/dashboard" className="px-3 py-2 text-slate-400 hover:text-white">Main</Link>
        <button type="button" onClick={() => setActiveTab('glpi')} className={`px-3 py-2 rounded ${activeTab === 'glpi' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:text-white'}`}>GLPI Data</button>
        <button type="button" onClick={() => setActiveTab('trivy')} className={`px-3 py-2 rounded ${activeTab === 'trivy' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:text-white'}`}>Trivy Data</button>
        <Link href="/assets" className="px-3 py-2 text-slate-400 hover:text-white">Assets</Link>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}
      {activeTab === 'glpi' ? (
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Available tables</h2>
          {loading ? <p className="text-xs text-slate-400">Loading table schema...</p> : tables.length === 0 ? <p className="text-xs text-slate-400">No GLPI tables found.</p> : (
            <div className="max-h-155 space-y-1 overflow-auto">
              {tables.map((table) => <button key={table} onClick={() => setSelected(table)} className={`block w-full rounded px-3 py-2 text-left text-xs ${selected === table ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{table}</button>)}
            </div>
          )}
        </section>
        <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          {!selected && <p className="text-sm text-slate-400">Select a table to inspect its columns and rows.</p>}
          {selected && !data && !error && <p className="text-sm text-slate-400">Loading {selected}...</p>}
          {data && <>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">{data.table}</h2><span className="text-xs text-slate-400">{data.total} rows</span></div>
            <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-700 text-slate-400">{data.columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2">{column}</th>)}</tr></thead><tbody>{data.rows.map((row, index) => <tr key={row.id ?? index} className="border-b border-slate-800/70 text-slate-300">{data.columns.map((column) => <td key={column} className="max-w-70 whitespace-nowrap px-3 py-2">{row[column] == null ? '' : String(row[column])}</td>)}</tr>)}</tbody></table></div>
          </>}
        </section>
      </div>
      ) : (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Trivy Data</h2>
          <span className="text-xs text-slate-400">{trivy.count || trivy.total || 0} rows</span>
        </div>
        {trivy.error ? <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">{trivy.error}</div> : trivy.loading ? <p className="text-sm text-slate-400">Loading Trivy vulnerabilities...</p> : trivy.rows.length === 0 ? <p className="text-sm text-slate-400">No Trivy vulnerabilities collected yet.</p> : <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-700 text-slate-400"><th className="px-3 py-2">Vulnerability ID</th><th className="px-3 py-2">Package</th><th className="px-3 py-2">Installed Version</th><th className="px-3 py-2">Fixed Version</th><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Published Date</th><th className="px-3 py-2">Modified Date</th><th className="px-3 py-2">Primary URL</th></tr></thead><tbody>{trivy.rows.map((row, index) => <tr key={row.id ?? `${row.vulnerability_id}-${row.package_name}-${index}`} className="border-b border-slate-800/70 text-slate-300"><td className="px-3 py-2">{row.vulnerability_id ?? ''}</td><td className="px-3 py-2">{row.package_name ?? ''}</td><td className="px-3 py-2">{row.installed_version ?? ''}</td><td className="px-3 py-2">{row.fixed_version ?? ''}</td><td className="px-3 py-2">{row.severity ?? ''}</td><td className="px-3 py-2">{row.status ?? ''}</td><td className="px-3 py-2">{row.title ?? ''}</td><td className="px-3 py-2">{row.target ?? ''}</td><td className="px-3 py-2">{row.type ?? ''}</td><td className="px-3 py-2">{row.published_date ?? ''}</td><td className="px-3 py-2">{row.last_modified_date ?? ''}</td><td className="px-3 py-2"><a href={row.primary_url ?? '#'} target="_blank" rel="noreferrer" className="text-cyan-300 underline break-all">{row.primary_url ?? ''}</a></td></tr>)}</tbody></table></div>}
      </div>
      )}
    </PageContainer>
  );
}
