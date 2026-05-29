'use client';

import { useEffect, useState } from 'react';

type PaymentIntent = Record<string, unknown>;
type State = { loading: boolean; error: string | null; intents: PaymentIntent[] };

async function fetchPaymentIntents() {
  const response = await fetch('/api/customer-portal/payment-intents?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; payment_intents?: PaymentIntent[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; payment_intents?: PaymentIntent[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer payment intents API returned ${response.status}`);
  return Array.isArray(payload?.payment_intents) ? payload.payment_intents : [];
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

function statusText(status: unknown) {
  if (status === 'pending_invoice') return 'Pending invoice / 等待发票';
  if (status === 'pending_payment_link') return 'Preparing payment link / 正在准备付款链接';
  if (status === 'ready') return 'Ready to pay / 可以付款';
  if (status === 'paid') return 'Paid / 已付款';
  if (status === 'cancelled') return 'Cancelled / 已取消';
  if (status === 'failed') return 'Failed / 失败';
  return formatValue(status);
}

export function CustomerPortalPaymentIntentStatus() {
  const [state, setState] = useState<State>({ loading: true, error: null, intents: [] });

  async function load() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const intents = await fetchPaymentIntents();
      setState({ loading: false, error: null, intents });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), intents: [] });
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section id="payment-intents" className="scroll-mt-28 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Payment Intent Status / 付款意图状态</div>
          <h2 className="mt-1 text-xl font-black text-slate-950">Invoice & Payment Link Preparation</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">After accepting a quotation, NANOFIX Finance prepares the invoice and payment link here. / 接受报价后，NANOFIX 财务会在这里准备发票和付款链接。</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
      </div>

      {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
      {!state.error && state.loading ? <div className="mt-5 rounded-3xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading payment intent status… / 正在读取付款意图状态…</div> : null}
      {!state.loading && !state.error && !state.intents.length ? <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No payment intent yet. Accept a quotation first. / 暂无付款意图，请先接受报价。</div> : null}

      <div className="mt-5 grid gap-3">
        {state.intents.map((intent) => {
          const paymentUrl = typeof intent.payment_url === 'string' ? intent.payment_url : '';
          return (
            <article key={String(intent.payment_intent_id)} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-950">{formatValue(intent.payment_intent_id)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{statusText(intent.status)} · {formatValue(intent.currency)} {formatValue(intent.amount)}</div>
                  <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                    <div>Quotation / 报价: {formatValue(intent.quotation_id)}</div>
                    <div>Invoice / 发票: {formatValue(intent.invoice_id)}</div>
                    <div>Provider / 付款渠道: {formatValue(intent.provider)}</div>
                    <div>Updated / 更新: {formatValue(intent.updated_at)}</div>
                  </div>
                </div>
                {paymentUrl && intent.status === 'ready' ? <a href={paymentUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700">Pay Now / 立即付款</a> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
