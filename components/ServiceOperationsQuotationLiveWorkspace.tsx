'use client';

import { FormEvent, useState } from 'react';

type Result = Record<string, unknown> | null;
type State = { loading: boolean; error: string | null; result: Result };

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

async function submitQuotation(payload: Record<string, string>) {
  const res = await fetch('/api/admin/service-operations/quotation-live', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; quotation?: Result; result?: Result } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Quotation Live API is not connected yet (${res.status}).`);
  return json?.quotation ?? json?.result ?? null;
}

export function ServiceOperationsQuotationLiveWorkspace() {
  const [serviceRequestId, setServiceRequestId] = useState('');
  const [jobId, setJobId] = useState('');
  const [inspectionId, setInspectionId] = useState('');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [amount, setAmount] = useState('');
  const [warrantyYears, setWarrantyYears] = useState('');
  const [action, setAction] = useState('draft');
  const [state, setState] = useState<State>({ loading: false, error: null, result: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceRequestId.trim() && !jobId.trim()) {
      setState({ loading: false, error: 'Service Request ID or Job ID is required. / 必须输入服务请求 ID 或工单 ID。', result: null });
      return;
    }
    setState({ loading: true, error: null, result: null });
    try {
      const result = await submitQuotation({ service_request_id: serviceRequestId.trim(), job_id: jobId.trim(), inspection_id: inspectionId.trim(), quotation_title: title.trim(), scope_of_work: scope.trim(), amount: amount.trim(), accepted_warranty_years: warrantyYears.trim(), action });
      setState({ loading: false, error: null, result });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), result: null });
    }
  }

  return (
    <section id="quotation-live-workspace" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E.2 / Quotation Live</div>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Quotation Live Workspace / 报价真实工作区</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">Create, revise or submit quotations after inspection. This workspace must connect to the existing Customer Portal quotation acceptance chain and must not show fake quotation success. / 查验后创建、修订或提交报价；本区必须连接客户门户报价接受链路，不能显示假报价成功。</p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input value={serviceRequestId} onChange={(event) => setServiceRequestId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Job ID<input value={jobId} onChange={(event) => setJobId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Inspection ID<input value={inspectionId} onChange={(event) => setInspectionId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Action<select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"><option value="draft">Draft / 草稿</option><option value="submit_for_approval">Submit Approval / 提交审批</option><option value="revise">Revise / 修订</option><option value="approve">Approve / 批准</option><option value="reject">Reject / 拒绝</option></select></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Quotation Title<input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="e.g. No-hacking leakage repair quotation / 例如免拆漏水维修报价" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Scope of Work<textarea value={scope} onChange={(event) => setScope(event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Scope / 工程范围" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Quotation amount / 报价金额" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Warranty Years<input value={warrantyYears} onChange={(event) => setWarrantyYears(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Accepted warranty years / 保修年限" /></label>
        <div className="md:col-span-2"><button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Submitting… / 提交中…' : 'Save Quotation / 保存报价'}</button></div>
      </form>

      {state.error ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Live quotation API blocked or not connected: {state.error}<br />Next required endpoint: /api/admin/service-operations/quotation-live</div> : null}
      {state.result ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-950 ring-1 ring-emerald-200">Quotation saved by live API. / 报价已由真实 API 保存。<br />Quotation ID: {text(state.result.quotation_id)} / Status: {text(state.result.status)}</div> : null}

      <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-200">
        Production rule / 生产规则：Quotation workflow must write quotation versions, approval status, customer-visible document state, accepted_warranty_years lock and audit logs. / 报价流程必须写入报价版本、审批状态、客户可见文件状态、accepted_warranty_years 锁定和审计日志。
      </div>
    </section>
  );
}
