'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; requests: Row[]; feedback: Row[]; result: Row | null };
type RequestValues = { request_type: string; related_warranty_id: string; contact_name: string; phone: string; email: string; address_text: string; postal_code: string; issue_type: string; leak_location: string; issue_description: string; preferred_schedule: string; customer_notes: string; attachment_urls: string };
type FeedbackValues = { document_type: string; document_id: string; feedback_type: string; message: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

const defaultRequest: RequestValues = { request_type: 'new_repair', related_warranty_id: '', contact_name: '', phone: '', email: '', address_text: '', postal_code: '', issue_type: '', leak_location: '', issue_description: '', preferred_schedule: '', customer_notes: '', attachment_urls: '' };
const defaultFeedback: FeedbackValues = { document_type: 'quotation', document_id: '', feedback_type: 'comment', message: '' };

function splitUrls(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 12);
}

async function loadRequests() {
  const response = await fetch('/api/customer-portal/service-requests?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; service_requests?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; service_requests?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Service requests API returned ${response.status}`);
  return Array.isArray(payload?.service_requests) ? payload.service_requests : [];
}

async function loadFeedback() {
  const response = await fetch('/api/customer-portal/document-feedback?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; feedback?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; feedback?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Feedback API returned ${response.status}`);
  return Array.isArray(payload?.feedback) ? payload.feedback : [];
}

async function submitRequest(values: RequestValues) {
  const response = await fetch('/api/customer-portal/service-requests', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...values, attachment_urls: splitUrls(values.attachment_urls) })
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Submit service request returned ${response.status}`);
  return payload ?? { ok: true };
}

async function submitFeedback(values: FeedbackValues) {
  const response = await fetch('/api/customer-portal/document-feedback', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Submit feedback returned ${response.status}`);
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

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}<input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export function CustomerPortalRequestAndFeedbackPanel() {
  const [state, setState] = useState<State>({ loading: true, error: null, message: null, requests: [], feedback: [], result: null });
  const [request, setRequest] = useState<RequestValues>(defaultRequest);
  const [feedback, setFeedback] = useState<FeedbackValues>(defaultFeedback);

  function changeRequest(key: keyof RequestValues, value: string) { setRequest((current) => ({ ...current, [key]: value })); }
  function changeFeedback(key: keyof FeedbackValues, value: string) { setFeedback((current) => ({ ...current, [key]: value })); }

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const [requests, feedbackRows] = await Promise.all([loadRequests(), loadFeedback()]);
      setState((current) => ({ ...current, loading: false, error: null, requests, feedback: feedbackRows }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  async function onSubmitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await submitRequest(request);
      const [requests, feedbackRows] = await Promise.all([loadRequests(), loadFeedback()]);
      setRequest(defaultRequest);
      setState({ loading: false, error: null, message: 'Your request has entered NANOFIX Unified Intake → Service Requests → Jobs workflow. / 您的报修已进入 NANOFIX 统一线索、报修、工单处理流程。', requests, feedback: feedbackRows, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  async function onSubmitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await submitFeedback(feedback);
      const feedbackRows = await loadFeedback();
      setFeedback(defaultFeedback);
      setState((current) => ({ ...current, loading: false, error: null, message: 'Your feedback has been sent to NANOFIX admin. / 您的反馈已发送到 NANOFIX 总后台。', feedback: feedbackRows, result }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Submit Request / 提交报修</div>
            <h1 className="mt-2 text-2xl font-black text-slate-950">New Repair / Warranty Repair</h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">New repair and warranty repair submissions all enter the existing NANOFIX Unified Intake → Leads → Service Requests → Jobs workflow. Admin can see whether it is a member customer new repair or warranty repair. / 新报修和保修期内维修都会进入原来的统一线索、报修、工单处理入口；后台只需看到它是会员客户新报修还是保修维修，方便审核安排。</p>
            <p className="mt-2 max-w-4xl text-xs font-bold leading-5 text-slate-500">Quotations, invoices and warranty documents are generated from official admin templates and company settings. Customers cannot edit those documents; they can only leave feedback. / 报价、发票、保修单由总后台按模板和公司资料生成，客户不能修改，只能留言反馈。</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
        </div>
        {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {state.message ? <div className="mt-5 rounded-3xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
      </section>

      <form onSubmit={(event) => void onSubmitRequest(event)} className="grid gap-4 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <h2 className="text-lg font-black text-slate-950">Submit New / Warranty Repair / 提交新维修或保修维修</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Request Type / 类型<select className={inputClass} value={request.request_type} onChange={(event) => changeRequest('request_type', event.target.value)}><option value="new_repair">New Repair / 新报修</option><option value="warranty_repair">Warranty Repair / 保修期内维修</option></select></label>
          <TextField label="Related Warranty ID / 保修ID" value={request.related_warranty_id} onChange={(value) => changeRequest('related_warranty_id', value)} placeholder="Required for warranty repair" />
          <TextField label="Contact Name / 联系人" value={request.contact_name} onChange={(value) => changeRequest('contact_name', value)} />
          <TextField label="Phone / 电话" value={request.phone} onChange={(value) => changeRequest('phone', value)} />
          <TextField label="Email / 邮箱" value={request.email} onChange={(value) => changeRequest('email', value)} />
          <TextField label="Address / 地址" value={request.address_text} onChange={(value) => changeRequest('address_text', value)} />
          <TextField label="Postal Code / 邮编" value={request.postal_code} onChange={(value) => changeRequest('postal_code', value)} />
          <TextField label="Leak Location / 漏水位置" value={request.leak_location} onChange={(value) => changeRequest('leak_location', value)} />
          <TextField label="Issue Type / 问题类型" value={request.issue_type} onChange={(value) => changeRequest('issue_type', value)} />
          <TextField label="Preferred Schedule / 期望预约时间" value={request.preferred_schedule} onChange={(value) => changeRequest('preferred_schedule', value)} />
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Issue Description / 问题说明<textarea className={inputClass} rows={4} value={request.issue_description} onChange={(event) => changeRequest('issue_description', event.target.value)} /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Attachment URLs / 图片或视频链接<textarea className={inputClass} rows={3} value={request.attachment_urls} onChange={(event) => changeRequest('attachment_urls', event.target.value)} placeholder="One URL per line / 每行一个链接" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Customer Notes / 客户备注<textarea className={inputClass} rows={3} value={request.customer_notes} onChange={(event) => changeRequest('customer_notes', event.target.value)} /></label>
        <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Submit to Unified Service Operations / 提交到统一工单</button>
      </form>

      <form onSubmit={(event) => void onSubmitFeedback(event)} className="grid gap-4 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <h2 className="text-lg font-black text-slate-950">Document Feedback / 单据反馈留言</h2>
        <p className="text-sm font-semibold text-slate-600">You may leave feedback on quotations, invoices, payments or warranties. NANOFIX admin may revise and re-push documents if needed. / 您可以对报价、发票、付款或保修单留言反馈；总后台可根据实际情况修改后重新推送。</p>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Document Type / 单据类型<select className={inputClass} value={feedback.document_type} onChange={(event) => changeFeedback('document_type', event.target.value)}><option value="quotation">Quotation / 报价</option><option value="invoice">Invoice / 发票</option><option value="warranty">Warranty / 保修</option><option value="payment">Payment / 付款</option><option value="other">Other / 其他</option></select></label>
          <TextField label="Document ID / 单据ID" value={feedback.document_id} onChange={(value) => changeFeedback('document_id', value)} />
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Feedback Type / 反馈类型<select className={inputClass} value={feedback.feedback_type} onChange={(event) => changeFeedback('feedback_type', event.target.value)}><option value="comment">Comment / 留言</option><option value="change_request">Change Request / 修改建议</option><option value="clarification">Clarification / 需要说明</option><option value="dispute">Dispute / 异议</option></select></label>
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Message / 留言<textarea className={inputClass} rows={4} value={feedback.message} onChange={(event) => changeFeedback('message', event.target.value)} /></label>
        <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white hover:bg-slate-900 disabled:opacity-50">Submit Feedback / 提交反馈</button>
      </form>

      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <h2 className="text-lg font-black text-slate-950">My Submitted Service Requests / 我的工单提交记录</h2>
        {!state.requests.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No submitted requests yet. / 暂无提交记录。</div> : state.requests.map((row) => <article key={String(row.service_request_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-sm font-black text-slate-950">{formatValue(row.issue_type)}</div><div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(row.customer_portal_request_type)} · {formatValue(row.status)} · {formatValue(row.priority)}</div><div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600"><div>Service Request / 工单: {formatValue(row.service_request_id)}</div><div>Warranty / 保修: {formatValue(row.related_warranty_id)}</div><div>Created / 创建: {formatValue(row.created_at)}</div><div>Description / 说明: {formatValue(row.issue_description)}</div></div></article>)}
      </section>

      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <h2 className="text-lg font-black text-slate-950">My Document Feedback / 我的单据反馈</h2>
        {!state.feedback.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No document feedback yet. / 暂无单据反馈。</div> : state.feedback.map((row) => <article key={String(row.feedback_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-sm font-black text-slate-950">{formatValue(row.document_type)} · {formatValue(row.feedback_type)}</div><div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(row.status)}</div><div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600"><div>Document ID / 单据ID: {formatValue(row.document_id)}</div><div>Message / 留言: {formatValue(row.message)}</div><div>Admin Response / 后台回复: {formatValue(row.internal_response)}</div></div></article>)}
      </section>

      {state.result ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-3xl bg-white p-5 text-xs font-semibold text-slate-700 shadow-soft ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
    </div>
  );
}
