'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; feedback: Row[]; result: Row | null };
type Values = { document_type: string; document_id: string; feedback_type: string; message: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

async function fetchFeedback() {
  const response = await fetch('/api/customer-portal/document-feedback?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; feedback?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; feedback?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Document feedback API returned ${response.status}`);
  return Array.isArray(payload?.feedback) ? payload.feedback : [];
}

async function submitFeedback(values: Values) {
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
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Document feedback submit returned ${response.status}`);
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

export function CustomerDocumentFeedbackPanel() {
  const [values, setValues] = useState<Values>({ document_type: 'quotation', document_id: '', feedback_type: 'comment', message: '' });
  const [state, setState] = useState<State>({ loading: true, error: null, message: null, feedback: [], result: null });

  function change(key: keyof Values, value: string) { setValues((current) => ({ ...current, [key]: value })); }

  async function load() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const feedback = await fetchFeedback();
      setState((current) => ({ ...current, loading: false, error: null, feedback }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await submitFeedback(values);
      const feedback = await fetchFeedback();
      setState({ loading: false, error: null, message: 'Feedback submitted. NANOFIX will review and update documents from Admin if needed. / 反馈已提交，NANOFIX 会审核，如需修改将由后台重新生成并推送。', feedback, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section id="document-feedback" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Document Feedback / 单据反馈</div>
      <h2 className="mt-2 text-xl font-black text-slate-950">Feedback on Quotation, Invoice or Warranty</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">You may leave comments or request clarification. You cannot edit quotations, invoices or warranty documents directly. NANOFIX Admin will review and re-push updated documents if needed. / 您可以留言或要求说明，但不能直接修改报价、发票或保修单；如需修改，将由 NANOFIX 后台审核后重新生成并推送。</p>
      <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
        {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Document Type / 单据类型<select className={inputClass} value={values.document_type} onChange={(event) => change('document_type', event.target.value)}><option value="quotation">Quotation / 报价</option><option value="invoice">Invoice / 发票</option><option value="warranty">Warranty / 保修单</option><option value="payment">Payment / 付款</option><option value="other">Other / 其他</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Document ID / 单据ID<input className={inputClass} value={values.document_id} onChange={(event) => change('document_id', event.target.value)} placeholder="quotation_id / invoice_id / warranty_id" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Feedback Type / 反馈类型<select className={inputClass} value={values.feedback_type} onChange={(event) => change('feedback_type', event.target.value)}><option value="comment">Comment / 留言</option><option value="change_request">Change Request / 修改建议</option><option value="clarification">Clarification / 要求说明</option><option value="dispute">Dispute / 异议</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Message / 留言<textarea className={inputClass} rows={4} value={values.message} onChange={(event) => change('message', event.target.value)} /></label>
        </div>
        <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Submit Feedback / 提交反馈</button>
        {state.result ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
      </form>
      <div className="mt-5 grid gap-3">
        <h3 className="text-sm font-black text-slate-950">My Feedback / 我的反馈</h3>
        {!state.feedback.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No feedback yet. / 暂无反馈。</div> : null}
        {state.feedback.map((item) => <article key={String(item.feedback_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-sm font-black text-slate-950">{formatValue(item.document_type)} · {formatValue(item.feedback_type)}</div><div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(item.status)} · {formatValue(item.created_at)}</div><div className="mt-2 text-xs font-semibold text-slate-600">{formatValue(item.message)}</div>{item.internal_response ? <div className="mt-2 rounded-2xl bg-white p-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Admin Response / 后台回复: {formatValue(item.internal_response)}</div> : null}</article>)}
      </div>
    </section>
  );
}
