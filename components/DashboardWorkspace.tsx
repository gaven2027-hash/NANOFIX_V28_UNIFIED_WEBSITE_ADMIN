'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { dashboardSections, type DashboardSectionConfig } from '@/lib/nanofix/dashboardConfig';

type Row = Record<string, unknown>;

type Kpi = {
  key: string;
  label: string;
  zh: string;
  value: string | number;
  trend: string;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';
};

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '').toLowerCase();
  if (/(active|approved|paid|completed|healthy|published|linked|success)/i.test(s)) return 'green';
  if (/(pending|draft|scheduled|sent|open|degraded|review|assigned)/i.test(s)) return 'amber';
  if (/(failed|cancelled|overdue|disabled|rejected|expired|critical|unpaid)/i.test(s)) return 'red';
  return 'blue';
}

function pickRowKey(row: Row, index: number) {
  return String(row.lead_id || row.service_request_id || row.inspection_id || row.quotation_id || row.invoice_id || row.draft_id || row.module_key || row.audit_id || row.message_id || row.search_log_id || index);
}

function ShortcutTabs({ activeSection }: { activeSection?: DashboardSectionConfig | null }) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {dashboardSections.map((section) => (
        <Link key={section.key} href={section.href} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${activeSection?.key === section.key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}>
          <span className="block">{section.title}</span>
          <span className="block text-xs font-semibold text-slate-500">{section.zh}</span>
        </Link>
      ))}
    </div>
  );
}

function DetailTable({ rows }: { rows: Row[] }) {
  const keys = rows[0] ? Object.keys(rows[0]).slice(0, 8) : [];
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>{keys.length ? keys.map((key) => <th key={key} className="p-3">{key}</th>) : <th className="p-3">Records</th>}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={pickRowKey(row, index)} className="bg-white hover:bg-blue-50/50">
              {keys.map((key) => (
                <td key={key} className="max-w-64 truncate p-3 text-slate-700">
                  {key.includes('status') || key.includes('priority') || key.includes('risk') ? <Badge tone={statusTone(row[key])}>{formatValue(row[key])}</Badge> : formatValue(row[key])}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length ? <tr><td className="p-6 text-center text-sm font-bold text-slate-500">No records. / 暂无记录。</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardWorkspace({ section }: { section?: DashboardSectionConfig | null }) {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [activeDetail, setActiveDetail] = useState(section?.detailMode || 'summary');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Row[]>([]);

  useEffect(() => setActiveDetail(section?.detailMode || 'summary'), [section]);

  async function load(detail = activeDetail) {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ detail });
    if (search) params.set('search', search);
    const response = await fetch(`/api/admin/dashboard?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    setKpis(json.kpis || []);
    setRows(json.selectedRows || []);
    setErrors(json.errors || []);
  }

  useEffect(() => { void load(section?.detailMode || 'summary'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [section]);

  async function selectDetail(detail: string) {
    setActiveDetail(detail);
    await load(detail);
  }

  return (
    <div>
      <ShortcutTabs activeSection={section} />
      {section ? (
        <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Dashboard Section / 仪表盘二级栏目</div>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{section.title} / {section.zh}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{section.helper}</p>
        </div>
      ) : null}

      {message ? <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">{message}</div> : null}
      {errors.length ? <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 ring-1 ring-amber-100">Some dashboard sources returned warnings. / 部分数据源有警告，但页面不会中断。</div> : null}

      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <input className={inputClass} placeholder="Search dashboard records... / 搜索仪表盘记录" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button type="button" onClick={() => load(activeDetail)} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <button key={kpi.key} type="button" onClick={() => selectDetail(kpi.key)} className={`rounded-3xl bg-white p-5 text-left shadow-soft ring-1 transition hover:-translate-y-0.5 hover:ring-activeBlue ${activeDetail === kpi.key ? 'ring-activeBlue bg-blue-50' : 'ring-slate-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-500">{kpi.label}</div>
                <div className="text-xs text-slate-400">{kpi.zh}</div>
              </div>
              <Badge tone={kpi.tone}>{kpi.trend}</Badge>
            </div>
            <div className="mt-4 text-4xl font-black tracking-tight text-slate-950">{kpi.value}</div>
            <div className="mt-2 text-xs font-bold text-activeBlue">Click to view details / 点击查看明细</div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <SectionCard title="Dashboard Detail Records / 仪表盘明细记录" subtitle={`Current detail: ${activeDetail}. Numbers above are clickable and open matching records. / 当前明细：${activeDetail}，上方数字可点击查看对应记录。`}>
          {loading ? <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">Loading... / 加载中...</div> : <DetailTable rows={rows} />}
        </SectionCard>
      </div>
    </div>
  );
}
