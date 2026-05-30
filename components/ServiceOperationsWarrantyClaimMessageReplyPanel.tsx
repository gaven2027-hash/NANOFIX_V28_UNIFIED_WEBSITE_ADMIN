'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; submitting: boolean; error: string | null; message: string | null; claims: Row[]; messages: Row[]; result: Row | null };
type Values = { service_request_id: string; message_body: string; visible_to_customer: boolean };

async function loadWarrantyMessages(serviceRequestId?: string) {
  const query = serviceRequestId ? `?service_request_id=${encodeURIComponent(serviceRequestId)}` : '?limit=100';
  const response = await fetch(`/api/admin/service-operations/warranty-claim-messages${query}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; claims?: Row[]; messages?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; claims?: Row[]; messages?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim messages API returned ${response.status}`);
  return { claims: Array.isArray(payload?.claims) ? payload.claims : [], messages: Array.isArray(payload?.messages) ? payload.messages : [] };
}

async function submitInternalReply(values: Values) {
  const response = await fetch('/api/admin/service-operations/warranty-claim-messages', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Warranty claim reply API returned ${response.status}`);
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

export function ServiceOperationsWarrantyClaimMessageReplyPanel() {
  const [state, setState] = useState<State>({ loading: true, submitting: false, error: null, message: null, claims: [], messages: [], result: null });
  const [values, setValues] = useState<Values>({ service_request_id: '', message_body: '', visible_to_customer: true });

  async function refresh(serviceRequestId = values.service_request_id) {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const data = await loadWarrantyMessages(serviceRequestId || undefined);
      setState((current) => ({ ...current, loading: false, error: null, claims: data.claims, messages: data.messages }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pickClaim(row: Row) {
    const serviceRequestId = String(row.service_request_id ?? '');
    setValues((current) => ({ ...current, service_request_id: serviceRequestId }));
    void refresh(serviceRequestId);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.service_request_id || !values.message_body.trim()) return;
    setState((current) => ({ ...current, submitting: true, error: null, message: null, result: null }));
    try {
      const result = await submitInternalReply(values);
      const data = await loadWarrantyMessages(values.service_request_id);
      setValues((current) => ({ ...current, message_body: '' }));
      setState({ loading: false, submitting: false, error: null, message: 'Reply saved. Customer-visible replies will appear in the Customer Portal. / 回复已保存；客户可见回复会显示在客户门户。', claims: data.claims, messages: data.messages, result });
    } catch (error) {
      setState((current) => ({ ...current, submitting: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  useEffect(() => { void refresh(''); }, []);

  return (
    <section id="warranty-claim-message-reply" className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.4.7 / Internal Reply</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Claim Message Reply / 保修申请后台回复</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Review customer messages and reply from Internal Admin. Customer-visible replies appear in Customer Portal; internal-only notes stay hidden from customers. / 后台查看客户留言并回复；客户可见回复显示在客户门户，内部备注不向客户显示。</p>
      </div>
      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_1fr]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Warranty Claim Queue / 保修申请队列</h3>
            <button type="button" onClick={() => void refresh('')} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          {!state.claims.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No warranty claims found. / 暂无保修申请。</div> : state.claims.map((claim) => (
            <button key={String(claim.service_request_id)} type="button" onClick={() => pickClaim(claim)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="text-sm font-black text-slate-950">{formatValue(claim.contact_name)} · {formatValue(claim.status)}</div>
              <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(claim.service_request_id)}</div>
              <div className="mt-2 text-xs font-semibold text-slate-600">Decision: {formatValue(claim.warranty_claim_decision)} · Routing: {formatValue(claim.warranty_claim_routing_status)}</div>
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <h3 className="text-sm font-black text-slate-950">Reply / 回复</h3>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input value={values.service_request_id} onChange={(event) => setValues((current) => ({ ...current, service_request_id: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" required /></label>
            <label className="flex items-center gap-3 rounded-2xl bg-white p-3 text-xs font-black text-slate-700 ring-1 ring-slate-200"><input type="checkbox" checked={values.visible_to_customer} onChange={(event) => setValues((current) => ({ ...current, visible_to_customer: event.target.checked }))} /> Visible to customer / 客户可见</label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Message<textarea value={values.message_body} onChange={(event) => setValues((current) => ({ ...current, message_body: event.target.value }))} maxLength={2000} rows={6} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" required /></label>
            <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Replies only add messages. They do not edit quotations, invoices, warranties or payment records. / 回复只新增留言，不会修改报价、发票、保修单或付款记录。</div>
            <button type="submit" disabled={state.submitting || !values.service_request_id || !values.message_body.trim()} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.submitting ? 'Submitting… / 提交中…' : 'Send Reply / 发送回复'}</button>
          </form>
          <section className="grid gap-3 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <h3 className="text-sm font-black text-slate-950">Thread / 留言线程</h3>
            {!state.messages.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No messages for selected claim. / 当前选择的申请暂无留言。</div> : state.messages.map((message) => (
              <article key={String(message.message_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-950">{formatValue(message.sender_type)} · {formatValue(message.sender_role)}</div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-activeBlue ring-1 ring-blue-100">{formatValue(message.created_at)}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{formatValue(message.message_body)}</p>
                <div className="mt-2 text-[11px] font-bold text-slate-500">Customer visible: {formatValue(message.visible_to_customer)} · Internal only: {formatValue(message.internal_only)}</div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </section>
  );
}
