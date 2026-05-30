'use client';

import { FormEvent, useEffect, useState } from 'react';

type ServiceRequest = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; requests: ServiceRequest[]; result: Record<string, unknown> | null };
type Values = {
  request_type: string;
  related_warranty_id: string;
  contact_name: string;
  phone: string;
  email: string;
  address_text: string;
  postal_code: string;
  issue_type: string;
  leak_location: string;
  issue_description: string;
  preferred_schedule: string;
  customer_notes: string;
  attachment_urls_text: string;
};

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const defaults: Values = { request_type: 'new_repair', related_warranty_id: '', contact_name: '', phone: '', email: '', address_text: '', postal_code: '', issue_type: '', leak_location: '', issue_description: '', preferred_schedule: '', customer_notes: '', attachment_urls_text: '' };

async function fetchRequests() {
  const response = await fetch('/api/customer-portal/service-requests?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; service_requests?: ServiceRequest[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; service_requests?: ServiceRequest[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Service request API returned ${response.status}`);
  return Array.isArray(payload?.service_requests) ? payload.service_requests : [];
}

async function submitRequest(values: Values) {
  const attachment_urls = values.attachment_urls_text.split('\n').map((line) => line.trim()).filter(Boolean);
  const response = await fetch('/api/customer-portal/service-requests', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...values, attachment_urls })
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Service request submit returned ${response.status}`);
  return payload ?? { ok: true };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  return String(value);
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}<input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export function CustomerPortalServiceRequestSubmitter() {
  const [values, setValues] = useState<Values>(defaults);
  const [state, setState] = useState<State>({ loading: true, error: null, message: null, requests: [], result: null });

  function change(key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

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
      setValues(defaults);
      setState({ loading: false, error: null, message: 'Request submitted into NANOFIX unified Service Operations queue. / 已提交到 NANOFIX 统一工单处理入口。', requests, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Submit Repair / 提交维修</div>
        <h1 className="mt-2 text-2xl font-black text-slate-950">New Repair or Warranty Repair Request</h1>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">All new repair and warranty repair submissions enter the existing NANOFIX Unified Intake → Leads → Service Requests → Jobs workflow. The system labels whether it is a member customer new repair or warranty repair for admin review. / 所有新报修和保修期内维修都会进入原来的统一线索、报修、工单处理流程；系统只标记来源和类型，方便后台审核安排。</p>
        <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Customers can submit descriptions, preferred time and supporting file URLs only. Quotations, invoices and warranty documents are generated by NANOFIX Admin from templates and company settings. Customers cannot edit those documents; they can only leave feedback. / 客户只能提交说明、预约时间和资料链接；报价、发票、保修单由后台按模板和公司资料生成，客户不能修改，只能留言反馈。</div>
      </section>

      <form onSubmit={(event) => void submit(event)} className="grid gap-5 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Request Type / 类型<select className={inputClass} value={values.request_type} onChange={(event) => change('request_type', event.target.value)}><option value="new_repair">New Repair / 新报修</option><option value="warranty_repair">Warranty Repair / 保修期内维修</option></select></label>
          <Field label="Related Warranty ID / 关联保修ID" value={values.related_warranty_id} onChange={(value) => change('related_warranty_id', value)} placeholder="Required for warranty repair" />
          <Field label="Contact Name / 联系人" value={values.contact_name} onChange={(value) => change('contact_name', value)} />
          <Field label="Phone / 电话" value={values.phone} onChange={(value) => change('phone', value)} />
          <Field label="Email / 邮箱" value={values.email} onChange={(value) => change('email', value)} />
          <Field label="Postal Code / 邮编" value={values.postal_code} onChange={(value) => change('postal_code', value)} />
          <Field label="Address / 地址" value={values.address_text} onChange={(value) => change('address_text', value)} />
          <Field label="Leak Location / 漏水位置" value={values.leak_location} onChange={(value) => change('leak_location', value)} />
          <Field label="Issue Type / 问题类型" value={values.issue_type} onChange={(value) => change('issue_type', value)} />
          <Field label="Preferred Schedule / 期望预约时间" value={values.preferred_schedule} onChange={(value) => change('preferred_schedule', value)} />
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Issue Description / 问题说明<textarea className={inputClass} rows={5} value={values.issue_description} onChange={(event) => change('issue_description', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Supporting File URLs / 上传资料链接<textarea className={inputClass} rows={3} value={values.attachment_urls_text} onChange={(event) => change('attachment_urls_text', event.target.value)} placeholder="One URL per line / 每行一个链接" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Customer Notes / 客户备注<textarea className={inputClass} rows={3} value={values.customer_notes} onChange={(event) => change('customer_notes', event.target.value)} /></label>
        </div>
        <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Submit to Service Operations / 提交到统一工单</button>
        {state.result ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
      </form>

      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">My Submitted Requests / 我的提交记录</h2>
          <button type="button" onClick={() => void load()} disabled={state.loading} className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50 disabled:opacity-50">Refresh / 刷新</button>
        </div>
        <div className="mt-4 grid gap-3">
          {!state.requests.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer portal requests yet. / 暂无客户门户提交记录。</div> : null}
          {state.requests.map((row) => (
            <article key={String(row.service_request_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-black text-slate-950">{formatValue(row.issue_type)}</div>
              <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(row.customer_portal_request_type)} · {formatValue(row.status)} · {formatValue(row.priority)}</div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Service Request: {formatValue(row.service_request_id)}</div>
                <div>Warranty: {formatValue(row.related_warranty_id)}</div>
                <div>Created: {formatValue(row.created_at)}</div>
                <div>Updated: {formatValue(row.updated_at)}</div>
                <div className="md:col-span-2">Description: {formatValue(row.issue_description)}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
