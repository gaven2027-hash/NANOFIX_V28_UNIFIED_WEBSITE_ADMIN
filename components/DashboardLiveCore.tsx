'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { createBrowserClient } from '@/lib/supabase/browser';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';
type Row = Record<string, unknown>;

type Kpi = {
  key: string;
  label: string;
  zh: string;
  value: number | string;
  tone: Tone;
  href: string;
  warning?: string | null;
};

type Section = {
  key: string;
  label: string;
  zh: string;
  route: string;
  tone: Tone;
  count: number;
  error?: string | null;
};

type DashboardPayload = {
  ok?: boolean;
  generated_at?: string;
  selected_key?: string;
  kpis?: Kpi[];
  sections?: Section[];
  selectedRows?: Row[];
  errors?: Array<{ key: string; error: string }>;
  error?: string;
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function rowKey(row: Row, index: number) {
  const keys = ['lead_id', 'service_request_id', 'inspection_id', 'quotation_id', 'invoice_id', 'payment_id', 'backup_id', 'audit_id', 'module_key'];
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value) return value;
  }
  return String(index);
}

function rowHref(row: Row) {
  const href = row._dashboard_href;
  return typeof href === 'string' && href ? href : '';
}

function visibleColumns(rows: Row[]) {
  const first = rows[0];
  if (!first) return [];
  return Object.keys(first).filter((key) => !key.startsWith('_')).slice(0, 7);
}

async function sessionHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

function LiveRows({ rows }: { rows: Row[] }) {
  const columns = useMemo(() => visibleColumns(rows), [rows]);
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => <th key={column} className="p-3">{column}</th>)}
            <th className="p-3">Open / 打开</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)} className="bg-white hover:bg-blue-50/50">
              {columns.map((column) => (
                <td key={column} className="max-w-64 truncate p-3 text-xs font-semibold text-slate-700">
                  {column.includes('status') || column.includes('role') || column.includes('priority') ? <Badge tone="blue">{displayValue(row[column])}</Badge> : displayValue(row[column])}
                </td>
              ))}
              <td className="p-3">
                {rowHref(row) ? <Link href={rowHref(row)} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Open Detail</Link> : <span className="text-xs font-bold text-slate-400">—</span>}
              </td>
            </tr>
          ))}
          {!rows.length ? <tr><td colSpan={Math.max(columns.length + 1, 1)} className="p-6 text-center text-sm font-bold text-slate-500">No live records found. / 暂无真实记录。</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardLiveCore() {
  const [payload, setPayload] = useState<DashboardPayload>({});
  const [section, setSection] = useState('new_leads');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function load(nextSection = section) {
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams({ section: nextSection });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
        cache: 'no-store',
        headers: await sessionHeaders()
      });
      const json = (await response.json().catch(() => ({}))) as DashboardPayload;
      setPayload(json);
      if (!response.ok && response.status !== 207) setMessage(json.error || 'Dashboard live API failed. / 仪表盘真实 API 加载失败。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Dashboard live API failed. / 仪表盘真实 API 加载失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load('new_leads'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function chooseSection(key: string) {
    setSection(key);
    await load(key);
  }

  return (
    <SectionCard title="Live Dashboard Core / 真实数据仪表盘核心" subtitle="Connected to Supabase admin APIs with read audit logs. Static summary cards below are retained temporarily for comparison until fully replaced. / 已接入 Supabase 后台 API 并写入读取审计；下方旧静态摘要暂保留作对比，后续逐步替换。">
      <div id="executive-overview" className="scroll-mt-32 space-y-5">
        {message ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">{message}</div> : null}
        {payload.errors?.length ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 ring-1 ring-amber-100">Some modules returned degraded data. / 部分模块数据降级：{payload.errors.map((item) => `${item.key}: ${item.error}`).join(' | ')}</div> : null}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search live dashboard records... / 搜索真实仪表盘记录" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" />
          <button type="button" onClick={() => load(section)} disabled={loading} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">{loading ? 'Loading...' : 'Refresh / 刷新'}</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(payload.kpis || []).map((kpi) => (
            <button key={kpi.key} type="button" onClick={() => chooseSection(kpi.key)} className={`rounded-3xl p-5 text-left shadow-soft ring-1 transition hover:-translate-y-0.5 hover:ring-activeBlue ${section === kpi.key ? 'bg-blue-50 ring-activeBlue' : 'bg-white ring-slate-200'}`}>
              <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-slate-900">{kpi.label}</div><div className="text-xs font-semibold text-slate-500">{kpi.zh}</div></div><Badge tone={kpi.tone}>{kpi.warning ? 'Check' : 'Live'}</Badge></div>
              <div className="mt-4 text-4xl font-black tracking-tight text-slate-950">{kpi.value}</div>
              <div className="mt-2 text-xs font-black text-activeBlue">Click to show real rows / 点击查看真实记录</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(payload.sections || []).map((item) => (
            <button key={item.key} type="button" onClick={() => chooseSection(item.key)} className={`rounded-2xl px-3 py-2 text-xs font-black ring-1 ${section === item.key ? 'bg-activeBlue text-white ring-activeBlue' : 'bg-white text-slate-700 ring-slate-200 hover:bg-blue-50'}`}>
              {item.label} / {item.zh} ({item.count})
            </button>
          ))}
        </div>

        <LiveRows rows={payload.selectedRows || []} />
        <div className="text-xs font-bold text-slate-400">Generated at / 生成时间：{payload.generated_at || '—'}</div>
      </div>
    </SectionCard>
  );
}
