'use client';

import { useMemo, useState } from 'react';

type Lane = { id: string; title: string; zh: string; metric: string; note: string };
type InboxMessage = { id: string; subject: string; owner: string; priority: string; status: string; source: string };
type TaskRow = { id: string; title: string; module: string; assignee: string; status: string; due: string };

const lanes: Lane[] = [
  { id: 'automation-notification-engine', title: 'Automation & Notification Engine', zh: '自动化与通知引擎', metric: 'Rules → Outbox → Audit', note: 'Trigger events from service, customer, website, social, AI and finance modules, then queue internal notifications without fake success fallbacks.' },
  { id: 'internal-inbox', title: 'Internal Inbox', zh: '内部收件箱', metric: 'Role queue + ownership', note: 'Route actionable messages to Super Admin, Operations, Finance, Content, Support and Engineer roles with read, acknowledgement and escalation states.' },
  { id: 'unified-task-engine', title: 'Unified Task Engine', zh: '统一任务引擎', metric: 'Source record → Task → SLA', note: 'Convert alerts, approvals, customer requests, review moderation, quote checks and payment issues into one task table with audit events.' }
];

const messages: InboxMessage[] = [
  { id: 'INBOX-SR-001', subject: 'New no-login repair request needs triage / 新免登录报修需分配', owner: 'Operations', priority: 'P0', status: 'unread', source: 'service_requests' },
  { id: 'INBOX-QT-004', subject: 'Quotation approval overdue / 报价审批超时', owner: 'Admin', priority: 'P1', status: 'ack_required', source: 'quotations' },
  { id: 'INBOX-REV-009', subject: 'Review image includes unit number / 评价图片含门牌号', owner: 'Customer Center', priority: 'P0', status: 'redaction_required', source: 'customer_reviews' }
];

const tasks: TaskRow[] = [
  { id: 'TASK-OPS-001', title: 'Schedule first inspection / 安排首次查验', module: 'Service Operations', assignee: 'Operations', status: 'open', due: 'Today' },
  { id: 'TASK-FIN-002', title: 'Check payment mismatch / 检查付款异常', module: 'Finance', assignee: 'Finance', status: 'in_progress', due: 'Tomorrow' },
  { id: 'TASK-WEB-003', title: 'Approve FAQ content update / 审核 FAQ 内容更新', module: 'Website Management', assignee: 'Content Admin', status: 'review', due: '2 days' }
];

