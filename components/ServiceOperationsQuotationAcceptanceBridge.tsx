'use client';

import { FormEvent, useState } from 'react';

type Result = Record<string, unknown> | null;
type State = { loading: boolean; error: string | null; result: Result };

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

async function loadBridge(payload: Record<string, string>) {
  const res = await fetch('/api/admin/service-operations/quotation-acceptance-bridge', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; bridge?: Result; result?: Result } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Quotation Acceptance Bridge API is not connected yet (${res.status}).`);
  return json?.bridge ?? json?.result ?? null;
}

export function ServiceOperationsQuotationAcceptanceBridge() {
  const [quotationId, setQuotationId] = useState('');
  const [serviceRequestId, setServiceRequestId] = useState('');
  const [action, setAction] = useState('check_status');
  const [state, setState] = useState<State>({ loading: false, error: null, result: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quotationId.trim() && !serviceRequestId.trim()) {
      setState({ loading: false, error: 'Quotation ID or Service Request ID is required. / 必须输入报价 ID 或服务请求 ID。', result: null });
      return;
    }
    setState({ loading: true, error: null, result: null });
    try {
      const result = await loadBridge({ quotation_id: quotationId.trim(), service_request_id: serviceRequestId.trim(), action });
      setState({ loading: false, error: null, result });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), result: null });
    }
  }

  return (
    <section id="quotation-acceptance-bridge" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E.2.1 / Customer Acceptance Bridge</div>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Quotation Acceptance Bridge / 报价客户接受桥接</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">Bridge internal quotation workflow with Customer Portal quotation acceptance. Accepted quotations should trigger invoice preparation and warranty-year lock without editing customer-side records. / 连接内部报价流程和客户门户报价接受；客户接受后应触发发票准备和保修年限锁定，不允许客户侧修改正式记录。</p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 md:grid-cols-3">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Quotation ID<input value={quotationId} onChange={(event) => setQuotationId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input value={serviceRequestId} onChange={(event) => setServiceRequestId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Bridge Action<select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"><option value="check_status">Check Acceptance Status / 查看接受状态</option><option value="prepare_invoice">Prepare Invoice / 准备发票</option><option value="lock_warranty_years">Lock Warranty Years / 锁定保修年限</option><option value="sync_customer_portal">Sync Customer Portal / 同步客户门户</option></select></label>
        <div className="md:col-span-3"><button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Checking… / 检查中…' : 'Run Bridge Check / 执行桥接检查'}</button></div>
      </form>

      {state.error ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Live acceptance bridge API blocked or not connected: {state.error}<br />Next required endpoint: /api/admin/service-operations/quotation-acceptance-bridge</div> : null}
      {state.result ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-950 ring-1 ring-emerald-200">Bridge result from live API. / 桥接结果来自真实 API。<br />Quotation: {text(state.result.quotation_id)} / Acceptance: {text(state.result.acceptance_status)} / Invoice: {text(state.result.invoice_status)} / Warranty Years: {text(state.result.accepted_warranty_years)}</div> : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['1', 'Customer accepts quotation / 客户接受报价'],
          ['2', 'accepted_warranty_years locked / 保修年限锁定'],
          ['3', 'Invoice preparation starts / 发票准备开始'],
          ['4', 'Warranty auto-generation waits for job completion / 保修等待工单完成后自动生成']
        ].map(([step, label]) => (
          <div key={step} className="rounded-2xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200"><div className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-activeBlue text-white">{step}</div>{label}</div>
        ))}
      </div>
    </section>
  );
}
