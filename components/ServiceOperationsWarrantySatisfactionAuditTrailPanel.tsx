'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; summary: Row | null; events: Row[]; claims: Row[] };

async function loadAuditTrail(serviceRequestId = '') {
  const q = serviceRequestId ? `?service_request_id=${encodeURIComponent(serviceRequestId)}` : '';
  const res = await fetch(`/api/admin/service-operations/warranty-satisfaction-audit-trail${q}`, { credentials: 'same-origin', cache: 'no-store' });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; summary?: Row; events?: Row[]; claims?: Row[] } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Audit trail API returned ${res.status}`);
  return { summary: json?.summary ?? null, events: json?.events ?? [], claims: json?.claims ?? [] };
}

function t(value: unknown) { return value === null || value === undefined || value === '' ? '—' : String(value); }

export function ServiceOperationsWarrantySatisfactionAuditTrailPanel() {
  const [serviceRequestId, setServiceRequestId] = useState('');
  const [state, setState] = useState<State>({ loading: true, error: null, summary: null, events: [], claims: [] });
  async function refresh(id = serviceRequestId) {
    setState((s) => ({ ...s, loading: true, error: null }));
    try { const data = await loadAuditTrail(id); setState({ loading: false, error: null, ...data }); }
    catch (error) { setState((s) => ({ ...s, loading: false, error: error instanceof Error ? error.message : String(error) })); }
  }
  useEffect(() => { void refresh(''); }, []);
  const csvHref = `/api/admin/service-operations/warranty-satisfaction-audit-trail?format=csv${serviceRequestId ? `&service_request_id=${encodeURIComponent(serviceRequestId)}` : ''}`;
  return (
    <section id="warranty-satisfaction-audit-trail" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.5.4 / Audit Trail & Export</div>
      <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Satisfaction Audit Trail / 保修满意度审计时间线</h2>
      <p className="mt-2 text-sm font-semibold text-slate-600">Read-only audit trail for customer satisfaction, follow-up messages, notifications, status transitions and audit logs. / 只读查看客户满意确认、跟进留言、通知、状态流转和审计日志。</p>
      {state.error ? <div className="mt-4 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <input value={serviceRequestId} onChange={(e) => setServiceRequestId(e.target.value)} className="min-w-80 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800" placeholder="Service Request ID / 可选" />
        <button type="button" onClick={() => void refresh(serviceRequestId)} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中…' : 'Refresh / 刷新'}</button>
        <a href={csvHref} className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">CSV Export / CSV 导出</a>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {['claims','events','messages','notifications','audit_logs'].map((key) => <div key={key} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-950">{t(state.summary?.[key])}</div><div className="mt-1 text-xs font-black text-slate-500">{key}</div></div>)}
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Time</th><th className="p-3">Type</th><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3">Notes</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!state.events.length ? <tr><td colSpan={5} className="p-4 text-xs font-bold text-slate-500">No audit events. / 暂无审计事件。</td></tr> : state.events.slice(0, 60).map((e, i) => <tr key={`${t(e.source_table)}-${t(e.source_id)}-${i}`} className="bg-white hover:bg-blue-50/50"><td className="p-3 text-xs font-bold text-slate-600">{t(e.event_time)}</td><td className="p-3 text-xs font-black text-activeBlue">{t(e.event_type)}</td><td className="p-3 text-xs font-semibold text-slate-700">{t(e.title)}</td><td className="p-3 text-xs font-semibold text-slate-600">{t(e.status)}</td><td className="p-3 text-xs font-semibold text-slate-600">{t(e.notes).slice(0, 180)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">Audit export is read-only. It does not edit quotations, invoices, warranties or payments. / 审计导出为只读，不修改报价、发票、保修或付款。</div>
    </section>
  );
}
