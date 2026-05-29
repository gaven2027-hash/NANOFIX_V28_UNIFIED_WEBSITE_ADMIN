'use client';

import { useEffect, useMemo, useState } from 'react';

type ApiPayload = Record<string, unknown>;
type CoreRow = Record<string, unknown>;
type CoreState = {
  loading: boolean;
  refreshedAt: string | null;
  degraded: boolean;
  errors: string[];
  data: Record<string, CoreRow[]>;
};
type ActionState = { loading: boolean; message: string | null; error: string | null };

const groups = [
  { key: 'leads', title: 'Leads', zh: '线索', idField: 'lead_id', machine: 'lead', statusField: 'status', nextStatus: 'qualified', createEnabled: true },
  { key: 'service_requests', title: 'Service Requests', zh: '报修请求', idField: 'service_request_id', machine: 'service_request', statusField: 'status', nextStatus: 'scheduled', createEnabled: true },
  { key: 'jobs', title: 'Jobs', zh: '工单', idField: 'job_id', machine: 'job', statusField: 'status', nextStatus: 'en_route', createEnabled: true },
  { key: 'quotations', title: 'Quotations', zh: '报价', idField: 'quotation_id', machine: 'quotation', statusField: 'approval_status', nextStatus: 'approved', createEnabled: true },
  { key: 'invoices', title: 'Invoices', zh: '发票', idField: 'invoice_id', machine: 'invoice', statusField: 'status', nextStatus: 'sent', createEnabled: true },
  { key: 'payments', title: 'Payments', zh: '付款', idField: 'payment_id', machine: 'payment', statusField: 'status', nextStatus: 'reconciled', createEnabled: true },
  { key: 'warranties', title: 'Warranties', zh: '保修', idField: 'warranty_id', machine: 'warranty', statusField: 'status', nextStatus: 'active', createEnabled: true }
];

function listFromPayload(payload: ApiPayload | null, key: string): CoreRow[] {
  const value = payload?.[key];
  return Array.isArray(value) ? value as CoreRow[] : [];
}

