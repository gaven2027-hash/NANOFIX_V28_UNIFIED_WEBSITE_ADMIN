'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; requests: Row[]; result: Row | null };
type Values = {
  request_type: string;
  related_warranty_id: string;
  related_job_id: string;
  title: string;
  issue_location: string;
  issue_description: string;
  preferred_schedule: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  attachment_urls_text: string;
};

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

async function fetchRequests() {
  const response = await fetch('/api/customer-portal/requests?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; requests?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; requests?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Requests API returned ${response.status}`);
  return Array.isArray(payload?.requests) ? payload.requests : [];
}

async function submitRequest(values: Values) {
  const attachment_urls = values.attachment_urls_text.split('\n').map((line) => line.trim()).filter(Boolean);
  const response = await fetch('/api/customer-portal/requests', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...values, attachment_urls })
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Request submit API returned ${response.status}`);
  return payload ?? { ok: true };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  return String(value);
}

export function CustomerPortalRequestForm() {
  const [values, setValues] = useState<Values>({ request_type: 'new_repair', related_warranty_id: '', related_job_id: '', title: '', issue_location: '', issue_description: '', preferred_schedule: '', contact_name: '', contact_phone: '', contact_email: '', attachment_urls_text: '' });
  const [state, setState] = useState<State>({ loading: true, error: null, message: null, requests: [], result: null });

  function change(key: keyof Values, value: string) { setValues((current) => ({ ...current, [key]: value })); }

  async function load() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const requests = await fetchRequests();
      setState((current) => ({ ...current, loading: false, error: null, requests }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await submitRequest(values);
      const requests = await fetchRequests();
      setState({ loading: false, error: null, message: 'Request submitted into NANOFIX Service Operations. / 已提交并进入 NANOFIX 原工单处理流程。', requests, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Submit Request / 提交维修</div>
        <h1 className="mt-2 text-2xl font-black text-slate-950">New Repair / Warranty Repair Request</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">All new repair and warranty repair submissions enter the same NANOFIX Service Operations workflow for review, scheduling and job handling. / 所有新报修和保修期内维修都会进入同一个 NANOFIX 工单处理流程，方便统一审核、安排和处理。</p>
      </section>

      <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Request Type / 类型<select className={inputClass} value={values.request_type} onChange={(event) => change('request_type', event.target.value)}><option value="new_repair">New Repair / 新报修</option><option value="warranty_repair">Warranty Repair / 保修期内维修</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Related Warranty ID / 关联保修ID<input className={inputClass} value={values.related_warranty_id} onChange={(event) => change('related_warranty_id', event.target.value)} placeholder="Required for warranty repair" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Related Job ID / 关联工单ID<input className={inputClass} value={values.related_job_id} onChange={(event) => change('related_job_id', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Title / 标题<input className={inputClass} value={values.title} onChange={(event) => change('title', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Issue Location / 问题位置<input className={inputClass} value={values.issue_location} onChange={(event) => change('issue_location', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Preferred Schedule / 期望时间<input className={inputClass} value={values.preferred_schedule} onChange={(event) => change('preferred_schedule', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Contact Name / 联系人<input className={inputClass} value={values.contact_name} onChange={(event) => change('contact_name', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Contact Phone / 电话<input className={inputClass} value={values.contact_phone} onChange={(event) => change('contact_phone', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Contact Email / 邮箱<input className={inputClass} value={values.contact_email} onChange={(event) => change('contact_email', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Issue Description / 问题说明<textarea className={inputClass} rows={5} value={values.issue_description} onChange={(event) => change('issue_description', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Attachment URLs / 资料链接<textarea className={inputClass} rows={4} value={values.attachment_urls_text} onChange={(event) => change('attachment_urls_text', event.target.value)} placeholder="One URL per line / 每行一个图片或视频链接" /></label>
        </div>
        <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">Customer submissions become service requests in the original Service Operations workflow. Quotations, invoices and warranties are generated only by NANOFIX Admin templates. / 客户提交后会进入原工单流程；报价、发票和保修单只能由 NANOFIX 后台模板生成。</div>
        <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Submit Request / 提交维修</button>
        {state.result ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
      </form>

      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-950">My Submitted Requests / 我的提交记录</h2><button type="button" onClick={() => void load()} disabled={state.loading} className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50 disabled:opacity-50">Refresh / 刷新</button></div>
        <div className="mt-4 grid gap-3">
          {!state.requests.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No requests yet. / 暂无提交记录。</div> : null}
          {state.requests.map((request) => <article key={String(request.portal_request_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-sm font-black text-slate-950">{formatValue(request.title)}</div><div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(request.request_type)} · {formatValue(request.status)}</div><div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600"><div>Service Request: {formatValue(request.created_service_request_id)}</div><div>Location: {formatValue(request.issue_location)}</div><div>Created: {formatValue(request.created_at)}</div></div></article>)}
        </div>
      </section>
    </div>
  );
}
