'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; submitting: boolean; error: string | null; message: string | null; claims: Row[]; recent_messages: Row[]; result: Row | null };
type Values = { service_request_id: string; followup_status: 'acknowledged' | 'in_follow_up' | 'resolved' | 'internal_note'; reply_body: string; internal_note: string; visible_to_customer: boolean };

async function loadFollowups(satisfaction = 'not_satisfied') {
  const query = satisfaction ? `?satisfaction=${encodeURIComponent(satisfaction)}&limit=100` : '?limit=100';
  const response = await fetch(`/api/admin/service-operations/warranty-claim-satisfaction${query}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; claims?: Row[]; recent_messages?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; claims?: Row[]; recent_messages?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim satisfaction API returned ${response.status}`);
  return { claims: Array.isArray(payload?.claims) ? payload.claims : [], recent_messages: Array.isArray(payload?.recent_messages) ? payload.recent_messages : [] };
}

async function submitFollowup(values: Values) {
  const response = await fetch('/api/admin/service-operations/warranty-claim-satisfaction', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Warranty claim satisfaction follow-up API returned ${response.status}`);
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

export function ServiceOperationsWarrantyClaimSatisfactionFollowupPanel() {
  const [filter, setFilter] = useState('not_satisfied');
  const [state, setState] = useState<State>({ loading: true, submitting: false, error: null, message: null, claims: [], recent_messages: [], result: null });
  const [values, setValues] = useState<Values>({ service_request_id: '', followup_status: 'in_follow_up', reply_body: '', internal_note: '', visible_to_customer: true });

  async function refresh(nextFilter = filter) {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const data = await loadFollowups(nextFilter);
      setState((current) => ({ ...current, loading: false, claims: data.claims, recent_messages: data.recent_messages }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pickClaim(row: Row) {
    setValues((current) => ({
      ...current,
      service_request_id: String(row.service_request_id ?? ''),
      followup_status: String(row.warranty_claim_customer_satisfaction_status) === 'not_satisfied' ? 'in_follow_up' : current.followup_status,
      internal_note: String(row.warranty_claim_customer_satisfaction_notes ?? '')
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.service_request_id || (!values.reply_body.trim() && !values.internal_note.trim())) return;
    setState((current) => ({ ...current, submitting: true, error: null, message: null, result: null }));
    try {
      const result = await submitFollowup(values);
      const data = await loadFollowups(filter);
      setState({ loading: false, submitting: false, error: null, message: 'Follow-up saved. Customer-visible replies will appear in Customer Portal. / 跟进已保存；客户可见回复会显示在客户门户。', claims: data.claims, recent_messages: data.recent_messages, result });
      setValues((current) => ({ ...current, reply_body: '', internal_note: '' }));
    } catch (error) {
      setState((current) => ({ ...current, submitting: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  useEffect(() => { void refresh(filter); }, [filter]);

  const groupedMessages = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const message of state.recent_messages) {
      const id = String(message.service_request_id ?? '');
      if (!map.has(id)) map.set(id, []);
      map.get(id)?.push(message);
    }
    return map;
  }, [state.recent_messages]);

  return (
    <section id="warranty-claim-satisfaction-followup" className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.5.1 / Satisfaction Follow-up</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Claim Satisfaction Follow-up / 保修满意度跟进</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Review customer satisfaction confirmations, prioritise not-satisfied warranty claims, reply to customers, and record internal follow-up. / 集中查看客户满意确认，优先处理不满意保修申请，可回复客户并记录内部跟进。</p>
      </div>
      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_1fr]">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Feedback Queue / 反馈队列</h3>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100">
              <option value="not_satisfied">not_satisfied only</option>
              <option value="reopened">reopened only</option>
              <option value="satisfied">satisfied only</option>
              <option value="">all confirmed</option>
            </select>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          {!state.claims.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No satisfaction feedback found. / 暂无满意度反馈。</div> : state.claims.map((claim) => (
            <button key={String(claim.service_request_id)} type="button" onClick={() => pickClaim(claim)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">{formatValue(claim.contact_name)} · {formatValue(claim.status)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(claim.service_request_id)}</div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-activeBlue ring-1 ring-blue-100">{formatValue(claim.warranty_claim_customer_satisfaction_status)}</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Rating: {formatValue(claim.warranty_claim_customer_satisfaction_rating)}</div>
                <div>Confirmed: {formatValue(claim.warranty_claim_customer_confirmed_at)}</div>
                <div>Reopened: {formatValue(claim.warranty_claim_customer_reopened_at)}</div>
                <div>Priority: {formatValue(claim.priority)}</div>
                <div className="md:col-span-2">Notes: {formatValue(claim.warranty_claim_customer_satisfaction_notes)}</div>
              </div>
              {(groupedMessages.get(String(claim.service_request_id ?? '')) ?? []).slice(0, 2).map((message) => <div key={String(message.message_id)} className="mt-2 rounded-2xl bg-white p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{formatValue(message.sender_type)}: {formatValue(message.message_body)}</div>)}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Follow-up Action / 跟进动作</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input value={values.service_request_id} onChange={(event) => setValues((current) => ({ ...current, service_request_id: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" required /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Follow-up Status<select value={values.followup_status} onChange={(event) => setValues((current) => ({ ...current, followup_status: event.target.value as Values['followup_status'] }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100">
            <option value="acknowledged">acknowledged — customer feedback acknowledged</option>
            <option value="in_follow_up">in_follow_up — active follow-up</option>
            <option value="resolved">resolved — follow-up resolved</option>
            <option value="internal_note">internal_note — internal note only</option>
          </select></label>
          <label className="flex items-center gap-3 rounded-2xl bg-white p-3 text-xs font-black text-slate-700 ring-1 ring-slate-200"><input type="checkbox" checked={values.visible_to_customer} onChange={(event) => setValues((current) => ({ ...current, visible_to_customer: event.target.checked }))} /> Visible to customer / 客户可见</label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Customer Reply / 回复客户<textarea value={values.reply_body} onChange={(event) => setValues((current) => ({ ...current, reply_body: event.target.value }))} maxLength={2000} rows={5} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Internal Note / 内部备注<textarea value={values.internal_note} onChange={(event) => setValues((current) => ({ ...current, internal_note: event.target.value }))} maxLength={2000} rows={4} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Follow-up only updates warranty claim next action, routing status, task state and messages. It does not edit quotations, invoices, warranties or payment records. / 跟进只更新保修申请下一步、路由状态、任务和留言，不会修改报价、发票、保修单或付款记录。</div>
          <button type="submit" disabled={state.submitting || !values.service_request_id || (!values.reply_body.trim() && !values.internal_note.trim())} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.submitting ? 'Saving… / 保存中…' : 'Save Follow-up / 保存跟进'}</button>
        </form>
      </div>
    </section>
  );
}
