'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { menu, type MenuChild } from '@/data/adminNavigation';
import { getAdminModuleReality } from '@/data/adminModuleReality';

type Props = { route: string };
type TableProbe = { table: string; count: number | null; ok: boolean; error: string | null };
type ApiProbe = { path: string; ok: boolean; status: number | null; error: string | null };
type ModuleOperationResponse = {
  ok?: boolean;
  error?: string;
  module?: { child: MenuChild; module_key: string; status: string; risk: string };
  operations?: { tables: TableProbe[]; apis: string[]; api_probes: ApiProbe[] };
  audit?: { rows: Array<Record<string, unknown>>; error: string | null };
  task?: Record<string, unknown> | null;
};

function anchorFromHref(href: string) { return href.includes('#') ? href.split('#')[1] : href.replace(/^\//, '').replace(/\//g, '-'); }
function basePath(href: string) { return href.split('#')[0] || '/admin'; }
function statusClass(status: string | undefined) {
  if (status === 'live') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (status === 'partial') return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (status === 'contract') return 'bg-blue-50 text-blue-700 ring-blue-100';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}
function shortValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value.length > 90 ? `${value.slice(0, 87)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value).slice(0, 120);
}

function useActiveHash(items: MenuChild[]) {
  const [activeHref, setActiveHref] = useState(items[0]?.href || '');
  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace('#', '');
      const matched = items.find((item) => anchorFromHref(item.href) === hash);
      if (!matched) return;
      setActiveHref(matched.href);
      window.setTimeout(() => {
        if (document.getElementById(hash)) return;
        document.getElementById(`${hash}-operations`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [items]);
  return [activeHref, setActiveHref] as const;
}

function OperationCard({ item, active, onFocus }: { item: MenuChild; active: boolean; onFocus: (href: string) => void }) {
  const reality = getAdminModuleReality(item.href);
  const anchor = anchorFromHref(item.href);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [result, setResult] = useState<ModuleOperationResponse | null>(null);
  const [apiResult, setApiResult] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshLiveData() {
    setLoading(true); setMessage(null);
    try {
      const response = await fetch(`/api/admin/module-operations?href=${encodeURIComponent(item.href)}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as ModuleOperationResponse;
      setResult(data);
      setMessage(response.ok ? 'Live data refreshed / 实时数据已刷新' : data.error || `HTTP ${response.status}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Refresh failed'); }
    finally { setLoading(false); }
  }

  async function writeOperation(action: 'record_audit_check' | 'create_followup_task') {
    setLoading(true); setMessage(null);
    try {
      const response = await fetch('/api/admin/module-operations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ href: item.href, action }) });
      const data = await response.json().catch(() => ({})) as ModuleOperationResponse;
      setResult((current) => ({ ...(current ?? {}), ...data }));
      setMessage(response.ok ? 'Operation written / 操作已写入后台' : data.error || `HTTP ${response.status}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Write failed'); }
    finally { setLoading(false); }
  }

  async function probePrimaryApi() {
    const api = result?.operations?.apis?.[0];
    if (!api) { await refreshLiveData(); return; }
    setApiLoading(true); setMessage(null);
    try {
      const response = await fetch(`${api}${api.includes('?') ? '&' : '?'}limit=5`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as Record<string, unknown>;
      setApiResult({ ok: response.ok, status: response.status, api, data });
      setMessage(response.ok ? 'Linked API opened / 已读取关联 API' : `Linked API returned HTTP ${response.status}`);
    } catch (error) { setApiResult({ ok: false, api, error: error instanceof Error ? error.message : 'API probe failed' }); }
    finally { setApiLoading(false); }
  }

  const tableProbes = result?.operations?.tables ?? [];
  const apiProbes = result?.operations?.api_probes ?? [];
  const okTables = tableProbes.filter((table) => table.ok).length;
  const okApis = apiProbes.filter((api) => api.ok).length;
  const status = result?.module?.status ?? reality?.status ?? 'live';

  return (
    <article id={`${anchor}-operations`} className={`scroll-mt-40 rounded-3xl bg-white p-5 shadow-soft ring-1 transition ${active ? 'ring-activeBlue' : 'ring-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={() => { onFocus(item.href); window.history.replaceState(null, '', `${basePath(item.href)}#${anchor}`); }} className="min-w-0 text-left">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{anchor}</div>
          <h3 className="mt-1 text-lg font-black leading-6 text-slate-950">{item.title}</h3>
          <div className="mt-1 text-xs font-bold text-slate-500">{item.zh}</div>
        </button>
        <span className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] ring-1 ${statusClass(status)}`}>{status}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="text-[11px] font-black text-slate-500">Tables / 数据表</div><div className="mt-1 text-xl font-black text-slate-950">{tableProbes.length ? `${okTables}/${tableProbes.length}` : '—'}</div></div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="text-[11px] font-black text-slate-500">APIs / 接口</div><div className="mt-1 text-xl font-black text-slate-950">{apiProbes.length ? `${okApis}/${apiProbes.length}` : '—'}</div></div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="text-[11px] font-black text-slate-500">Audit / 审计</div><div className="mt-1 text-xl font-black text-slate-950">{result?.audit?.rows?.length ?? '—'}</div></div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="text-[11px] font-black text-slate-500">Task / 任务</div><div className="mt-1 text-xl font-black text-slate-950">{result?.task ? 'Created' : '—'}</div></div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={refreshLiveData} disabled={loading} className="rounded-2xl bg-activeBlue px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70">{loading ? 'Running...' : 'Refresh Live Data / 刷新实时数据'}</button>
        <button type="button" onClick={() => writeOperation('record_audit_check')} disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-70">Write Audit Check / 写入审计</button>
        <button type="button" onClick={() => writeOperation('create_followup_task')} disabled={loading} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70">Create Follow-up Task / 新建跟进任务</button>
        <button type="button" onClick={probePrimaryApi} disabled={apiLoading} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-800 ring-1 ring-slate-200 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70">{apiLoading ? 'Opening...' : 'Open Linked API / 打开关联接口'}</button>
        <Link href={basePath(item.href)} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open Main Workspace / 打开主模块</Link>
      </div>

      {message ? <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-blue-100">{message}</div> : null}
      {tableProbes.length ? <div className="mt-4 grid gap-2 lg:grid-cols-2">{tableProbes.map((probe) => <div key={probe.table} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold ring-1 ring-slate-200"><span className="truncate text-slate-700">{probe.table}</span><span className={probe.ok ? 'text-emerald-700' : 'text-red-700'}>{probe.ok ? `${probe.count ?? 0} rows` : shortValue(probe.error)}</span></div>)}</div> : null}
      {apiProbes.length ? <div className="mt-4 grid gap-2 lg:grid-cols-2">{apiProbes.map((probe) => <div key={probe.path} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold ring-1 ring-slate-200"><span className="truncate text-slate-700">{probe.path}</span><span className={probe.ok ? 'text-emerald-700' : 'text-red-700'}>{probe.ok ? `HTTP ${probe.status}` : shortValue(probe.error)}</span></div>)}</div> : null}
      {result?.audit?.rows?.length ? <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">Action</th><th className="px-3 py-2">Object</th><th className="px-3 py-2">Time</th></tr></thead><tbody className="divide-y divide-slate-100">{result.audit.rows.slice(0, 5).map((row, index) => <tr key={`${shortValue(row.audit_id)}-${index}`}><td className="px-3 py-2 font-bold text-slate-800">{shortValue(row.action)}</td><td className="px-3 py-2 font-semibold text-slate-600">{shortValue(row.object_type)}</td><td className="px-3 py-2 font-semibold text-slate-500">{shortValue(row.created_at)}</td></tr>)}</tbody></table></div> : null}
      {apiResult ? <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-[11px] font-semibold leading-5 text-slate-100">{JSON.stringify(apiResult, null, 2)}</pre> : null}
    </article>
  );
}

export function AdminSubmoduleWorkspace({ route }: Props) {
  const items = useMemo(() => menu.find((item) => item.href === route)?.children || [], [route]);
  const [activeHref, setActiveHref] = useActiveHash(items);
  if (!items.length) return null;
  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Submodule Operations / 二级模块操作台</div><h2 className="mt-1 text-xl font-black text-slate-950">Live menu control panel / 实时菜单控制面板</h2></div><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">{items.length} modules</span></div>
      <div className="mt-4 flex flex-wrap gap-2">{items.map((item) => { const active = activeHref === item.href; const anchor = anchorFromHref(item.href); return <a key={item.href} href={`${basePath(item.href)}#${anchor}`} onClick={() => setActiveHref(item.href)} className={`rounded-2xl px-3 py-2 text-xs font-black transition ${active ? 'bg-activeBlue text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-activeBlue'}`}>{item.title}</a>; })}</div>
      <div className="mt-5 grid gap-4">{items.map((item) => <OperationCard key={item.href} item={item} active={activeHref === item.href} onFocus={setActiveHref} />)}</div>
    </section>
  );
}
