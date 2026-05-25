'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '').toLowerCase();
  if (/(healthy|active|enabled|success|ok)/.test(s)) return 'green';
  if (/(degraded|pending|warning|unknown)/.test(s)) return 'amber';
  if (/(failed|down|disabled|error|critical)/.test(s)) return 'red';
  return 'blue';
}

export function ModuleHealthWorkspace() {
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get('module_key') || '';
  const [search, setSearch] = useState(moduleKey);
  const [modules, setModules] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setSearch(moduleKey); }, [moduleKey]);

  async function load() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ mode: 'health' });
    if (search) params.set('search', search);
    const response = await fetch(`/api/admin/system-settings?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    setModules(json.health?.modules || []);
    setEvents(json.health?.events || []);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [moduleKey]);

  const selectedModule = useMemo(() => {
    if (!moduleKey) return null;
    return modules.find((row) => String(row.module_key) === moduleKey) || null;
  }, [modules, moduleKey]);

  return (
    <div>
      {selectedModule ? (
        <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-blue-100">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Opened from Dashboard / 来自仪表盘跳转</div>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{formatValue(selectedModule.name || selectedModule.module_key)}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={tone(selectedModule.health_status)}>{formatValue(selectedModule.health_status)}</Badge>
            <Badge tone={selectedModule.enabled ? 'green' : 'red'}>{selectedModule.enabled ? 'enabled' : 'disabled'}</Badge>
            <Badge tone="blue">{formatValue(selectedModule.category)}</Badge>
            <Badge tone="amber">{formatValue(selectedModule.criticality)}</Badge>
          </div>
        </div>
      ) : null}

      {message ? <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">{message}</div> : null}

      <SectionCard title="Module Health Checks / 模块健康检查" subtitle="Search and inspect module health records. Dashboard links can open one module directly. / 搜索并查看模块健康状态，仪表盘链接可直接打开对应模块。">
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search module key, name, health status... / 搜索模块" />
          <button type="button" onClick={load} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Health</th><th className="p-3">Module</th><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Criticality</th><th className="p-3">Enabled</th><th className="p-3">Updated</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((row) => <tr key={String(row.module_key)} className={String(row.module_key) === moduleKey ? 'bg-blue-50' : 'hover:bg-blue-50/50'}><td className="p-3"><Badge tone={tone(row.health_status)}>{formatValue(row.health_status)}</Badge></td><td className="p-3 font-black text-slate-800">{formatValue(row.module_key)}</td><td className="p-3 text-slate-700">{formatValue(row.name)}</td><td className="p-3 text-slate-600">{formatValue(row.category)}</td><td className="p-3 text-slate-600">{formatValue(row.criticality)}</td><td className="p-3"><Badge tone={row.enabled ? 'green' : 'red'}>{row.enabled ? 'enabled' : 'disabled'}</Badge></td><td className="p-3 text-slate-500">{formatValue(row.updated_at)}</td></tr>)}
              {!modules.length ? <tr><td colSpan={7} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No module health records. / 暂无模块健康记录。'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-5">
        <SectionCard title="Health Events / 健康事件" subtitle="Recent module health events filtered by the same search. / 根据相同搜索条件显示最近健康事件。">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Module</th><th className="p-3">Check</th><th className="p-3">Message</th><th className="p-3">Latency</th><th className="p-3">Created</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((row) => <tr key={String(row.health_event_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={tone(row.status)}>{formatValue(row.status)}</Badge></td><td className="p-3 font-black text-slate-800">{formatValue(row.module_key)}</td><td className="p-3 text-slate-700">{formatValue(row.check_name)}</td><td className="max-w-md truncate p-3 text-slate-600">{formatValue(row.message)}</td><td className="p-3 text-slate-600">{formatValue(row.latency_ms)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td></tr>)}
                {!events.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">No health events. / 暂无健康事件。</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