function errorsFromPayload(payload: ApiPayload | null): string[] {
  const errors = payload?.errors;
  if (Array.isArray(errors)) return errors.filter((item): item is string => typeof item === 'string');
  const error = payload?.error;
  return typeof error === 'string' ? [error] : [];
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function shortId(value: unknown) {
  return typeof value === 'string' && value ? value.slice(0, 8) : '—';
}

function rowTitle(row: CoreRow) {
  return String(row.name ?? row.contact_name ?? row.invoice_no ?? row.issue_type ?? row.coverage ?? row.notes ?? 'Record');
}

function defaultCreatePayload(machine: string) {
  return {
    machine,
    title: `Live core ${machine.replaceAll('_', ' ')} test`,
    name: `Live core ${machine.replaceAll('_', ' ')} test`,
    phone: '+65 0000 0000',
    email: 'workflow-test@nanofix.local',
    description: 'Created from Service Operations Live Core board for staging/live verification.',
    issue_type: 'Leakage inspection',
    amount: 0,
    total: 0
  };
}

function updatePayloadFor(active: typeof groups[number], row: CoreRow) {
  if (active.machine === 'lead') return { priority: row.priority === 'P1' ? 'P2' : 'P1', message: 'Updated from Service Operations Live Core board.' };
  if (active.machine === 'service_request') return { preferred_time_text: 'Updated from Service Operations Live Core board.', issue_description: 'Updated from Service Operations Live Core board.' };
  if (active.machine === 'job') return { notes: 'Updated from Service Operations Live Core board.' };
  if (active.machine === 'quotation') return { total: Number(row.total ?? 0) + 1 };
  if (active.machine === 'invoice') return { total: Number(row.total ?? 0) + 1 };
  if (active.machine === 'payment') return { fee: Number(row.fee ?? 0) + 1 };
  if (active.machine === 'warranty') return { coverage: 'Updated from Service Operations Live Core board.' };
  return {};
}

async function fetchCore(): Promise<{ ok: boolean; payload: ApiPayload | null; error: string | null }> {
  try {
    const response = await fetch('/api/admin/service-operations?limit=12', { credentials: 'same-origin', cache: 'no-store' });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try { payload = text ? JSON.parse(text) as ApiPayload : null; } catch { payload = null; }
    const payloadErrors = errorsFromPayload(payload);
    const ok = response.ok && payload?.ok !== false;
    return { ok, payload, error: ok ? null : `/api/admin/service-operations returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}` };
  } catch (error) {
    return { ok: false, payload: null, error: `/api/admin/service-operations failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function fetchDetail(machine: string, objectId: unknown): Promise<{ ok: boolean; payload: ApiPayload | null; error: string | null }> {
  if (typeof objectId !== 'string' || !objectId) return { ok: false, payload: null, error: 'A real UUID object id is required before detail read.' };
  try {
    const response = await fetch(`/api/admin/service-operations?machine=${encodeURIComponent(machine)}&object_id=${encodeURIComponent(objectId)}`, { credentials: 'same-origin', cache: 'no-store' });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try { payload = text ? JSON.parse(text) as ApiPayload : null; } catch { payload = null; }
    const ok = response.ok && payload?.ok !== false;
    const payloadErrors = errorsFromPayload(payload);
    return { ok, payload, error: ok ? null : `GET detail returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}` };
  } catch (error) {
    return { ok: false, payload: null, error: `GET detail failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function postCreate(machine: string): Promise<{ ok: boolean; error: string | null }> {
  try {
    const response = await fetch('/api/admin/service-operations', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(defaultCreatePayload(machine))
    });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try { payload = text ? JSON.parse(text) as ApiPayload : null; } catch { payload = null; }
    const ok = response.ok && payload?.ok !== false;
    const payloadErrors = errorsFromPayload(payload);
    return { ok, error: ok ? null : `POST /api/admin/service-operations returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}` };
  } catch (error) {
    return { ok: false, error: `POST /api/admin/service-operations failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function patchStatus(machine: string, objectId: unknown, toStatus: string): Promise<{ ok: boolean; error: string | null }> {
  if (typeof objectId !== 'string' || !objectId) return { ok: false, error: 'A real UUID object id is required before status update.' };
  try {
    const response = await fetch('/api/admin/service-operations', {
      method: 'PATCH',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ machine, object_id: objectId, to_status: toStatus, reason: 'Updated from Service Operations Live Core board.' })
    });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try { payload = text ? JSON.parse(text) as ApiPayload : null; } catch { payload = null; }
    const ok = response.ok && payload?.ok !== false;
    const payloadErrors = errorsFromPayload(payload);
    return { ok, error: ok ? null : `PATCH /api/admin/service-operations returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}` };
  } catch (error) {
    return { ok: false, error: `PATCH /api/admin/service-operations failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function patchUpdate(active: typeof groups[number], row: CoreRow): Promise<{ ok: boolean; error: string | null }> {
  const objectId = row[active.idField];
  if (typeof objectId !== 'string' || !objectId) return { ok: false, error: 'A real UUID object id is required before record update.' };
  try {
    const response = await fetch('/api/admin/service-operations', {
      method: 'PATCH',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'update', machine: active.machine, object_id: objectId, data: updatePayloadFor(active, row) })
    });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try { payload = text ? JSON.parse(text) as ApiPayload : null; } catch { payload = null; }
    const ok = response.ok && payload?.ok !== false;
    const payloadErrors = errorsFromPayload(payload);
    return { ok, error: ok ? null : `PATCH update returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}` };
  } catch (error) {
    return { ok: false, error: `PATCH update failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function ServiceOperationsLiveCore() {
  const [selectedKey, setSelectedKey] = useState(groups[0].key);
  const [state, setState] = useState<CoreState>({ loading: true, refreshedAt: null, degraded: false, errors: [], data: {} });
  const [action, setAction] = useState<ActionState>({ loading: false, message: null, error: null });
  const [detail, setDetail] = useState<ApiPayload | null>(null);
  const active = useMemo(() => groups.find((group) => group.key === selectedKey) ?? groups[0], [selectedKey]);
  const rows = state.data[active.key] ?? [];
  const statusLogs = state.data.status_logs ?? [];

  async function loadCore() {
    setState((current) => ({ ...current, loading: true }));
    const result = await fetchCore();
    const data = Object.fromEntries([...groups.map((group) => [group.key, listFromPayload(result.payload, group.key)]), ['status_logs', listFromPayload(result.payload, 'status_logs')]]);
    setState({ loading: false, refreshedAt: new Date().toISOString(), degraded: !result.ok, errors: result.error ? [result.error] : [], data });
  }

  async function runWrite(label: string, request: () => Promise<{ ok: boolean; error: string | null }>) {
    setAction({ loading: true, message: null, error: null });
    const result = await request();
    if (!result.ok) {
      setAction({ loading: false, message: null, error: result.error ?? `${label} failed.` });
      return;
    }
    setAction({ loading: false, message: `${label} completed. Live data refreshed. / 已完成并刷新真实数据。`, error: null });
    await loadCore();
  }

  async function advance(row: CoreRow) {
    await runWrite(`Status update to ${active.nextStatus}`, () => patchStatus(active.machine, row[active.idField], active.nextStatus));
  }

  async function createRecord() {
    await runWrite(`Create ${active.title}`, () => postCreate(active.machine));
  }

  async function updateRecord(row: CoreRow) {
    await runWrite(`Update ${active.title}`, () => patchUpdate(active, row));
  }

  async function openDetail(row: CoreRow) {
    setAction({ loading: true, message: null, error: null });
    const result = await fetchDetail(active.machine, row[active.idField]);
    if (!result.ok) {
      setAction({ loading: false, message: null, error: result.error ?? 'Detail read failed.' });
      return;
    }
    setDetail(result.payload?.record && typeof result.payload.record === 'object' ? result.payload.record as ApiPayload : result.payload);
    setAction({ loading: false, message: 'Detail loaded from live API. / 已从真实 API 读取详情。', error: null });
  }

  useEffect(() => { void loadCore(); }, []);

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-gradient-to-br from-sky-500 via-cyan-300 to-blue-600 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/80">Service Operations Live Core / 业务主链路真实核心</div>
            <h2 className="mt-2 text-2xl font-black">Lead → Request → Job → Quote → Invoice → Payment → Warranty</h2>
            <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-white/90">This board reads existing Supabase service-operation tables through a guarded admin API. Create, update, detail and status changes go through `/api/admin/service-operations` and write Audit Logs. / 本面板通过受保护后台 API 读取现有业务表；创建、更新、详情和状态流转都走服务端 API 并写入审计。</p>
          </div>
          <button type="button" onClick={() => void loadCore()} className="rounded-2xl bg-white/20 px-3 py-2 text-xs font-black ring-1 ring-white/30 hover:bg-white/30">{state.loading ? 'Loading… / 读取中' : 'Refresh live core / 刷新真实主链路'}</button>
        </div>
      </div>
      <div className="p-6">
        <div className={`mb-5 rounded-3xl p-4 text-xs font-bold ring-1 ${state.degraded ? 'bg-amber-50 text-amber-950 ring-amber-200' : 'bg-emerald-50 text-emerald-950 ring-emerald-200'}`}>
          {state.degraded ? 'Live core API degraded. / 真实主链路 API 降级。' : 'Live core API ready. / 真实主链路 API 正常。'} Last refresh / 上次刷新: {formatDate(state.refreshedAt)}
          {state.errors.length ? <div className="mt-2 grid gap-2">{state.errors.map((error) => <div key={error} className="rounded-xl bg-white/70 px-3 py-2">{error}</div>)}</div> : null}
        </div>
        {action.loading || action.message || action.error ? <div className={`mb-5 rounded-3xl p-4 text-xs font-bold ring-1 ${action.error ? 'bg-red-50 text-red-950 ring-red-200' : 'bg-blue-50 text-blue-950 ring-blue-200'}`}>{action.loading ? 'Submitting live API action… / 正在提交真实 API 操作…' : action.error ?? action.message}</div> : null}

        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          {groups.map((group) => (
            <button key={group.key} type="button" onClick={() => setSelectedKey(group.key)} className={`rounded-2xl p-4 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${selectedKey === group.key ? 'bg-blue-50 ring-activeBlue' : 'bg-slate-50 ring-slate-200'}`}>
              <div className="text-2xl font-black text-slate-950">{(state.data[group.key] ?? []).length}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-[0.1em] text-activeBlue">{group.title}</div>
              <div className="text-xs font-bold text-slate-500">{group.zh}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-sm font-black text-slate-950">Live actions / 真实操作</div><p className="mt-1 text-xs font-semibold text-slate-500">Create, update, detail and status actions call server API. No local fake success. / 创建、更新、详情和状态都调用服务端 API，不做本地假成功。</p></div>
            <button type="button" disabled={action.loading || !active.createEnabled} onClick={() => void createRecord()} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Create {active.title} / 新增</button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200">
          <div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{active.title} / {active.zh}</div><p className="mt-1 text-sm font-semibold text-slate-600">Live source: /api/admin/service-operations · table group: {active.key}</p></div>
          <div className="grid grid-cols-[1fr_110px_110px] gap-3 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1.5fr_120px_120px_240px]"><span>Record / 记录</span><span>Status</span><span>Created</span><span className="hidden md:block">Action</span></div>
          {rows.length ? rows.map((row) => (
            <div key={String(row[active.idField])} className="grid grid-cols-[1fr_110px_110px] gap-3 border-t border-slate-200 px-5 py-4 text-sm md:grid-cols-[1.5fr_120px_120px_240px]">
              <span><span className="block font-black text-slate-950">{rowTitle(row)}</span><span className="mt-1 block text-xs font-bold text-activeBlue">{shortId(row[active.idField])}</span></span>
              <span className="font-bold text-slate-600">{String(row[active.statusField] ?? '—')}</span>
              <span className="font-bold text-slate-600">{formatDate(row.created_at)}</span>
              <span className="hidden gap-2 md:grid md:grid-cols-3"><button type="button" disabled={action.loading} onClick={() => void openDetail(row)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50">Detail</button><button type="button" disabled={action.loading} onClick={() => void updateRecord(row)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50">Update</button><button type="button" disabled={action.loading} onClick={() => void advance(row)} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Set {active.nextStatus}</button></span>
            </div>
          )) : <div className="border-t border-slate-200 px-5 py-6 text-sm font-bold text-slate-500">No live records returned for this table. / 此表暂无真实返回记录。</div>}
        </div>

        {detail ? <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200"><div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Live Detail / 真实详情</div><p className="mt-1 text-sm font-semibold text-slate-600">Loaded through GET /api/admin/service-operations?machine=...&object_id=...</p></div><pre className="max-h-80 overflow-auto whitespace-pre-wrap p-5 text-xs font-semibold text-slate-700">{JSON.stringify(detail, null, 2)}</pre></div> : null}

        <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200">
          <div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Status Flow & Logs / 状态流转日志</div><p className="mt-1 text-sm font-semibold text-slate-600">Live source: status_transition_logs from /api/admin/service-operations.</p></div>
          {statusLogs.length ? statusLogs.slice(0, 8).map((row) => (
            <div key={String(row.transition_id)} className="grid gap-2 border-t border-slate-200 px-5 py-3 text-sm md:grid-cols-[140px_1fr_1fr_140px]"><span className="font-black text-activeBlue">{String(row.machine ?? 'machine')}</span><span className="font-bold text-slate-600">{String(row.from_status ?? '—')} → {String(row.to_status ?? '—')}</span><span className="font-semibold text-slate-500">{String(row.reason ?? '')}</span><span className="font-bold text-slate-500">{formatDate(row.created_at)}</span></div>
          )) : <div className="border-t border-slate-200 px-5 py-6 text-sm font-bold text-slate-500">No status transition logs returned yet. / 暂无状态流转日志。</div>}
        </div>
      </div>
    </section>
  );
}
