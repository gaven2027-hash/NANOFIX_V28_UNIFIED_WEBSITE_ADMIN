'use client';

import { FormEvent, useEffect, useState } from 'react';

type CheckoutSession = Record<string, unknown>;
type State = { loading: boolean; error: string | null; sessions: CheckoutSession[]; result: Record<string, unknown> | null };
type Values = { payment_intent_id: string; provider: string; provider_external_id: string; payment_url: string; amount: string; currency: string; success_url: string; cancel_url: string };

const providers = ['manual', 'stripe', 'hitpay'];
const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

async function fetchSessions() {
  const response = await fetch('/api/admin/service-operations/payment-checkout-sessions?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; checkout_sessions?: CheckoutSession[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; checkout_sessions?: CheckoutSession[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Checkout sessions API returned ${response.status}`);
  return Array.isArray(payload?.checkout_sessions) ? payload.checkout_sessions : [];
}

async function createCheckoutSession(values: Values) {
  const response = await fetch('/api/admin/service-operations/payment-checkout-sessions', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'create_checkout_session',
      payment_intent_id: values.payment_intent_id,
      provider: values.provider,
      provider_external_id: values.provider_external_id,
      payment_url: values.payment_url,
      amount: values.amount,
      currency: values.currency,
      success_url: values.success_url,
      cancel_url: values.cancel_url
    })
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Checkout session create returned ${response.status}`);
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

export function ServiceOperationsCheckoutSessionPanel() {
  const [state, setState] = useState<State>({ loading: true, error: null, sessions: [], result: null });
  const [values, setValues] = useState<Values>({ payment_intent_id: '', provider: 'manual', provider_external_id: '', payment_url: '', amount: '', currency: 'SGD', success_url: '', cancel_url: '' });

  async function load() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const sessions = await fetchSessions();
      setState((current) => ({ ...current, loading: false, error: null, sessions }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pick(session: CheckoutSession) {
    setValues((current) => ({
      ...current,
      payment_intent_id: String(session.payment_intent_id ?? current.payment_intent_id),
      provider: String(session.provider ?? current.provider),
      provider_external_id: String(session.provider_external_id ?? ''),
      payment_url: String(session.payment_url ?? ''),
      amount: String(session.amount ?? ''),
      currency: String(session.currency ?? 'SGD'),
      success_url: String(session.success_url ?? ''),
      cancel_url: String(session.cancel_url ?? '')
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, result: null }));
    try {
      const result = await createCheckoutSession(values);
      const sessions = await fetchSessions();
      setState({ loading: false, error: null, sessions, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Payment Checkout Session / 付款链接生成</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Checkout Session Generator</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Generate or register a payment link for a payment intent. Manual links are supported now; Stripe/HitPay adapters are guarded until provider signing is completed. This never marks payment as paid. / 为付款意图生成或登记付款链接。当前支持 manual 链接；Stripe/HitPay 在完成网关签名前受保护，不会假生成付款成功。</p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={(event) => void submit(event)} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Create Checkout Session / 创建付款链接</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Payment Intent ID<input className={inputClass} value={values.payment_intent_id} onChange={(event) => setValues((current) => ({ ...current, payment_intent_id: event.target.value }))} /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Provider<select className={inputClass} value={values.provider} onChange={(event) => setValues((current) => ({ ...current, provider: event.target.value }))}>{providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Currency<input className={inputClass} value={values.currency} onChange={(event) => setValues((current) => ({ ...current, currency: event.target.value }))} /></label>
          </div>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Provider External ID<input className={inputClass} value={values.provider_external_id} onChange={(event) => setValues((current) => ({ ...current, provider_external_id: event.target.value }))} placeholder="manual reference / checkout session id" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Payment URL<input className={inputClass} value={values.payment_url} onChange={(event) => setValues((current) => ({ ...current, payment_url: event.target.value }))} placeholder="Required for manual provider" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Amount<input className={inputClass} value={values.amount} onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))} /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Success URL<input className={inputClass} value={values.success_url} onChange={(event) => setValues((current) => ({ ...current, success_url: event.target.value }))} /></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Cancel URL<input className={inputClass} value={values.cancel_url} onChange={(event) => setValues((current) => ({ ...current, cancel_url: event.target.value }))} /></label>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">Important / 重要：This creates a checkout/payment link only. Payment status becomes paid only through webhook or reconciliation. / 这里只生成付款链接，不会把付款标记为成功。</div>
          <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Create Checkout Session / 生成付款链接</button>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.result ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>

        <div className="grid h-fit gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Latest Checkout Sessions / 最新付款链接记录</h3>
            <button type="button" onClick={() => void load()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
          </div>
          {!state.sessions.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No checkout sessions yet. / 暂无付款链接记录。</div> : null}
          {state.sessions.map((session) => (
            <button key={String(session.checkout_session_id)} type="button" onClick={() => pick(session)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">{formatValue(session.checkout_session_id)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(session.provider)} · {formatValue(session.status)} · {formatValue(session.currency)} {formatValue(session.amount)}</div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">Pick / 选择</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Payment Intent: {formatValue(session.payment_intent_id)}</div>
                <div>External ID: {formatValue(session.provider_external_id)}</div>
                <div>Created: {formatValue(session.created_at)}</div>
                <div>Updated: {formatValue(session.updated_at)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
