'use client';

import { FormEvent, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; detail: Row | null };

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

async function loadDetail(serviceRequestId: string) {
  const res = await fetch(`/api/admin/service-operations/service-request-detail?service_request_id=${encodeURIComponent(serviceRequestId)}`, { credentials: 'same-origin', cache: 'no-store' });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; detail?: Row; service_request?: Row } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Service Request detail API is not connected yet (${res.status}).`);
  return json?.detail ?? json?.service_request ?? null;
}

export function ServiceOperationsServiceRequestDetailWorkspace() {
  const [serviceRequestId, setServiceRequestId] = useState('');
  const [state, setState] = useState<State>({ loading: false, error: null, detail: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = serviceRequestId.trim();
    if (!id) {
      setState({ loading: false, error: 'Service Request ID is required. / 请输入服务请求 ID。', detail: null });
      return;
    }
    setState({ loading: true, error: null, detail: null });
    try {
      const detail = await loadDetail(id);
      setState({ loading: false, error: null, detail });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), detail: null });
    }
  }

  return (
    <section id="service-request-detail-live-workspace" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E.1.2 / Live Service Request Detail</div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Service Request Detail Workspace / 服务请求详情工作区</h2>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">Enter a Service Request ID to load the guarded detail API. If the detail API is not connected, this workspace shows a blocked state instead of fake data. / 输入服务请求 ID 读取受保护详情接口；若接口未连接，本区显示阻断状态，不显示假数据。</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-wrap gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <input value={serviceRequestId} onChange={(event) => setServiceRequestId(event.target.value)} className="min-w-80 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Service Request ID / 服务请求 ID" />
        <button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中…' : 'Load Detail / 读取详情'}</button>
      </form>

      {state.error ? (
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">
          Live detail API blocked or not connected: {state.error}<br />Next required endpoint: /api/admin/service-operations/service-request-detail
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {['service_request_id', 'status', 'priority', 'request_origin', 'customer_portal_request_type', 'updated_at'].map((key) => (
          <div key={key} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{key}</div>
            <div className="mt-2 break-words text-sm font-black text-slate-800">{text(state.detail?.[key])}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-200">
        Production rule / 生产规则：Detail, status transition, job creation and audit trail must be served by dedicated guarded APIs before this workspace is marked fully live. / 详情、状态流转、创建工单和审计时间线必须由专用受保护 API 提供后，本区才能标记为完全 live。
      </div>
    </section>
  );
}