export function AutomationNotificationWorkspace() {
  const [selectedLane, setSelectedLane] = useState(lanes[0].id);
  const [log, setLog] = useState<string[]>([]);
  const active = useMemo(() => lanes.find((lane) => lane.id === selectedLane) ?? lanes[0], [selectedLane]);

  function addLog(action: string) {
    const stamp = new Date().toLocaleString();
    setLog((items) => [`${stamp} — ${action}`, ...items].slice(0, 6));
  }

  return (
    <section id="automation-notification-engine" className="mt-6 scroll-mt-40 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-gradient-to-br from-sky-500 via-cyan-300 to-blue-600 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/80">V28.2 Workflow Foundation / 工作流底座</div>
            <h2 className="mt-2 text-2xl font-black">Automation & Notification Engine → Internal Inbox → Unified Task Engine</h2>
            <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-white/90">This dashboard section connects system triggers, internal role notifications and cross-module tasks. It is designed for real Supabase tables, RBAC checks and Audit Logs, not localStorage or visual-only success states. / 本区连接系统触发器、内部角色通知和跨模块任务，面向真实 Supabase 表、权限检查和审计日志，不使用 localStorage 或假成功状态。</p>
          </div>
          <span className="rounded-2xl bg-white/20 px-3 py-2 text-xs font-black ring-1 ring-white/30">Stage active / 阶段已启用</span>
        </div>
      </div>
      <div className="p-6">
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
            <div id="internal-inbox" className="scroll-mt-40 bg-slate-50 px-5 py-4">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Internal Inbox / 内部收件箱</div>
              <p className="mt-1 text-sm font-semibold text-slate-600">Role-based action messages generated by automation rules and linked to real source records.</p>
            </div>
            <div className="grid grid-cols-[1fr_120px_110px] gap-3 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1.4fr_140px_120px_100px]"><span>Message / 消息</span><span>Owner</span><span>Status</span><span className="hidden md:block">Priority</span></div>
            {messages.map((message) => (
              <button key={message.id} type="button" onClick={() => addLog(`Acknowledge inbox message / 确认内部消息: ${message.id}`)} className="grid w-full grid-cols-[1fr_120px_110px] gap-3 border-t border-slate-200 px-5 py-4 text-left text-sm transition hover:bg-blue-50 md:grid-cols-[1.4fr_140px_120px_100px]">
                <span><span className="block font-black text-slate-950">{message.subject}</span><span className="mt-1 block text-xs font-bold text-activeBlue">{message.id} · {message.source}</span></span>
                <span className="font-bold text-slate-600">{message.owner}</span><span className="font-bold text-slate-600">{message.status}</span><span className="hidden font-black text-red-600 md:block">{message.priority}</span>
              </button>
            ))}
          </div>
          <aside className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Active lane / 当前阶段</div>
            <h3 className="mt-2 text-xl font-black text-slate-950">{active.title}</h3>
            <p className="mt-1 text-sm font-bold text-slate-500">{active.zh}</p>
            <div className="mt-4 grid gap-2">{['Load live Supabase summary / 读取真实 Supabase 汇总', 'Create test task with inbox message / 创建测试任务与内部消息', 'Open Audit Logs mapping / 打开审计日志映射'].map((action) => (<button key={action} type="button" onClick={() => addLog(action)} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700">{action}</button>))}</div>
            <dl className="mt-5 grid gap-2 text-sm font-semibold text-slate-600"><div><dt className="text-xs font-black uppercase text-slate-400">APIs</dt><dd>/api/admin/automation-notifications · /api/admin/internal-inbox · /api/admin/unified-tasks</dd></div><div><dt className="text-xs font-black uppercase text-slate-400">Tables</dt><dd>automation_rules · notification_outbox · internal_inbox_messages · unified_tasks · task_events</dd></div></dl>
          </aside>
        </div>
        <div id="unified-task-engine" className="mt-5 scroll-mt-40 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
          <div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Unified Task Engine / 统一任务引擎</div><p className="mt-1 text-sm font-semibold text-slate-600">Every actionable alert becomes a task with source module, owner, status, SLA and task events.</p></div>
          <div className="grid grid-cols-[1fr_140px_120px] gap-3 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1.5fr_150px_130px_100px]"><span>Task / 任务</span><span>Assignee</span><span>Status</span><span className="hidden md:block">Due</span></div>
          {tasks.map((task) => (<button key={task.id} type="button" onClick={() => addLog(`Update unified task / 更新统一任务: ${task.id}`)} className="grid w-full grid-cols-[1fr_140px_120px] gap-3 border-t border-slate-200 px-5 py-4 text-left text-sm transition hover:bg-blue-50 md:grid-cols-[1.5fr_150px_130px_100px]"><span><span className="block font-black text-slate-950">{task.title}</span><span className="mt-1 block text-xs font-bold text-activeBlue">{task.id} · {task.module}</span></span><span className="font-bold text-slate-600">{task.assignee}</span><span className="font-bold text-slate-600">{task.status}</span><span className="hidden font-black text-slate-700 md:block">{task.due}</span></button>))}
        </div>
        <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-black text-slate-900">Action log / 页面操作日志</div><p className="mt-1 text-xs font-semibold text-slate-500">UI actions here mirror the future server-side Audit Logs mapping. / 这里的操作对应未来服务端审计日志映射。</p></div><button type="button" onClick={() => setLog([])} className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Clear / 清空</button></div><div className="mt-3 grid gap-2">{log.length ? log.map((item) => (<div key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">{item}</div>)) : <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-100">No actions yet / 暂无页面操作</div>}</div></div>
      </div>
    </section>
  );
}
