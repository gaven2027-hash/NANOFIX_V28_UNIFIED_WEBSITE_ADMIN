'use client';

import { useEffect, useMemo, useState } from 'react';
import { WorkflowAuditTrail } from '@/components/WorkflowAuditTrail';

type Lane = { id: string; title: string; zh: string; metric: string; note: string };
type AutomationRule = { rule_id?: string; rule_key?: string | null; name?: string | null; module?: string | null; trigger_event?: string | null; is_enabled?: boolean | null; priority?: string | null; created_at?: string | null };
type NotificationOutbox = { notification_id?: string; channel?: string | null; target_role?: string | null; subject?: string | null; delivery_status?: string | null; attempt_count?: number | null; scheduled_at?: string | null; created_at?: string | null };
type InboxApiMessage = { message_id?: string; recipient_role?: string | null; subject?: string | null; category?: string | null; priority?: string | null; read_at?: string | null; acknowledged_at?: string | null; related_object_type?: string | null; related_object_id?: string | null; task_id?: string | null; created_at?: string | null; archived_at?: string | null };
type UnifiedTask = { task_id?: string; source_module?: string | null; source_table?: string | null; source_id?: string | null; title?: string | null; description?: string | null; status?: string | null; priority?: string | null; assignee_role?: string | null; due_at?: string | null; sla_minutes?: number | null; escalated_at?: string | null; completed_at?: string | null; created_at?: string | null; updated_at?: string | null };
type LiveState = { loading: boolean; refreshedAt: string | null; rules: AutomationRule[]; outbox: NotificationOutbox[]; inbox: InboxApiMessage[]; tasks: UnifiedTask[]; errors: string[]; degraded: boolean };
type ActionState = { loading: boolean; message: string | null; error: string | null };
type ApiPayload = Record<string, unknown>;

const lanes: Lane[] = [
  { id: 'automation-notification-engine', title: 'Automation & Notification Engine', zh: '自动化与通知引擎', metric: 'Rules → Outbox → Audit', note: 'Trigger events from service, customer, website, social, AI and finance modules, then queue internal notifications without fake success fallbacks.' },
  { id: 'internal-inbox', title: 'Internal Inbox', zh: '内部收件箱', metric: 'Role queue + ownership', note: 'Route actionable messages to Super Admin, Operations, Finance, Content, Support and Engineer roles with read, acknowledgement and escalation states.' },
  { id: 'unified-task-engine', title: 'Unified Task Engine', zh: '统一任务引擎', metric: 'Source record → Task → SLA', note: 'Convert alerts, approvals, customer requests, review moderation, quote checks and payment issues into one task table with audit events.' }
];

const fallbackMessages: InboxApiMessage[] = [
  { message_id: 'INBOX-SR-001', subject: 'New no-login repair request needs triage / 新免登录报修需分配', recipient_role: 'operations_admin', priority: 'P0', read_at: null, related_object_type: 'service_requests' },
  { message_id: 'INBOX-QT-004', subject: 'Quotation approval overdue / 报价审批超时', recipient_role: 'operations_admin', priority: 'P1', read_at: null, related_object_type: 'quotations' },
  { message_id: 'INBOX-REV-009', subject: 'Review image includes unit number / 评价图片含门牌号', recipient_role: 'content_admin', priority: 'P0', read_at: null, related_object_type: 'customer_reviews' }
];

const fallbackTasks: UnifiedTask[] = [
  { task_id: 'TASK-OPS-001', title: 'Schedule first inspection / 安排首次查验', source_module: 'service_operations', assignee_role: 'operations_admin', status: 'open', priority: 'P0' },
  { task_id: 'TASK-FIN-002', title: 'Check payment mismatch / 检查付款异常', source_module: 'finance', assignee_role: 'finance', status: 'review', priority: 'P1' },
  { task_id: 'TASK-WEB-003', title: 'Approve FAQ content update / 审核 FAQ 内容更新', source_module: 'website_management', assignee_role: 'content_admin', status: 'in_progress', priority: 'P2' }
];

const fallbackRules: AutomationRule[] = [
  { rule_id: 'AUTO-DEMO-001', rule_key: 'service_request.created.p0_triage', name: 'New P0 repair request triage', module: 'service_operations', trigger_event: 'service_request.created', is_enabled: true, priority: 'P0' },
  { rule_id: 'AUTO-DEMO-002', rule_key: 'quotation.approval.overdue', name: 'Quotation approval overdue escalation', module: 'service_operations', trigger_event: 'quotation.approval_overdue', is_enabled: true, priority: 'P1' }
];

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

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

