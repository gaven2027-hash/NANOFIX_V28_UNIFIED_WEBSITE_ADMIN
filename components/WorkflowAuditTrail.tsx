'use client';

import { useEffect, useMemo, useState } from 'react';

type TaskEvent = {
  event_id?: string;
  task_id?: string | null;
  actor_id?: string | null;
  action?: string | null;
  before_json?: Record<string, unknown> | null;
  after_json?: Record<string, unknown> | null;
  created_at?: string | null;
};

type AuditLog = {
  audit_id?: string;
  actor_id?: string | null;
  actor_role?: string | null;
  role?: string | null;
  action?: string | null;
  object_type?: string | null;
  object_id?: string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  before_json?: Record<string, unknown> | null;
  after_json?: Record<string, unknown> | null;
  created_at?: string | null;
};

type NotificationDelivery = {
  notification_id?: string;
  channel?: string | null;
  target_role?: string | null;
  subject?: string | null;
  delivery_status?: string | null;
  attempt_count?: number | null;
  last_error?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  related_object_type?: string | null;
  related_object_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AuditState = {
  loading: boolean;
  refreshedAt: string | null;
  taskEvents: TaskEvent[];
  auditLogs: AuditLog[];
  notifications: NotificationDelivery[];
  errors: string[];
};

type ApiPayload = Record<string, unknown>;

function listFromPayload<T>(payload: ApiPayload | null, key: string): T[] {
  const value = payload?.[key];
  return Array.isArray(value) ? value as T[] : [];
}

function errorsFromPayload(payload: ApiPayload | null): string[] {
  const errors = payload?.errors;
  if (Array.isArray(errors)) return errors.filter((item): item is string => typeof item === 'string');
  const error = payload?.error;
  return typeof error === 'string' ? [error] : [];
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function shortId(value: string | null | undefined, fallback: string) {
  return value ? value.slice(0, 8) : fallback;
}

async function fetchWorkflowAudit(): Promise<{ ok: boolean; payload: ApiPayload | null; error: string | null }> {
  try {
    const response = await fetch('/api/admin/workflow-audit?limit=12', { credentials: 'same-origin', cache: 'no-store' });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try {
      payload = text ? JSON.parse(text) as ApiPayload : null;
    } catch {
      payload = null;
    }
    const payloadErrors = errorsFromPayload(payload);
    const ok = response.ok && payload?.ok !== false;
    return {
      ok,
      payload,
      error: ok ? null : `/api/admin/workflow-audit returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}`
    };
  } catch (error) {
    return { ok: false, payload: null, error: `/api/admin/workflow-audit failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function WorkflowAuditTrail() {
  const [state, setState] = useState<AuditState>({ loading: true, refreshedAt: null, taskEvents: [], auditLogs: [], notifications: [], errors: [] });

  async function loadAuditTrail() {
    setState((current) => ({ ...current, loading: true }));
    const result = await fetchWorkflowAudit();
    const taskEvents = listFromPayload<TaskEvent>(result.payload, 'task_events');
    const auditLogs = listFromPayload<AuditLog>(result.payload, 'audit_logs');
    const notifications = listFromPayload<NotificationDelivery>(result.payload, 'notification_delivery');
    setState({
      loading: false,
      refreshedAt: new Date().toISOString(),
      taskEvents,
      auditLogs,
      notifications,
      errors: result.error ? [result.error] : []
    });
  }

  useEffect(() => {
    void loadAuditTrail();
  }, []);

  const timeline = useMemo(() => [
    ...state.taskEvents.map((event) => ({
      key: `task-${event.event_id ?? event.task_id ?? event.created_at}`,
      type: 'Task Event / 任务事件',
      title: event.action ?? 'task_event',
      subtitle: `Task ${shortId(event.task_id, '—')} · Actor ${shortId(event.actor_id, 'system')}`,
      status: 'event',
      date: event.created_at
    })),
    ...state.auditLogs.map((log) => ({
      key: `audit-${log.audit_id ?? log.object_id ?? log.created_at}`,
      type: 'Audit Log / 审计日志',
      title: log.action ?? 'audit_action',
      subtitle: `${log.object_type ?? 'object'} ${shortId(log.object_id, '—')} · ${log.role ?? log.actor_role ?? 'role'}`,
      status: 'audit',
      date: log.created_at
    })),
    ...state.notifications.map((item) => ({
      key: `notification-${item.notification_id ?? item.created_at}`,
      type: 'Notification Delivery / 通知投递',
      title: item.subject ?? 'notification',
      subtitle: `${item.channel ?? 'internal'} · ${item.target_role ?? 'role'} · attempts ${item.attempt_count ?? 0}`,
      status: item.delivery_status ?? 'queued',
      date: item.updated_at ?? item.created_at
    }))
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, 18), [state]);

  return (
    <section id="workflow-audit-trail" className="mt-5 scroll-mt-40 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
      <div className="bg-slate-50 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Workflow Audit Trail / 工作流审计轨迹</div>
            <p className="mt-1 text-sm font-semibold text-slate-600">Live source: /api/admin/workflow-audit. Displays task events, audit logs and notification delivery status after write actions.</p>
          </div>
          <button type="button" onClick={() => void loadAuditTrail()} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60" disabled={state.loading}>{state.loading ? 'Loading… / 读取中' : 'Refresh audit / 刷新审计'}</button>
        </div>
      </div>
      <div className="p-5">
        <div className={`mb-4 rounded-2xl p-3 text-xs font-bold ring-1 ${state.errors.length ? 'bg-amber-50 text-amber-950 ring-amber-200' : 'bg-emerald-50 text-emerald-950 ring-emerald-200'}`}>
          {state.errors.length ? 'Audit API degraded. / 审计 API 降级。' : 'Audit trail live binding ready. / 审计轨迹真实数据绑定正常。'} Last refresh / 上次刷新: {formatDate(state.refreshedAt)}
          {state.errors.length ? <div className="mt-2 grid gap-2">{state.errors.map((error) => <div key={error} className="rounded-xl bg-white/70 px-3 py-2">{error}</div>)}</div> : null}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-950">{state.taskEvents.length}</div><div className="text-xs font-black text-slate-500">Task Events / 任务事件</div></div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-950">{state.auditLogs.length}</div><div className="text-xs font-black text-slate-500">Audit Logs / 审计日志</div></div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-950">{state.notifications.length}</div><div className="text-xs font-black text-slate-500">Delivery Status / 投递状态</div></div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="grid grid-cols-[140px_1fr_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[180px_1.4fr_1fr_110px]"><span>Type / 类型</span><span>Action / 动作</span><span className="hidden md:block">Object / 对象</span><span>Status / 状态</span></div>
          {timeline.length ? timeline.map((item) => (
            <div key={item.key} className="grid grid-cols-[140px_1fr_110px] gap-3 border-t border-slate-200 px-4 py-3 text-sm md:grid-cols-[180px_1.4fr_1fr_110px]">
              <span className="font-black text-activeBlue">{item.type}</span>
              <span><span className="block font-black text-slate-950">{item.title}</span><span className="mt-1 block text-xs font-bold text-slate-500">{formatDate(item.date)}</span></span>
              <span className="hidden font-bold text-slate-600 md:block">{item.subtitle}</span>
              <span className="font-black text-slate-700">{item.status}</span>
            </div>
          )) : <div className="border-t border-slate-200 px-4 py-6 text-sm font-bold text-slate-500">No workflow audit records returned yet. / 暂无工作流审计记录。</div>}
        </div>
      </div>
    </section>
  );
}
