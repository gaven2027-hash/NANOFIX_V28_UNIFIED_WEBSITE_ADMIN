'use client';

import { FormEvent, useState } from 'react';

type Result = Record<string, unknown> | null;
type State = { loading: boolean; error: string | null; result: Result };

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

async function submitInvoice(payload: Record<string, string>) {
  const res = await fetch('/api/admin/service-operations/invoice-live', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; invoice?: Result; result?: Result } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Invoice Live API is not connected yet (${res.status}).`);
  return json?.invoice ?? json?.result ?? null;
}

export function ServiceOperationsInvoiceLiveWorkspace() {
  const [quotationId, setQuotationId] = useState('');
  const [serviceRequestId, setServiceRequestId] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [customerVisible, setCustomerVisible] = useState('yes');
  const [action, setAction] = useState('draft');
  const [state, setState] = useState<State>({ loading: false, error: null, result: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quotationId.trim() && !serviceRequestId.trim()) {
      setState({ loading: false, error: 'Quotation ID or Service Request ID is required. / 必须输入报价 ID 或服务请求 ID。', result: null });
      return;
    }
    setState({ loading: true, error: null, result: null });
    try {
      const result = await submitInvoice({ quotation_id: quotationId.trim(), service_request_id: serviceRequestId.trim(), invoice_title: invoiceTitle.trim(), amount: amount.trim(), due_date: dueDate.trim(), customer_visible: customerVisible, action });
      setState({ loading: false, error: null, result });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), result: null });
    }
  }

  return (
    <section id="invoice-live-workspace" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E.3 / Invoice Live</div>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Invoice Live Workspace / 发票真实工作区</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">Prepare, approve and issue invoices after customer quotation acceptance. This workspace must use a guarded server API and must not show fake invoice success. / 客户接受报价后准备、审批和开具发票；本区必须使用受保护服务端 API，不能显示假发票成功。</p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 md:grid-cols-3">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Quotation ID<input value={quotationId} onChange={(event) => setQuotationId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input value={serviceRequestId} onChange={(event) => setServiceRequestId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Action<select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"><option value="draft">Draft / 草稿</option><option value="approve">Approve / 批准</option><option value="issue">Issue / 开具</option><option value="mark_sent">Mark Sent / 标记已发送</option><option value="void">Void / 作废</option></select></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Invoice Title<input value={invoiceTitle} onChange={(event) => setInvoiceTitle(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="e.g. Leak repair invoice / 例如漏水维修发票" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Invoice amount / 发票金额" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Due Date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Customer Visible<select value={customerVisible} onChange={(event) => setCustomerVisible(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"><option value="yes">Yes / 客户可见</option><option value="no">No / 暂不显示</option></select></label>
        <div className="md:col-span-3"><button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Submitting… / 提交中…' : 'Save Invoice / 保存发票'}</button></div>
      </form>

      {state.error ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Live invoice API blocked or not connected: {state.error}<br />Next required endpoint: /api/admin/service-operations/invoice-live</div> : null}
      {state.result ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-950 ring-1 ring-emerald-200">Invoice saved by live API. / 发票已由真实 API 保存。<br />Invoice ID: {text(state.result.invoice_id)} / Status: {text(state.result.status)}</div> : null}

      <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-200">
        Production rule / 生产规则：Invoice workflow must write invoices, customer visibility state, PDF status, payment intent readiness and audit logs. / 发票流程必须写入发票、客户可见状态、PDF 状态、付款准备状态和审计日志。
      </div>
    </section>
  );
}
