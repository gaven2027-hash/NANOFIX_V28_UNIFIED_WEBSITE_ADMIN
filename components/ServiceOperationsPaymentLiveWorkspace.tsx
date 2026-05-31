'use client';

import { FormEvent, useState } from 'react';

type Result = Record<string, unknown> | null;
type State = { loading: boolean; error: string | null; result: Result };

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

async function submitPayment(payload: Record<string, string>) {
  const res = await fetch('/api/admin/service-operations/payment-live', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; payment?: Result; result?: Result } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Payment Live API is not connected yet (${res.status}).`);
  return json?.payment ?? json?.result ?? null;
}

export function ServiceOperationsPaymentLiveWorkspace() {
  const [invoiceId, setInvoiceId] = useState('');
  const [serviceRequestId, setServiceRequestId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('paynow');
  const [action, setAction] = useState('create_intent');
  const [reference, setReference] = useState('');
  const [state, setState] = useState<State>({ loading: false, error: null, result: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoiceId.trim() && !serviceRequestId.trim()) {
      setState({ loading: false, error: 'Invoice ID or Service Request ID is required. / 必须输入发票 ID 或服务请求 ID。', result: null });
      return;
    }
    setState({ loading: true, error: null, result: null });
    try {
      const result = await submitPayment({ invoice_id: invoiceId.trim(), service_request_id: serviceRequestId.trim(), amount: amount.trim(), payment_method: method, action, reference: reference.trim() });
      setState({ loading: false, error: null, result });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), result: null });
    }
  }

  return (
    <section id="payment-live-workspace" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E.4 / Payment Live</div>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Payment Live Workspace / 付款真实工作区</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">Create payment intent, reconcile payment status and prepare receipts after invoice issue. This workspace must use a guarded server API and must not show fake paid status. / 发票开具后创建付款意图、对账付款状态并准备收据；本区必须使用受保护服务端 API，不能显示假付款成功。</p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 md:grid-cols-3">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Invoice ID<input value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input value={serviceRequestId} onChange={(event) => setServiceRequestId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Action<select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"><option value="create_intent">Create Payment Intent / 创建付款意图</option><option value="create_link">Create Payment Link / 创建付款链接</option><option value="mark_paid">Mark Paid / 标记已付款</option><option value="partial_paid">Partial Paid / 部分付款</option><option value="refund">Refund / 退款</option><option value="failed">Failed / 失败</option></select></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Payment amount / 付款金额" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Payment Method<select value={method} onChange={(event) => setMethod(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"><option value="paynow">PayNow / PayNow</option><option value="bank_transfer">Bank Transfer / 银行转账</option><option value="card">Card / 银行卡</option><option value="cash">Cash / 现金</option><option value="other">Other / 其他</option></select></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Reference<input value={reference} onChange={(event) => setReference(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Transaction reference / 交易参考号" /></label>
        <div className="md:col-span-3"><button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Submitting… / 提交中…' : 'Save Payment Action / 保存付款操作'}</button></div>
      </form>

      {state.error ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Live payment API blocked or not connected: {state.error}<br />Next required endpoint: /api/admin/service-operations/payment-live</div> : null}
      {state.result ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-950 ring-1 ring-emerald-200">Payment action saved by live API. / 付款操作已由真实 API 保存。<br />Payment ID: {text(state.result.payment_id)} / Status: {text(state.result.status)}</div> : null}

      <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-200">
        Production rule / 生产规则：Payment workflow must write payments, payment events, receipt readiness, invoice status update and audit logs. / 付款流程必须写入付款记录、付款事件、收据准备状态、发票状态更新和审计日志。
      </div>
    </section>
  );
}
