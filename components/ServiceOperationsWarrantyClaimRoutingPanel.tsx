'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; routes: Row[]; result: Row | null };
type RouteAction = 'create_warranty_job' | 'create_payable_quote' | 'close_rejected_claim' | 'continue_existing_flow';
type Values = { service_request_id: string; route_action: RouteAction; notes: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

async function fetchRoutes() {
  const response = await fetch('/api/admin/service-operations/warranty-claim-routing?limit=50', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; warranty_claim_routes?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; warranty_claim_routes?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim routing API returned ${response.status}`);
  return Array.isArray(payload?.warranty_claim_routes) ? payload.warranty_claim_routes : [];
}

async function submitRouting(values: Values) {
  const response = await fetch('/api/admin/service-operations/warranty-claim-routing', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Warranty claim routing action returned ${response.status}`);
  return payload ?? { ok: true };
}

function suggestedRoute(decision: unknown): RouteAction {
  if (decision === 'in_warranty') return 'create_warranty_job';
  if (decision === 'out_of_warranty' || decision === 'needs_new_quote') return 'create_payable_quote';
  if (decision === 'rejected') return 'close_rejected_claim';
  return 'continue_existing_flow';
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

export function ServiceOperationsWarrantyClaimRoutingPanel() {
  const [state, setState] = useState<State>({ loading: true, error: null, message: null, routes: [], result: null });
  const [values, setValues] = useState<Values>({ service_request_id: '', route_action: 'create_warranty_job', notes: '' });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const routes = await fetchRoutes();
      setState((current) => ({ ...current, loading: false, error: null, routes }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pickRoute(row: Row) {
    setValues({
      service_request_id: String(row.service_request_id ?? ''),
      route_action: suggestedRoute(row.warranty_claim_decision),
      notes: String(row.warranty_claim_routing_notes ?? row.warranty_claim_decision_notes ?? '')
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await submitRouting(values);
      const routes = await fetchRoutes();
      setState({ loading: false, error: null, message: 'Warranty claim routed into Job / Quotation flow, with task, inbox, notification and audit trail. / 保修申请已进入工单或报价流程，并写入任务、收件箱、通知和审计记录。', routes, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  return (
    <section id="warranty-claim-routing" className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.4.2 / Warranty Claim Routing</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Claim → Job / Quotation Routing / 保修申请转工单或报价</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          After admin review, in-warranty claims become warranty repair jobs. Out-of-warranty or new-quote claims create a draft payable quotation. Rejected claims are closed. / 后台审核后，保修内申请转为保修维修工单；保修外或需重新报价的申请生成收费报价草稿；拒绝的申请关闭。
        </p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Reviewed Warranty Claims / 已审核保修申请</h3>
            <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          {!state.routes.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No reviewed warranty claims ready for routing. / 暂无可路由的保修申请。</div> : state.routes.map((row) => (
            <button key={String(row.service_request_id)} type="button" onClick={() => pickRoute(row)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">{formatValue(row.contact_name)} · {formatValue(row.issue_type)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">Decision: {formatValue(row.warranty_claim_decision)} · Routing: {formatValue(row.warranty_claim_routing_status)}</div>
                </div>
                <Badge>Pick / 选择</Badge>
              </div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Service Request: {formatValue(row.service_request_id)}</div>
                <div>Warranty: {formatValue(row.related_warranty_id)}</div>
                <div>Routed Job: {formatValue(row.warranty_claim_routed_job_id)}</div>
                <div>Routed Quote: {formatValue(row.warranty_claim_routed_quotation_id)}</div>
                <div className="md:col-span-2">Next Action: {formatValue(row.warranty_claim_next_action)}</div>
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Routing Action / 路由动作</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input className={inputClass} value={values.service_request_id} onChange={(event) => setValues((current) => ({ ...current, service_request_id: event.target.value }))} required /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Route Action<select className={inputClass} value={values.route_action} onChange={(event) => setValues((current) => ({ ...current, route_action: event.target.value as RouteAction }))}>
            <option value="create_warranty_job">create_warranty_job — create warranty repair job</option>
            <option value="create_payable_quote">create_payable_quote — create draft payable quotation</option>
            <option value="continue_existing_flow">continue_existing_flow — create job from converted claim</option>
            <option value="close_rejected_claim">close_rejected_claim — close rejected claim</option>
          </select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Routing Notes / 路由备注<textarea className={inputClass} rows={6} value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} placeholder="Scheduling instruction, quotation reason, rejection explanation or operations note." /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">
            Routing uses the original Service Request and does not create a separate customer-side workflow. Draft quotations must still be revised and approved from Internal Admin before customer acceptance. / 路由继续使用原 Service Request，不创建独立客户侧流程；报价草稿仍需后台修改审核后才发给客户确认。
          </div>
          <button type="submit" disabled={state.loading || !values.service_request_id} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Route Warranty Claim / 路由保修申请</button>
          {state.result ? <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs font-semibold text-slate-100">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>
      </div>
    </section>
  );
}
