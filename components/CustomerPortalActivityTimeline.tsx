'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type ActivityPayload = {
  ok?: boolean;
  error?: string;
  payment_status_summary?: Row;
  activity_timeline?: Row[];
};

type State = { loading: boolean; error: string | null; payload: ActivityPayload | null };

async function loadActivityTimeline() {
  const response = await fetch('/api/customer-portal/activity-timeline?limit=40', {
    credentials: 'same-origin',
    cache: 'no-store'
  });

  const text = await response.text();
  let payload: ActivityPayload | null = null;
  try { payload = text ? JSON.parse(text) as ActivityPayload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer activity timeline API returned ${response.status}`);
  return payload ?? { ok: true };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    }
    return value;
  }
  return JSON.stringify(value);
}

function money(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return 'SGD 0';
  return `SGD ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function statusTone(status: unknown) {
  const text = String(status ?? '').toLowerCase();
  if (['paid', 'succeeded', 'success', 'completed', 'reconciled', 'settled'].some((item) => text.includes(item))) return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (['declined', 'failed', 'cancelled', 'canceled', 'void', 'overdue'].some((item) => text.includes(item))) return 'bg-red-50 text-red-800 ring-red-200';
  if (['revision', 'pending', 'open', 'draft'].some((item) => text.includes(item))) return 'bg-amber-50 text-amber-800 ring-amber-200';
  return 'bg-blue-50 text-activeBlue ring-blue-100';
}

function SummaryCard({ label, zh, value }: { label: string; zh: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-xs font-bold text-activeBlue">{zh}</div>
      <div className="mt-3 text-xl font-black text-slate-950">{value}</div>
    </div>
  );
}

export function CustomerPortalActivityTimeline() {
  const [state, setState] = useState<State>({ loading: true, error: null, payload: null });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await loadActivityTimeline();
      setState({ loading: false, error: null, payload });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), payload: null });
    }
  }

  useEffect(() => { void refresh(); }, []);

  const summary = state.payload?.payment_status_summary ?? {};
  const timeline = Array.isArray(state.payload?.activity_timeline) ? state.payload.activity_timeline : [];

  return (
    <section id="activity-timeline" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Payment Status & Activity Timeline</div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Real Payment Status + Document Activity</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Track customer-visible invoice payment status, payment link opens, PDF download activity, quotation responses and document lifecycle events in one secure customer timeline. / 集中查看客户可见发票付款状态、付款链接打开、PDF 下载、报价回复和文件生命周期记录。</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh Timeline / 刷新时间线'}</button>
      </div>

      {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <SummaryCard label="Outstanding" zh="未结金额" value={money(summary.outstanding_amount)} />
        <SummaryCard label="Paid" zh="已付金额" value={money(summary.paid_amount)} />
        <SummaryCard label="Open Invoices" zh="未结发票" value={formatValue(summary.open_invoice_count)} />
        <SummaryCard label="Payment Records" zh="付款记录" value={formatValue(summary.payment_record_count)} />
      </div>

      <div className="mt-6 grid gap-3">
        {!timeline.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer activity timeline yet. / 暂无客户活动时间线。</div> : null}
        {timeline.map((item, index) => (
          <article key={String(item.event_id ?? index)} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-950">{formatValue(item.title)}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">{formatValue(item.created_at)} · {formatValue(item.source)}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusTone(item.status)}`}>{formatValue(item.status)}</span>
            </div>
            <dl className="mt-3 grid gap-2 text-xs md:grid-cols-4">
              <div><dt className="font-black uppercase tracking-[0.08em] text-slate-400">event_type</dt><dd className="mt-1 font-semibold text-slate-700">{formatValue(item.event_type)}</dd></div>
              <div><dt className="font-black uppercase tracking-[0.08em] text-slate-400">object_type</dt><dd className="mt-1 font-semibold text-slate-700">{formatValue(item.object_type)}</dd></div>
              <div><dt className="font-black uppercase tracking-[0.08em] text-slate-400">object_id</dt><dd className="mt-1 font-semibold text-slate-700">{formatValue(item.object_id)}</dd></div>
              <div><dt className="font-black uppercase tracking-[0.08em] text-slate-400">amount</dt><dd className="mt-1 font-semibold text-slate-700">{item.amount === null || item.amount === undefined ? '—' : money(item.amount)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
