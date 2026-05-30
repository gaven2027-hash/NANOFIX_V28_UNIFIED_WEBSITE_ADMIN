'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; portalRequests: Row[]; serviceRequests: Row[]; feedback: Row[]; result: Row | null };
type Values = { portal_request_id: string; feedback_id: string; status: string; internal_notes: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

async function loadIntake() {
  const response = await fetch('/api/admin/service-operations/customer-portal-intake?limit=30', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; portal_requests?: Row[]; service_requests?: Row[]; document_feedback?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; portal_requests?: Row[]; service_requests?: Row[]; document_feedback?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer portal intake API returned ${response.status}`);
  return {
    portalRequests: Array.isArray(payload?.portal_requests) ? payload.portal_requests : [],
    serviceRequests: Array.isArray(payload?.service_requests) ? payload.service_requests : [],
    feedback: Array.isArray(payload?.document_feedback) ? payload.document_feedback : []
  };
}

async function postAction(action: string, values: Values) {
  const response = await fetch('/api/admin/service-operations/customer-portal-intake', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action,
      portal_request_id: values.portal_request_id,
      feedback_id: values.feedback_id,
      status: values.status,
      internal_notes: values.internal_notes,
      internal_response: values.internal_notes
    })
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Customer portal intake action returned ${response.status}`);
  return payload ?? { ok: true };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-activeBlue ring-1 ring-blue-100">{children}</span>;
}

export function ServiceOperationsCustomerPortalIntakePanel() {
  const [state, setState] = useState<State>({ loading: true, error: null, message: null, portalRequests: [], serviceRequests: [], feedback: [], result: null });
  const [values, setValues] = useState<Values>({ portal_request_id: '', feedback_id: '', status: 'reviewing', internal_notes: '' });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const data = await loadIntake();
      setState((current) => ({ ...current, loading: false, error: null, ...data }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pickPortal(row: Row) {
    setValues({ portal_request_id: String(row.portal_request_id ?? ''), feedback_id: '', status: String(row.status ?? 'reviewing'), internal_notes: String(row.internal_notes ?? '') });
  }

  function pickFeedback(row: Row) {
    setValues({ portal_request_id: '', feedback_id: String(row.feedback_id ?? ''), status: String(row.status ?? 'reviewing'), internal_notes: String(row.internal_response ?? '') });
  }

  async function submit(action: string, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await postAction(action, values);
      const data = await loadIntake();
      const message = action === 'respond_document_feedback' ? 'Feedback response saved and customer notified. / 反馈回复已保存并通知客户。' : 'Portal request status updated in the unified workflow. / 会员来源工单状态已在统一流程中更新。';
      setState({ loading: false, error: null, message, result, ...data });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Portal Intake / 会员客户入口</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Unified Service Request Intake</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Customer Portal submissions do not create a separate workflow. New repair and warranty repair requests enter the original Service Operations service_requests queue, with portal source labels for admin review. / 客户门户提交不会另起流程；新报修和保修维修都进入原 Service Operations 工单队列，只增加会员来源标记方便后台审核安排。</p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-slate-950">Portal Source Records / 会员来源记录</h3>
              <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
            </div>
            {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
            {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
            {!state.portalRequests.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No Customer Portal requests yet. / 暂无客户门户提交。</div> : state.portalRequests.map((row) => (
              <button key={String(row.portal_request_id)} type="button" onClick={() => pickPortal(row)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">{formatValue(row.title)}</div>
                    <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(row.request_type)} · {formatValue(row.status)}</div>
                  </div>
                  <Badge>Pick / 选择</Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                  <div>Portal ID: {formatValue(row.portal_request_id)}</div>
                  <div>Service Request: {formatValue(row.created_service_request_id)}</div>
                  <div>Warranty: {formatValue(row.related_warranty_id)}</div>
                  <div>Created: {formatValue(row.created_at)}</div>
                  <div className="md:col-span-2">Issue: {formatValue(row.issue_description)}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            <h3 className="text-sm font-black text-slate-950">Unified Service Requests / 统一工单入口</h3>
            {!state.serviceRequests.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No linked service requests yet. / 暂无已关联统一工单。</div> : state.serviceRequests.map((row) => (
              <article key={String(row.service_request_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-sm font-black text-slate-950">{formatValue(row.title)}</div>
                <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(row.portal_source_type)} · {formatValue(row.status)}</div>
                <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                  <div>Service Request: {formatValue(row.service_request_id)}</div>
                  <div>Portal Source: {formatValue(row.customer_portal_request_id)}</div>
                  <div>Warranty: {formatValue(row.portal_related_warranty_id)}</div>
                  <div>Channel: {formatValue(row.request_channel)}</div>
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-3">
            <h3 className="text-sm font-black text-slate-950">Document Feedback / 单据反馈</h3>
            {!state.feedback.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No document feedback yet. / 暂无单据反馈。</div> : state.feedback.map((row) => (
              <button key={String(row.feedback_id)} type="button" onClick={() => pickFeedback(row)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">{formatValue(row.document_type)} · {formatValue(row.feedback_type)}</div>
                    <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(row.status)}</div>
                  </div>
                  <Badge>Pick / 选择</Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600">
                  <div>Feedback ID: {formatValue(row.feedback_id)}</div>
                  <div>Document ID: {formatValue(row.document_id)}</div>
                  <div>Message: {formatValue(row.message)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={(event) => void submit(values.feedback_id ? 'respond_document_feedback' : 'update_portal_request_status', event)} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Admin Action / 后台处理</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Portal Request ID<input className={inputClass} value={values.portal_request_id} onChange={(event) => setValues((current) => ({ ...current, portal_request_id: event.target.value, feedback_id: '' }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Feedback ID<input className={inputClass} value={values.feedback_id} onChange={(event) => setValues((current) => ({ ...current, feedback_id: event.target.value, portal_request_id: '' }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Status<select className={inputClass} value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}><option value="reviewing">reviewing</option><option value="converted_to_job">converted_to_job</option><option value="resolved">resolved</option><option value="rejected">rejected</option><option value="cancelled">cancelled</option><option value="superseded">superseded</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Internal Notes / Response<textarea className={inputClass} rows={5} value={values.internal_notes} onChange={(event) => setValues((current) => ({ ...current, internal_notes: event.target.value }))} /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">All official quotations, invoices and warranties must be revised from Internal Admin templates. Customer feedback is advisory only. / 所有正式报价、发票、保修单必须由总后台模板修改生成；客户反馈只作为建议。</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void submit('update_portal_request_status')} disabled={state.loading || !values.portal_request_id} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Update Portal Request / 更新会员来源</button>
            <button type="button" onClick={() => void submit('respond_document_feedback')} disabled={state.loading || !values.feedback_id} className="rounded-2xl bg-slate-800 px-4 py-3 text-xs font-black text-white hover:bg-slate-900 disabled:opacity-50">Respond Feedback / 回复反馈</button>
          </div>
          {state.result ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>
      </div>
    </section>
  );
}
