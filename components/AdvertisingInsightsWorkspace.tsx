'use client';

import { useEffect, useState } from 'react';
import { SectionCard } from './SectionCard';
import { Badge } from './Badge';

type Row = Record<string, unknown>;
const barBase = 'h-2 rounded-full bg-activeBlue';
function num(value: unknown) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function money(value: unknown) { return `$${num(value).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`; }
function pct(value: unknown) { return `${(num(value) * 100).toFixed(1)}%`; }
function ratio(value: unknown) { return `${num(value).toFixed(2)}x`; }
function text(value: unknown, fallback = '—') { return value === null || value === undefined || value === '' ? fallback : String(value); }
function tone(value: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' { const t = String(value || '').toLowerCase(); if (t.includes('high') || t.includes('critical') || t.includes('low_roas')) return 'red'; if (t.includes('watch') || t.includes('cpl')) return 'amber'; if (t.includes('google') || t.includes('meta') || t.includes('tiktok')) return 'cyan'; return 'blue'; }
function maxOf(rows: Row[], key: string) { return Math.max(1, ...rows.map((row) => num(row[key]))); }

export function AdvertisingInsightsWorkspace() {
  const [total, setTotal] = useState<Row>({});
  const [byPlatform, setByPlatform] = useState<Row[]>([]);
  const [byDate, setByDate] = useState<Row[]>([]);
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [fallback, setFallback] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function loadInsights() {
    const response = await fetch('/api/admin/advertising-center/insights', { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) return setMessage(json.error || 'Unable to load insights. / 无法加载广告分析。');
    setTotal(json.total || {});
    setByPlatform(json.byPlatform || []);
    setByDate(json.byDate || []);
    setAlerts(json.alerts || []);
    setFallback(json.fallback || null);
  }
  useEffect(() => { void loadInsights(); }, []);
  const maxSpend = maxOf(byPlatform, 'spend');
  const maxDailySpend = maxOf(byDate, 'spend');

  return <div className="space-y-5"><SectionCard title="Advertising ROI Insights / 广告 ROI 分析" subtitle="Compare spend, leads, bookings, revenue, ROAS, ROI and risk alerts from imported daily performance. / 根据导入日报对比花费、线索、预约、收款、ROAS、ROI 和风险预警。"><div className="grid gap-3 md:grid-cols-6"><div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-blue-900">{money(total.spend)}</div><div className="text-xs font-bold text-blue-700">Spend / 花费</div></div><div className="rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100"><div className="text-2xl font-black text-cyan-900">{text(total.leads, '0')}</div><div className="text-xs font-bold text-cyan-700">Leads / 线索</div></div><div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-900">{text(total.bookings, '0')}</div><div className="text-xs font-bold text-emerald-700">Bookings / 预约</div></div><div className="rounded-2xl bg-green-50 p-4 ring-1 ring-green-100"><div className="text-2xl font-black text-green-900">{money(total.revenue)}</div><div className="text-xs font-bold text-green-700">Revenue / 收款</div></div><div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-900">{money(total.cpl)}</div><div className="text-xs font-bold text-amber-700">CPL / 线索成本</div></div><div className="rounded-2xl bg-slate-950 p-4 text-white"><div className="text-2xl font-black">{ratio(total.roas)}</div><div className="text-xs font-bold text-slate-300">ROAS / 广告回报</div></div></div>{fallback ? <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 ring-1 ring-amber-100">Fallback mode: {fallback} / 数据表未准备好时显示示例分析。</div> : null}</SectionCard>{message ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">{message}</div> : null}<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]"><SectionCard title="Platform Comparison / 分平台对比" subtitle="Spend, leads, ROAS and ROI by platform. / 按平台对比花费、线索、ROAS 和 ROI。"><div className="space-y-3">{byPlatform.map((row) => <div key={String(row.key)} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="flex items-center justify-between gap-3"><div className="font-black text-slate-900">{text(row.key)}</div><Badge tone={tone(row.key)}>{ratio(row.roas)} ROAS</Badge></div><div className="mt-3 grid gap-2 text-xs font-bold text-slate-600 md:grid-cols-4"><div>Spend: {money(row.spend)}</div><div>Leads: {text(row.leads, '0')}</div><div>CPL: {money(row.cpl)}</div><div>ROI: {pct(row.roi)}</div></div><div className="mt-3 h-2 rounded-full bg-slate-200"><div className={barBase} style={{ width: `${Math.max(4, Math.min(100, (num(row.spend) / maxSpend) * 100))}%` }} /></div></div>)}{!byPlatform.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No platform data yet. / 暂无平台数据。</div> : null}</div></SectionCard><SectionCard title="Risk Alerts / 风险预警" subtitle="High spend, low leads, high CPL or low ROAS. / 高花费、低线索、高 CPL 或低 ROAS。"><div className="space-y-2">{alerts.map((alert, index) => <div key={index} className="rounded-2xl bg-red-50 p-3 ring-1 ring-red-100"><div className="flex items-center justify-between gap-2"><div className="text-sm font-black text-red-900">{text(alert.message)}</div><Badge tone={tone(alert.level)}>{text(alert.level)}</Badge></div><div className="mt-1 text-xs font-bold text-red-700">{text(alert.date)} · {text(alert.platform)} · Spend {money(alert.spend)}</div></div>)}{!alerts.length ? <div className="rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700 ring-1 ring-green-100">No high-risk advertising alerts. / 暂无高风险广告预警。</div> : null}</div></SectionCard></div><SectionCard title="Daily Trend / 每日趋势" subtitle="Imported daily performance trend. / 已导入每日表现趋势。"><div className="space-y-3">{byDate.map((row) => <div key={String(row.key)} className="grid gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 md:grid-cols-[120px_minmax(0,1fr)_220px]"><div className="font-black text-slate-900">{text(row.key)}</div><div><div className="h-2 rounded-full bg-slate-200"><div className={barBase} style={{ width: `${Math.max(4, Math.min(100, (num(row.spend) / maxDailySpend) * 100))}%` }} /></div></div><div className="text-xs font-bold text-slate-600">Spend {money(row.spend)} · Leads {text(row.leads)} · ROAS {ratio(row.roas)}</div></div>)}{!byDate.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No daily trend data yet. / 暂无每日趋势数据。</div> : null}</div></SectionCard></div>;
}
