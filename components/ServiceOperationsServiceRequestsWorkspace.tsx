'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; rows: Row[] };

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

async function loadRows() {
  const res = await fetch('/api/admin/service-operations/service-request-list', { credentials: 'same-origin', cache: 'no-store' });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; rows?: Row[]; service_requests?: Row[] } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Service Request API is not connected yet (${res.status}).`);
  return Array.isArray(json?.rows) ? json.rows : Array.isArray(json?.service_requests) ? json.service_requests : [];
}

export function ServiceOperationsServiceRequestsWorkspace() {
  const [state, setState] = useState<State>({ loading: true, error: null, rows: [] });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const rows = await loadRows();
      setState({ loading: false, error: null, rows });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), rows: [] });
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <section id="service-requests-live-workspace" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E.1.1 / Live Service Requests</div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Service Requests Live Workspace / 服务请求真实工作区</h2>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">This workspace must read from a guarded server API. If the API is not connected, it shows a blocked state instead of fake success. / 本工作区必须连接受保护服务端 API；如果接口未连接，会显示阻断状态，不显示假成功。</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中…' : 'Refresh / 刷新'}</button>
      </div>

      {state.error ? (
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">
          Live API blocked or not connected: {state.error}<br />Next required endpoint: /api/admin/service-operations/service-request-list
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="p-3">Request ID</th><th className="p-3">Status</th><th className="p-3">Priority</th><th className="p-3">Origin</th><th className="p-3">Updated</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!state.rows.length ? <tr><td colSpan={5} className="p-4 text-xs font-bold text-slate-500">No live rows loaded. / 暂无真实数据。</td></tr> : state.rows.slice(0, 80).map((row, index) => (
              <tr key={`${text(row.service_request_id)}-${index}`} className="bg-white hover:bg-blue-50/50">
                <td className="p-3 text-xs font-black text-activeBlue">{text(row.service_request_id)}</td>
                <td className="p-3 text-xs font-bold text-slate-700">{text(row.status)}</td>
                <td className="p-3 text-xs font-bold text-slate-700">{text(row.priority)}</td>
                <td className="p-3 text-xs font-bold text-slate-700">{text(row.request_origin)}</td>
                <td className="p-3 text-xs font-semibold text-slate-500">{text(row.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
