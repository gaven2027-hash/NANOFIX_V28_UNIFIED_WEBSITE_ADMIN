'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; submitting: boolean; error: string | null; message: string | null; claim: Row | null; result: Row | null };
type Values = { satisfaction_status: 'satisfied' | 'not_satisfied'; rating: string; notes: string };

async function loadSatisfaction(serviceRequestId: string) {
  const response = await fetch(`/api/customer-portal/warranty-claims/${serviceRequestId}/satisfaction`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; claim?: Row } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; claim?: Row } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim satisfaction API returned ${response.status}`);
  return payload?.claim ?? null;
}

async function submitSatisfaction(serviceRequestId: string, values: Values) {
  const response = await fetch(`/api/customer-portal/warranty-claims/${serviceRequestId}/satisfaction`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      satisfaction_status: values.satisfaction_status,
      rating: values.rating ? Number(values.rating) : null,
      notes: values.notes
    })
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Warranty claim satisfaction submit API returned ${response.status}`);
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
  return String(value);
}

function isClaimReadyForSatisfaction(claim: Row | null) {
  return ['completed', 'closed'].includes(String(claim?.warranty_claim_closure_status ?? ''));
}

export function CustomerPortalWarrantyClaimSatisfactionPanel({ serviceRequestId }: { serviceRequestId: string }) {
  const [state, setState] = useState<State>({ loading: true, submitting: false, error: null, message: null, claim: null, result: null });
  const [values, setValues] = useState<Values>({ satisfaction_status: 'satisfied', rating: '5', notes: '' });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const claim = await loadSatisfaction(serviceRequestId);
      setState((current) => ({ ...current, loading: false, claim }));
      if (claim) {
        const status = String(claim.warranty_claim_customer_satisfaction_status ?? 'pending');
        if (status === 'satisfied' || status === 'not_satisfied') {
          setValues({
            satisfaction_status: status,
            rating: claim.warranty_claim_customer_satisfaction_rating ? String(claim.warranty_claim_customer_satisfaction_rating) : '',
            notes: String(claim.warranty_claim_customer_satisfaction_notes ?? '')
          });
        }
      }
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (values.satisfaction_status === 'not_satisfied' && !values.notes.trim()) {
      setState((current) => ({ ...current, error: 'Please add a short reason when not satisfied. / 如果不满意，请填写简短原因。' }));
      return;
    }
    setState((current) => ({ ...current, submitting: true, error: null, message: null, result: null }));
    try {
      const result = await submitSatisfaction(serviceRequestId, values);
      const claim = await loadSatisfaction(serviceRequestId);
      const message = values.satisfaction_status === 'satisfied'
        ? 'Thank you. Your satisfaction confirmation has been recorded. / 谢谢，您的满意确认已记录。'
        : 'Your feedback has been sent to NANOFIX for follow-up. / 您的反馈已发送给 NANOFIX 继续处理。';
      setState({ loading: false, submitting: false, error: null, message, claim, result });
    } catch (error) {
      setState((current) => ({ ...current, submitting: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  useEffect(() => { void refresh(); }, [serviceRequestId]);

  const ready = isClaimReadyForSatisfaction(state.claim);
  const currentStatus = String(state.claim?.warranty_claim_customer_satisfaction_status ?? 'pending');

  return (
    <section id="satisfaction-confirmation" className="scroll-mt-28 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-blue-50 px-6 py-5 ring-1 ring-blue-100">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.5 / Customer Confirmation</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Claim Satisfaction Confirmation / 保修维修满意确认</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">After NANOFIX completes or closes the warranty claim, you can confirm whether the repair result is satisfactory. / NANOFIX 完成或关闭保修维修申请后，您可以确认维修结果是否满意。</p>
      </div>
      <div className="grid gap-5 p-6">
        {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
        {state.loading ? <div className="rounded-2xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading confirmation status… / 正在读取确认状态…</div> : null}

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-black text-slate-400">Claim Closure / 申请关闭状态</div><div className="mt-2 text-sm font-black text-slate-950">{formatValue(state.claim?.warranty_claim_closure_status)}</div></div>
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-black text-slate-400">Satisfaction / 满意状态</div><div className="mt-2 text-sm font-black text-slate-950">{formatValue(currentStatus)}</div></div>
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-black text-slate-400">Rating / 评分</div><div className="mt-2 text-sm font-black text-slate-950">{formatValue(state.claim?.warranty_claim_customer_satisfaction_rating)}</div></div>
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-black text-slate-400">Confirmed / 确认时间</div><div className="mt-2 text-sm font-black text-slate-950">{formatValue(state.claim?.warranty_claim_customer_confirmed_at)}</div></div>
        </div>

        {!ready ? <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Satisfaction confirmation will be available after this warranty claim is completed or closed. / 保修维修申请完成或关闭后，客户满意确认才会开放。</div> : null}

        <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Confirmation / 确认结果<select value={values.satisfaction_status} onChange={(event) => setValues((current) => ({ ...current, satisfaction_status: event.target.value as Values['satisfaction_status'] }))} disabled={!ready || state.submitting} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100">
            <option value="satisfied">Satisfied — accept the completed warranty repair / 满意，接受维修完成结果</option>
            <option value="not_satisfied">Not satisfied — request follow-up / 不满意，需要继续处理</option>
          </select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Rating / 评分<select value={values.rating} onChange={(event) => setValues((current) => ({ ...current, rating: event.target.value }))} disabled={!ready || state.submitting} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100">
            <option value="">No rating / 不评分</option>
            <option value="5">5 — Very satisfied / 非常满意</option>
            <option value="4">4 — Satisfied / 满意</option>
            <option value="3">3 — Average / 一般</option>
            <option value="2">2 — Not satisfied / 不满意</option>
            <option value="1">1 — Very unsatisfied / 非常不满意</option>
          </select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Notes / 备注<textarea value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} disabled={!ready || state.submitting} maxLength={2000} rows={5} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Optional if satisfied; required if not satisfied. / 满意时可选；不满意时必须填写。" /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">This confirmation only records your satisfaction feedback. It does not edit quotations, invoices, warranties or payment records. / 此确认只记录您的满意反馈，不会修改报价、发票、保修单或付款记录。</div>
          <button type="submit" disabled={!ready || state.submitting} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.submitting ? 'Submitting… / 提交中…' : 'Submit Confirmation / 提交确认'}</button>
        </form>
      </div>
    </section>
  );
}
