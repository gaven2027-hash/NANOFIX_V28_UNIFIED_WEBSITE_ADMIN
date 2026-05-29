'use client';

import { FormEvent, useEffect, useState } from 'react';

type PaymentIntent = Record<string, unknown>;
type State = { loading: boolean; error: string | null; intents: PaymentIntent[]; result: Record<string, unknown> | null };
type Values = { payment_intent_id: string; invoice_id: string; status: string; payment_url: string; provider: string; amount: string; expires_at: string; notes: string };

const statuses = ['pending_invoice', 'pending_payment_link', 'ready', 'paid', 'cancelled', 'failed'];
const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

async function fetchPaymentIntents() {
  const response = await fetch('/api/admin/service-operations/payment-intents?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; payment_intents?: PaymentIntent[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; payment_intents?: PaymentIntent[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Payment intents API returned ${response.status}`);
  return Array.isArray(payload?.payment_intents) ? payload.payment_intents : [];
}

async function updatePaymentIntent(values: Values) {
  const response = await fetch('/api/admin/service-operations/payment-intents', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'update_payment_intent',
      payment_intent_id: values.payment_intent_id,
      invoice_id: values.invoice_id,
      status: values.status,
      payment_url: values.payment_url,
      provider: values.provider,
      amount: values.amount,
      expires_at: values.expires_at,
      notes: values.notes
    })
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Payment intent update returned ${response.status}`);
  return payload ?? { ok: true };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  return String(value);
}

export function ServiceOperationsPaymentIntentPanel() {
  const [state, setState] = useState<State>({ loading: true, error: null, intents: [], result: null });
  const [values, setValues] = useState<Values>({ payment_intent_id: '', invoice_id: '', status: 'pending_payment_link', payment_url: '', provider: 'manual', amount: '', expires_at: '', notes: '' });

  async function load() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const intents = await fetchPaymentIntents();
      setState((current) => ({ ...current, loading: false, error: null, intents }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pick(intent: PaymentIntent) {
    setValues({
      payment_intent_id: String(intent.payment_intent_id ?? ''),
      invoice_id: String(intent.invoice_id ?? ''),
      status: String(intent.status ?? 'pending_payment_link'),
      payment_url: String(intent.payment_url ?? ''),
      provider: String(intent.provider ?? 'manual'),
      amount: String(intent.amount ?? ''),
      expires_at: String(intent.expires_at ?? ''),
      notes: ''
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, result: null }));
    try {
      const result = await updatePaymentIntent(values);
      const intents = await fetchPaymentIntents();
      setState({ loading: false, error: null, intents, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Finance Payment Intent / 财务付款意图</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Payment Intent Admin Panel</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">After a customer accepts a quotation, Finance links an invoice, fills the payment URL, and moves the payment intent status. This is a real database workflow with audit logs and customer notification queue. / 客户接受报价后，财务绑定发票、填写付款链接并推进付款意图状态；这是写入数据库、审计日志和客户通知队列的真实流程。</p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Latest Payment Intents / 最新付款意图</h3>
            <button type="button" onClick={() => void load()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {!state.intents.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No payment intents yet. / 暂无付款意图。</div> : null}
          {state.intents.map((intent) => (
            <button key={String(intent.payment_intent_id)} type="button" onClick={() => pick(intent)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">{formatValue(intent.payment_intent_id)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(intent.status)} · {formatValue(intent.currency)} {formatValue(intent.amount)}</div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">Pick / 选择</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Quotation: {formatValue(intent.quotation_id)}</div>
                <div>Invoice: {formatValue(intent.invoice_id)}</div>
                <div>Provider: {formatValue(intent.provider)}</div>
                <div>Updated: {formatValue(intent.updated_at)}</div>
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={(event) => void submit(event)} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Update Payment Intent / 更新付款意图</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Payment Intent ID<input className={inputClass} value={values.payment_intent_id} onChange={(event) => setValues((current) => ({ ...current, payment_intent_id: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Invoice ID<input className={inputClass} value={values.invoice_id} onChange={(event) => setValues((current) => ({ ...current, invoice_id: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Status<select className={inputClass} value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Payment URL<input className={inputClass} value={values.payment_url} onChange={(event) => setValues((current) => ({ ...current, payment_url: event.target.value }))} placeholder="Required when status=ready" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Provider<input className={inputClass} value={values.provider} onChange={(event) => setValues((current) => ({ ...current, provider: event.target.value }))} /></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Amount<input className={inputClass} value={values.amount} onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))} /></label>
          </div>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Expires At<input className={inputClass} value={values.expires_at} onChange={(event) => setValues((current) => ({ ...current, expires_at: event.target.value }))} placeholder="2026-06-30T12:00:00+08:00" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Finance Notes<textarea className={inputClass} value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} rows={3} /></label>
          <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Save Payment Intent / 保存付款意图</button>
          {state.result ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>
      </div>
    </section>
  );
}
