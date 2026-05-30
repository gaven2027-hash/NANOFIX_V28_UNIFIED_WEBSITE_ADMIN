'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; submitting: boolean; error: string | null; message: string | null; claims: Row[]; result: Row | null };
type Values = { service_request_id: string; closure_status: 'completed' | 'closed' | 'cancelled' | 'reopened'; completion_summary: string; closure_notes: string };

async function loadWarrantyClaimClosures(serviceRequestId?: string) {
  const query = serviceRequestId ? `?service_request_id=${encodeURIComponent(serviceRequestId)}` : '?limit=80';
  const response = await fetch(`/api/admin/service-operations/warranty-claim-closure${query}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; warranty_claims?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; warranty_claims?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim closure API returned ${response.status}`);
  return Array.isArray(payload?.warranty_claims) ? payload.warranty_claims : [];
}

async function submitClosure(values: Values) {
  const response = await fetch('/api/admin/service-operations/warranty-claim-closure', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Warranty claim closure submit API returned ${response.status}`);
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

function suggestedStatus(row: Row): Values['closure_status'] {
  const current = String(row.warranty_claim_closure_status ?? 'open');
  if (current === 'completed' || current === 'closed' || current === 'cancelled' || current === 'reopened') return current as Values['closure_status'];
  return 'completed';
}

export function ServiceOperationsWarrantyClaimClosurePanel() {
  const [state, setState] = useState<State>({ loading: true, submitting: false, error: null, message: null, claims: [], result: null });
  const [values, setValues] = useState<Values>({ service_request_id: '', closure_status: 'completed', completion_summary: '', closure_notes: '' });

  async function refresh(serviceRequestId = values.service_request_id) {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const claims = await loadWarrantyClaimClosures(serviceRequestId || undefined);
      setState((current) => ({ ...current, loading: false, claims }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pickClaim(row: Row) {
    setValues({
      service_request_id: String(row.service_request_id ?? ''),
      closure_status: suggestedStatus(row),
      completion_summary: String(row.warranty_claim_completion_summary ?? ''),
      closure_notes: String(row.warranty_claim_closure_notes ?? '')
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.service_request_id) return;
    setState((current) => ({ ...current, submitting: true, error: null, message: null, result: null }));
    try {
      const result = await submitClosure(values);
      const claims = await loadWarrantyClaimClosures(values.service_request_id);
      setState({ loading: false, submitting: false, error: null, message: 'Warranty claim closure saved. Customer Portal timeline will show the final status. / 保修申请关闭状态已保存，客户门户时间线会显示最终状态。', claims, result });
    } catch (error) {
      setState((current) => ({ ...current, submitting: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  useEffect(() => { void refresh(''); }, []);

  return (
    <section id="warranty-claim-closure" className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.4.10 / Completion & Closure</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Claim Completion & Closure / 保修申请完成与关闭</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Close, complete, cancel or reopen Customer Portal warranty claims after warranty repair work is resolved. / 保修维修处理完成后，后台可完成、关闭、取消或重新打开客户门户保修申请。</p>
      </div>
      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_1fr]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Warranty Claims / 保修申请</h3>
            <button type="button" onClick={() => void refresh('')} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          {!state.claims.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No warranty claims found. / 暂无保修申请。</div> : state.claims.map((claim) => (
            <button key={String(claim.service_request_id)} type="button" onClick={() => pickClaim(claim)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">{formatValue(claim.contact_name)} · {formatValue(claim.status)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(claim.service_request_id)}</div>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-activeBlue ring-1 ring-blue-100">{formatValue(claim.warranty_claim_closure_status)}</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Completed: {formatValue(claim.warranty_claim_completed_at)}</div>
                <div>Closed: {formatValue(claim.warranty_claim_closed_at)}</div>
                <div className="md:col-span-2">Summary: {formatValue(claim.warranty_claim_completion_summary)}</div>
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Closure Action / 关闭动作</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input value={values.service_request_id} onChange={(event) => setValues((current) => ({ ...current, service_request_id: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" required /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Closure Status<select value={values.closure_status} onChange={(event) => setValues((current) => ({ ...current, closure_status: event.target.value as Values['closure_status'] }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100">
            <option value="completed">completed — warranty repair completed</option>
            <option value="closed">closed — claim closed</option>
            <option value="cancelled">cancelled — claim cancelled</option>
            <option value="reopened">reopened — claim reopened</option>
          </select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Completion Summary / 完成说明<textarea value={values.completion_summary} onChange={(event) => setValues((current) => ({ ...current, completion_summary: event.target.value }))} rows={5} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Closure Notes / 关闭备注<textarea value={values.closure_notes} onChange={(event) => setValues((current) => ({ ...current, closure_notes: event.target.value }))} rows={4} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Closure only updates warranty claim status and timeline. It does not edit quotations, invoices, warranties or payment records. / 关闭动作只更新保修申请状态和时间线，不会修改报价、发票、保修单或付款记录。</div>
          <button type="submit" disabled={state.submitting || !values.service_request_id} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.submitting ? 'Saving… / 保存中…' : 'Save Closure / 保存关闭状态'}</button>
          {state.result ? <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs font-semibold text-slate-100">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>
      </div>
    </section>
  );
}
