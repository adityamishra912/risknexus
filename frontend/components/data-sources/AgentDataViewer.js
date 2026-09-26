'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAPI } from '../../lib/api/client';

export default function AgentDataViewer() {
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
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
    fetchAPI(`/glpi/tables/${encodeURIComponent(selected)}?page=1&limit=50`)
      .then(setData)
      .catch((reason) => setError(`GLPI table request failed for ${selected}: ${reason.message}`));
  }, [selected]);

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter((table) => table.toLowerCase().includes(query));
  }, [tables, search]);

  const filteredRows = useMemo(() => {
    if (!data || !search.trim()) return data?.rows ?? [];
    const query = search.trim().toLowerCase();
    return (data.rows || []).filter((row) => Object.values(row).some((value) => value != null && String(value).toLowerCase().includes(query)));
  }, [data, search]);

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Available GLPI tables</h2>
            {tables.length > 0 && <span className="text-[10px] uppercase tracking-wide text-slate-500">{filteredTables.length}</span>}
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter tables or rows"
            className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          {loading ? <p className="text-xs text-slate-400">Loading table schema...</p> : filteredTables.length === 0 ? <p className="text-xs text-slate-400">No GLPI tables match this filter.</p> : (
            <div className="max-h-[620px] space-y-1 overflow-auto">
              {filteredTables.map((table) => <button key={table} onClick={() => { setSelected(table); setError(null); setData(null); }} className={`block w-full rounded px-3 py-2 text-left text-xs ${selected === table ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{table}</button>)}
            </div>
          )}
        </section>
        <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          {!selected && <p className="text-sm text-slate-400">Select a table to inspect its columns and rows.</p>}
          {selected && !data && !error && <p className="text-sm text-slate-400">Loading {selected}...</p>}
          {data && <>
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-white">{data.table}</h2><span className="text-xs text-slate-400">{filteredRows.length} of {data.total} rows</span></div>
            <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-700 text-slate-400">{data.columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2">{column}</th>)}</tr></thead><tbody>{filteredRows.length === 0 ? <tr><td colSpan={data.columns.length} className="px-3 py-4 text-center text-slate-400">No rows match the current filter.</td></tr> : filteredRows.map((row, index) => <tr key={row.id ?? index} className="border-b border-slate-800/70 text-slate-300">{data.columns.map((column) => <td key={column} className="max-w-70 whitespace-nowrap px-3 py-2">{row[column] == null ? '' : String(row[column])}</td>)}</tr>)}</tbody></table></div>
          </>}
        </section>
      </div>
    </div>
  );
}
