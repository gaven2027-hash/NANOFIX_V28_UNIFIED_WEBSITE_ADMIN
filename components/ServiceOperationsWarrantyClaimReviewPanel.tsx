'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; claims: Row[]; result: Row | null };
type Decision = 'in_warranty' | 'out_of_warranty' | 'needs_new_quote' | 'rejected' | 'converted_to_job';
type Values = { service_request_id: string; decision: Decision; notes: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

async function fetchClaims() {
  const response = await fetch('/api/admin/service-operations/warranty-claims?limit=50', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; warranty_claims?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; warranty_claims?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim API returned ${response.status}`);
  return Array.isArray(payload?.warranty_claims) ? payload.warranty_claims : [];
}

async function submitDecision(values: Values) {
  const response = await fetch('/api/admin/service-operations/warranty-claims', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Warranty claim decision API returned ${response.status}`);
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

export function ServiceOperationsWarrantyClaimReviewPanel() {
  const [state, setState] = useState<State>({ loading: true, error: null, message: null, claims: [], result: null });
  const [values, setValues] = useState<Values>({ service_request_id: '', decision: 'in_warranty', notes: '' });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const claims = await fetchClaims();
      setState((current) => ({ ...current, loading: false, error: null, claims }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pickClaim(row: Row) {
    setValues({
      service_request_id: String(row.service_request_id ?? ''),
      decision: String(row.warranty_claim_decision ?? 'in_warranty') as Decision,
      notes: String(row.warranty_claim_decision_notes ?? row.portal_customer_notes ?? '')
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await submitDecision(values);
      const claims = await fetchClaims();
      setState({ loading: false, error: null, message: 'Warranty claim decision saved to Service Requests, task events, Internal Inbox and Audit Logs. / 保修申请审核决定已写入工单、任务事件、内部收件箱和审计日志。', claims, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  return (
    <section id="warranty-claim-review" className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.4.1 / Warranty Claim Review</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Claim Admin Review Decision / 保修维修申请后台审核</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Customer warranty claims stay inside the original Service Request flow. Internal Admin decides whether the claim is in-warranty, out-of-warranty, needs a new quote, rejected, or converted to a job. / 客户保修维修不另起流程，统一保留在原 Service Request 中；后台只做保修内、保修外、重新报价、拒绝或转工单的审核决定。
        </p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Warranty Claim Queue / 保修申请队列</h3>
            <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          {!state.claims.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No warranty claims found. / 暂无保修申请。</div> : state.claims.map((row) => (
            <button key={String(row.service_request_id)} type="button" onClick={() => pickClaim(row)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">{formatValue(row.contact_name)} · {formatValue(row.issue_type)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(row.status)} · {formatValue(row.warranty_claim_decision)}</div>
                </div>
                <Badge>Pick / 选择</Badge>
              </div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Service Request: {formatValue(row.service_request_id)}</div>
                <div>Warranty: {formatValue(row.related_warranty_id ?? row.warranty_id)}</div>
                <div>Phone: {formatValue(row.phone ?? row.whatsapp)}</div>
                <div>Next Action: {formatValue(row.warranty_claim_next_action)}</div>
                <div className="md:col-span-2">Issue: {formatValue(row.issue_description)}</div>
                <div className="md:col-span-2">Customer Notes: {formatValue(row.portal_customer_notes)}</div>
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Review Decision / 审核决定</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input className={inputClass} value={values.service_request_id} onChange={(event) => setValues((current) => ({ ...current, service_request_id: event.target.value }))} required /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Decision<select className={inputClass} value={values.decision} onChange={(event) => setValues((current) => ({ ...current, decision: event.target.value as Decision }))}>
            <option value="in_warranty">in_warranty — approve warranty repair</option>
            <option value="out_of_warranty">out_of_warranty — prepare payable quote</option>
            <option value="needs_new_quote">needs_new_quote — new quotation required</option>
            <option value="converted_to_job">converted_to_job — continue job flow</option>
            <option value="rejected">rejected — close rejected claim</option>
          </select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Decision Notes / 审核备注<textarea className={inputClass} rows={6} value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} placeholder="Reason, coverage decision, next action and customer explanation." /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">
            This does not let customers edit warranties, invoices, quotations or payment records. It only records an internal decision and moves the same Service Request forward. / 该操作不会让客户修改保修单、发票、报价或付款记录；只记录后台决定并推动同一张 Service Request 继续流转。
          </div>
          <button type="submit" disabled={state.loading || !values.service_request_id} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Save Warranty Claim Decision / 保存保修审核决定</button>
          {state.result ? <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs font-semibold text-slate-100">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>
      </div>
    </section>
  );
}
