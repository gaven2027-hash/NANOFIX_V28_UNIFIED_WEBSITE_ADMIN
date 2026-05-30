'use client';

import { FormEvent, useEffect, useState } from 'react';

type Feedback = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; feedback: Feedback[]; result: Record<string, unknown> | null };
type Values = { feedback_id: string; status: string; internal_response: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

async function fetchFeedback() {
  const response = await fetch('/api/admin/service-operations/customer-document-feedback?limit=40', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; feedback?: Feedback[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; feedback?: Feedback[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer document feedback API returned ${response.status}`);
  return Array.isArray(payload?.feedback) ? payload.feedback : [];
}

async function reviewFeedback(values: Values) {
  const response = await fetch('/api/admin/service-operations/customer-document-feedback', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'review_customer_document_feedback', ...values })
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Review feedback returned ${response.status}`);
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

export function ServiceOperationsCustomerDocumentFeedbackPanel() {
  const [state, setState] = useState<State>({ loading: true, error: null, message: null, feedback: [], result: null });
  const [values, setValues] = useState<Values>({ feedback_id: '', status: 'reviewing', internal_response: '' });

  async function load() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const feedback = await fetchFeedback();
      setState((current) => ({ ...current, loading: false, error: null, feedback }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pick(item: Feedback) {
    setValues({ feedback_id: String(item.feedback_id ?? ''), status: String(item.status === 'submitted' ? 'reviewing' : item.status ?? 'reviewing'), internal_response: String(item.internal_response ?? '') });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await reviewFeedback(values);
      const feedback = await fetchFeedback();
      setState({ loading: false, error: null, message: 'Customer feedback reviewed. / 客户单据反馈已审核。', feedback, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Document Feedback / 客户单据反馈</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Review Customer Feedback and Re-Push from Admin Templates</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Customers can only leave feedback on quotations, invoices, warranties and payments. They cannot edit document content. Admin reviews feedback and, if needed, revises documents in the relevant template generator before re-pushing to Customer Portal. / 客户只能留言反馈，不能修改报价、发票、保修单或付款内容；后台审核后，如需修改，回到对应模板生成模块重新生成并推送客户。</p>
      </div>
      <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid h-fit gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Latest Feedback / 最新反馈</h3>
            <button type="button" onClick={() => void load()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          {!state.feedback.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer document feedback yet. / 暂无客户单据反馈。</div> : null}
          {state.feedback.map((item) => (
            <button key={String(item.feedback_id)} type="button" onClick={() => pick(item)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">{formatValue(item.document_type)} · {formatValue(item.feedback_type)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(item.status)} · {formatValue(item.created_at)}</div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">Pick / 选择</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600">
                <div>Feedback ID: {formatValue(item.feedback_id)}</div>
                <div>Document ID: {formatValue(item.document_id)}</div>
                <div>Related Job: {formatValue(item.related_job_id)}</div>
                <div>Message: {formatValue(item.message)}</div>
              </div>
            </button>
          ))}
        </div>
        <form onSubmit={(event) => void submit(event)} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Review Feedback / 审核反馈</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Feedback ID<input className={inputClass} value={values.feedback_id} onChange={(event) => setValues((current) => ({ ...current, feedback_id: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Status<select className={inputClass} value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}><option value="reviewing">reviewing / 审核中</option><option value="resolved">resolved / 已处理</option><option value="rejected">rejected / 不采纳</option><option value="superseded">superseded / 已被新版替代</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Internal Response / 后台回复<textarea className={inputClass} rows={5} value={values.internal_response} onChange={(event) => setValues((current) => ({ ...current, internal_response: event.target.value }))} /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">Changing document content must be done in Quotation PDF / Invoice PDF / Warranty template modules, then re-pushed to Customer Portal. / 修改单据内容必须在报价、发票或保修模板模块中完成，再重新推送客户门户。</div>
          <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Save Review / 保存审核</button>
          {state.result ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>
      </div>
    </section>
  );
}
