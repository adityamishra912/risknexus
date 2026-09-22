'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageContainer from '../../components/layout/PageContainer';
import { fetchAPI } from '../../lib/api/client';

export default function GLPIDataPage() {
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <PageContainer title="GLPI Data" subtitle="Read-only view of the tables collected in the local GLPI MySQL database">
      <div className="flex gap-2 border-b border-slate-800 pb-4 mb-6 text-xs">
        <Link href="/dashboard" className="px-3 py-2 text-slate-400 hover:text-white">Main</Link>
        <Link href="/glpi-data" className="px-3 py-2 rounded bg-cyan-500/10 text-cyan-300">GLPI Data</Link>
        <Link href="/assets" className="px-3 py-2 text-slate-400 hover:text-white">Assets</Link>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}
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
    </PageContainer>
  );
}