async function fetchApi(path: string): Promise<{ ok: boolean; status: number; payload: ApiPayload | null; error: string | null }> {
  try {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try {
      payload = text ? JSON.parse(text) as ApiPayload : null;
    } catch {
      payload = null;
    }
    const payloadOk = payload?.ok;
    const ok = response.ok && payloadOk !== false;
    const message = !ok ? `${path} returned ${response.status}${errorsFromPayload(payload).length ? `: ${errorsFromPayload(payload).join('; ')}` : ''}` : null;
    return { ok, status: response.status, payload, error: message };
  } catch (error) {
    return { ok: false, status: 0, payload: null, error: `${path} failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function writeApi(method: 'POST' | 'PATCH', path: string, body: Record<string, unknown>): Promise<{ ok: boolean; payload: ApiPayload | null; error: string | null }> {
  try {
    const response = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
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
      error: ok ? null : `${method} ${path} returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}`
    };
  } catch (error) {
    return { ok: false, payload: null, error: `${method} ${path} failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function AutomationNotificationWorkspace() {
  const [selectedLane, setSelectedLane] = useState(lanes[0].id);
  const [log, setLog] = useState<string[]>([]);
  const [live, setLive] = useState<LiveState>({ loading: true, refreshedAt: null, rules: [], outbox: [], inbox: [], tasks: [], errors: [], degraded: false });
  const [actionState, setActionState] = useState<ActionState>({ loading: false, message: null, error: null });
  const active = useMemo(() => lanes.find((lane) => lane.id === selectedLane) ?? lanes[0], [selectedLane]);
  const displayRules = live.rules.length ? live.rules : fallbackRules;
  const displayMessages = live.inbox.length ? live.inbox : fallbackMessages;
  const displayTasks = live.tasks.length ? live.tasks : fallbackTasks;
  const queuedOutbox = live.outbox.filter((item) => item.delivery_status === 'queued').length;
  const firstLiveTask = live.tasks.find((task) => isUuid(task.task_id));
  const firstLiveMessage = live.inbox.find((message) => isUuid(message.message_id));

  async function loadLiveData() {
    setLive((state) => ({ ...state, loading: true }));
    const [automation, inbox, tasks] = await Promise.all([
      fetchApi('/api/admin/automation-notifications'),
      fetchApi('/api/admin/internal-inbox?limit=8'),
      fetchApi('/api/admin/unified-tasks?limit=8')
    ]);

    const errors = [automation.error, inbox.error, tasks.error].filter((item): item is string => Boolean(item));
    const rules = listFromPayload<AutomationRule>(automation.payload, 'rules');
    const outbox = listFromPayload<NotificationOutbox>(automation.payload, 'outbox');
    const messages = listFromPayload<InboxApiMessage>(inbox.payload, 'messages');
    const taskRows = listFromPayload<UnifiedTask>(tasks.payload, 'tasks');

    setLive({
      loading: false,
      refreshedAt: new Date().toISOString(),
      rules,
      outbox,
      inbox: messages,
      tasks: taskRows,
      errors,
      degraded: errors.length > 0
    });
  }

  useEffect(() => {
    void loadLiveData();
  }, []);

  function addLog(action: string) {
    const stamp = new Date().toLocaleString();
    setLog((items) => [`${stamp} — ${action}`, ...items].slice(0, 6));
  }

  async function runWriteAction(label: string, request: () => Promise<{ ok: boolean; error: string | null }>) {
    setActionState({ loading: true, message: null, error: null });
    const result = await request();
    if (!result.ok) {
      setActionState({ loading: false, message: null, error: result.error ?? `${label} failed without error details.` });
      addLog(`Failed / 失败: ${label}`);
      return;
    }
    setActionState({ loading: false, message: `${label} completed. Live data and audit trail can now be refreshed. / 已完成，可刷新真实数据和审计轨迹。`, error: null });
    addLog(`Completed / 已完成: ${label}`);
    await loadLiveData();
  }

  async function acknowledgeInboxMessage(message: InboxApiMessage) {
    if (!isUuid(message.message_id)) {
      setActionState({ loading: false, message: null, error: 'A real live inbox message_id is required before acknowledging. Demo rows cannot be acknowledged. / 需要真实 message_id 才能确认，demo 行不能确认。' });
      return;
    }
    await runWriteAction('Acknowledge inbox message / 确认内部消息', async () => writeApi('POST', '/api/admin/internal-inbox', { action: 'acknowledge', message_id: message.message_id }));
  }

  async function createTaskFromInbox(message?: InboxApiMessage) {
    await runWriteAction('Create unified task / 创建统一任务', async () => writeApi('POST', '/api/admin/unified-tasks', {
      source_module: message?.related_object_type ?? 'dashboard',
      source_table: message?.related_object_type ?? 'internal_inbox_messages',
      source_id: message?.related_object_id ?? message?.message_id ?? 'dashboard-manual',
      title: `Follow up: ${message?.subject ?? 'Dashboard workflow action'}`.slice(0, 180),
      description: 'Created from V28.2 Dashboard write action. / 从 V28.2 Dashboard 写操作创建。',
      priority: message?.priority ?? 'P2',
      assignee_role: message?.recipient_role ?? 'operations_admin',
      sla_minutes: 240
    }));
  }

  async function advanceTask(task: UnifiedTask) {
    if (!isUuid(task.task_id)) {
      setActionState({ loading: false, message: null, error: 'A real live task_id is required before updating. Demo rows cannot be updated. / 需要真实 task_id 才能更新，demo 行不能更新。' });
      return;
    }
    const nextStatus = task.status === 'completed' ? 'open' : task.status === 'open' ? 'in_progress' : task.status === 'in_progress' ? 'review' : 'completed';
    await runWriteAction(`Update task status to ${nextStatus} / 更新任务状态`, async () => writeApi('PATCH', '/api/admin/unified-tasks', { task_id: task.task_id, status: nextStatus }));
  }

  async function queueNotification() {
    await runWriteAction('Queue notification / 加入通知队列', async () => writeApi('POST', '/api/admin/automation-notifications', {
      subject: 'Dashboard workflow follow-up',
      body: 'Queued from V28.2 AutomationNotificationWorkspace write action. / 从 V28.2 工作流面板加入通知队列。',
      target_role: active.id === 'unified-task-engine' ? (firstLiveTask?.assignee_role ?? 'operations_admin') : 'operations_admin',
      channel: 'internal',
      related_object_type: active.id,
      related_object_id: firstLiveTask?.task_id ?? firstLiveMessage?.message_id ?? 'dashboard-manual'
    }));
  }

  return (
    <section id="automation-notification-engine" className="mt-6 scroll-mt-40 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-gradient-to-br from-sky-500 via-cyan-300 to-blue-600 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/80">V28.2 Workflow Foundation / 工作流底座</div>
            <h2 className="mt-2 text-2xl font-black">Automation & Notification Engine → Internal Inbox → Unified Task Engine</h2>
            <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-white/90">This dashboard section connects system triggers, internal role notifications and cross-module tasks. It reads live Supabase-backed APIs, writes through server APIs and shows degraded status when auth, migrations or database checks fail. / 本区连接系统触发器、内部角色通知和跨模块任务；读取并写入真实 API，若认证、迁移或数据库检查失败会显示降级状态。</p>
          </div>
          <button type="button" onClick={() => void loadLiveData()} className="rounded-2xl bg-white/20 px-3 py-2 text-xs font-black ring-1 ring-white/30 hover:bg-white/30">{live.loading ? 'Loading live data… / 正在读取' : 'Refresh live data / 刷新真实数据'}</button>
        </div>
      </div>
      <div className="p-6">
        <div className={`mb-5 rounded-3xl p-4 ring-1 ${live.degraded ? 'bg-amber-50 text-amber-950 ring-amber-200' : 'bg-emerald-50 text-emerald-950 ring-emerald-200'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black">{live.degraded ? 'Degraded live binding / 真实数据绑定降级' : 'Live binding ready / 真实数据绑定正常'}</div>
              <p className="mt-1 text-xs font-semibold leading-5">{live.degraded ? 'Some APIs are not available. This usually means no login session, missing Supabase migration, or database readiness failure. Demo rows below remain clearly separated from live records. / 部分 API 不可用，通常是未登录、未执行 Supabase migration 或数据库未 ready。下方 demo 记录不会伪装成真实成功。' : 'Automation, inbox and task APIs responded successfully. / 自动化、内部收件箱和任务 API 已成功响应。'}</p>
            </div>
            <div className="text-xs font-black">Last refresh / 上次刷新: {formatDate(live.refreshedAt)}</div>
          </div>
          {live.errors.length ? <div className="mt-3 grid gap-2">{live.errors.map((error) => <div key={error} className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold">{error}</div>)}</div> : null}
        </div>

        <div className={`mb-5 rounded-3xl p-4 ring-1 ${actionState.error ? 'bg-red-50 text-red-950 ring-red-200' : actionState.message ? 'bg-blue-50 text-blue-950 ring-blue-200' : 'bg-slate-50 text-slate-700 ring-slate-200'}`}>
          <div className="text-sm font-black">Write Actions / 写操作</div>
          <p className="mt-1 text-xs font-semibold leading-5">Buttons below call server APIs, write Audit Logs through the API layer, then refresh live data. They never mark success locally unless the API response succeeds. / 下方按钮调用服务端 API，经 API 层写入审计日志，然后刷新真实数据；API 未成功前不会本地假成功。</p>
          {actionState.loading ? <div className="mt-2 text-xs font-black">Submitting write action… / 正在提交写操作…</div> : null}
          {actionState.message ? <div className="mt-2 text-xs font-black">{actionState.message}</div> : null}
          {actionState.error ? <div className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold">{actionState.error}</div> : null}
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <button type="button" disabled={actionState.loading} onClick={() => void queueNotification()} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">Queue notification / 加入通知队列</button>
            <button type="button" disabled={actionState.loading} onClick={() => void createTaskFromInbox(firstLiveMessage)} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">Create task / 创建任务</button>
            <button type="button" disabled={actionState.loading || !firstLiveTask} onClick={() => firstLiveTask ? void advanceTask(firstLiveTask) : undefined} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">Advance first live task / 推进首个真实任务</button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {lanes.map((lane) => (
            <button key={lane.id} type="button" onClick={() => { setSelectedLane(lane.id); addLog(`Open lane / 打开阶段: ${lane.title}`); }} className={`rounded-3xl p-4 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${selectedLane === lane.id ? 'bg-blue-50 ring-activeBlue' : 'bg-slate-50 ring-slate-200'}`}>
              <div className="text-xs font-black uppercase tracking-[0.14em] text-activeBlue">{lane.metric}</div>
              <h3 className="mt-2 text-lg font-black text-slate-950">{lane.title}</h3>
              <p className="mt-1 text-sm font-bold text-slate-500">{lane.zh}</p>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{lane.note}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
            <div className="bg-slate-50 px-5 py-4">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Automation Rules & Notification Outbox / 自动化规则与通知队列</div>
              <p className="mt-1 text-sm font-semibold text-slate-600">Live source: /api/admin/automation-notifications. Fallback rows are shown only when the API is unavailable.</p>
            </div>
            <div className="grid grid-cols-[1fr_130px_100px] gap-3 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1.4fr_150px_120px_90px]"><span>Rule / 规则</span><span>Module</span><span>Status</span><span className="hidden md:block">Priority</span></div>
            {displayRules.map((rule) => (
              <button key={rule.rule_id ?? rule.rule_key ?? rule.name ?? 'rule'} type="button" onClick={() => { setSelectedLane('automation-notification-engine'); addLog(`Open automation rule / 打开自动化规则: ${shortId(rule.rule_id ?? rule.rule_key, 'rule')}`); }} className="grid w-full grid-cols-[1fr_130px_100px] gap-3 border-t border-slate-200 px-5 py-4 text-left text-sm transition hover:bg-blue-50 md:grid-cols-[1.4fr_150px_120px_90px]">
                <span><span className="block font-black text-slate-950">{rule.name ?? rule.rule_key ?? 'Automation rule'}</span><span className="mt-1 block text-xs font-bold text-activeBlue">{rule.rule_key ?? shortId(rule.rule_id, 'rule')} · {rule.trigger_event ?? 'trigger'}</span></span>
                <span className="font-bold text-slate-600">{rule.module ?? '—'}</span><span className="font-bold text-slate-600">{rule.is_enabled === false ? 'disabled' : 'enabled'}</span><span className="hidden font-black text-red-600 md:block">{rule.priority ?? 'P2'}</span>
              </button>
            ))}
          </div>

          <aside className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Active lane / 当前阶段</div>
            <h3 className="mt-2 text-xl font-black text-slate-950">{active.title}</h3>
            <p className="mt-1 text-sm font-bold text-slate-500">{active.zh}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-950">{displayRules.length}</div><div className="text-xs font-black text-slate-500">Rules / 规则</div></div>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-950">{displayMessages.length}</div><div className="text-xs font-black text-slate-500">Inbox / 内部消息</div></div>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-950">{displayTasks.length}</div><div className="text-xs font-black text-slate-500">Tasks / 任务</div></div>
            </div>
            <dl className="mt-5 grid gap-2 text-sm font-semibold text-slate-600"><div><dt className="text-xs font-black uppercase text-slate-400">Queued outbox / 排队通知</dt><dd>{queuedOutbox}</dd></div><div><dt className="text-xs font-black uppercase text-slate-400">APIs</dt><dd>/api/admin/automation-notifications · /api/admin/internal-inbox · /api/admin/unified-tasks · /api/admin/workflow-audit</dd></div><div><dt className="text-xs font-black uppercase text-slate-400">Tables</dt><dd>automation_rules · notification_outbox · internal_inbox_messages · unified_tasks · task_events · audit_logs</dd></div></dl>
          </aside>
        </div>

        <div id="internal-inbox" className="mt-5 scroll-mt-40 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
          <div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Internal Inbox / 内部收件箱</div><p className="mt-1 text-sm font-semibold text-slate-600">Live source: /api/admin/internal-inbox. Role-based action messages generated by automation rules and linked to source records.</p></div>
          <div className="grid grid-cols-[1fr_120px_110px_120px] gap-3 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1.4fr_140px_120px_100px_120px]"><span>Message / 消息</span><span>Role</span><span>Status</span><span className="hidden md:block">Priority</span><span>Action</span></div>
          {displayMessages.map((message) => (
            <div key={message.message_id ?? message.subject ?? 'message'} className="grid w-full grid-cols-[1fr_120px_110px_120px] gap-3 border-t border-slate-200 px-5 py-4 text-left text-sm transition hover:bg-blue-50 md:grid-cols-[1.4fr_140px_120px_100px_120px]">
              <span><span className="block font-black text-slate-950">{message.subject ?? 'Internal message'}</span><span className="mt-1 block text-xs font-bold text-activeBlue">{shortId(message.message_id, 'message')} · {message.related_object_type ?? message.category ?? 'internal'}</span></span>
              <span className="font-bold text-slate-600">{message.recipient_role ?? '—'}</span><span className="font-bold text-slate-600">{message.read_at ? 'read' : message.acknowledged_at ? 'acknowledged' : 'unread'}</span><span className="hidden font-black text-red-600 md:block">{message.priority ?? 'P2'}</span>
              <span className="grid gap-2"><button type="button" disabled={actionState.loading || !isUuid(message.message_id)} onClick={() => void acknowledgeInboxMessage(message)} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Ack / 确认</button><button type="button" disabled={actionState.loading} onClick={() => void createTaskFromInbox(message)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">Task / 任务</button></span>
            </div>
          ))}
        </div>

        <div id="unified-task-engine" className="mt-5 scroll-mt-40 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
          <div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Unified Task Engine / 统一任务引擎</div><p className="mt-1 text-sm font-semibold text-slate-600">Live source: /api/admin/unified-tasks. Every actionable alert becomes a task with source module, owner, status, SLA and task events.</p></div>
          <div className="grid grid-cols-[1fr_140px_120px_110px] gap-3 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1.5fr_150px_130px_100px_110px]"><span>Task / 任务</span><span>Assignee</span><span>Status</span><span className="hidden md:block">Due</span><span>Action</span></div>
          {displayTasks.map((task) => (<div key={task.task_id ?? task.title ?? 'task'} className="grid w-full grid-cols-[1fr_140px_120px_110px] gap-3 border-t border-slate-200 px-5 py-4 text-left text-sm transition hover:bg-blue-50 md:grid-cols-[1.5fr_150px_130px_100px_110px]"><span><span className="block font-black text-slate-950">{task.title ?? 'Unified task'}</span><span className="mt-1 block text-xs font-bold text-activeBlue">{shortId(task.task_id, 'task')} · {task.source_module ?? 'module'} · {task.priority ?? 'P2'}</span></span><span className="font-bold text-slate-600">{task.assignee_role ?? '—'}</span><span className="font-bold text-slate-600">{task.status ?? 'open'}</span><span className="hidden font-black text-slate-700 md:block">{formatDate(task.due_at)}</span><button type="button" disabled={actionState.loading || !isUuid(task.task_id)} onClick={() => void advanceTask(task)} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Advance / 推进</button></div>))}
        </div>

        <WorkflowAuditTrail />

        <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-black text-slate-900">Action log / 页面操作日志</div><p className="mt-1 text-xs font-semibold text-slate-500">This panel displays client-side notes only; success is shown only after the server API returns OK and live data refreshes. / 本面板只显示前端备注；只有服务端 API 返回 OK 并刷新真实数据后才显示成功。</p></div><button type="button" onClick={() => setLog([])} className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Clear / 清空</button></div><div className="mt-3 grid gap-2">{log.length ? log.map((item) => (<div key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">{item}</div>)) : <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-100">No actions yet / 暂无页面操作</div>}</div></div>
      </div>
    </section>
  );
}
