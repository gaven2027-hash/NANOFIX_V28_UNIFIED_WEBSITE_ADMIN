'use client';

import { useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

const slaRules = [
  { id: 'SLA-001', workflow: 'New repair response', zh: '新报修响应', sla: '15 min', owner: 'Operations', escalation: 'P0 → Super Admin after 30 min', channel: 'Dashboard + WhatsApp' },
  { id: 'SLA-002', workflow: 'Inspection scheduling', zh: '查验安排', sla: '4 hours', owner: 'Operations', escalation: 'P1 → Admin after 6 hours', channel: 'Dashboard + Email' },
  { id: 'SLA-003', workflow: 'Quotation approval', zh: '报价审批', sla: '24 hours', owner: 'Admin', escalation: 'P0 → Super Admin takeover', channel: 'Dashboard + Internal Inbox' },
  { id: 'SLA-004', workflow: 'Invoice payment follow-up', zh: '发票付款跟进', sla: '24 hours', owner: 'Finance', escalation: 'P1 → Finance lead', channel: 'Email + Internal Inbox' },
  { id: 'SLA-005', workflow: 'Warranty claim reply', zh: '保修范围回复', sla: '1 day', owner: 'Operations', escalation: 'P1 → Super Admin review', channel: 'Customer Portal + WhatsApp' }
];

const notifications = [
  { id: 'NOT-001', title: 'Repair request received', zh: '报修已收到', target: 'Customer + Operations', trigger: 'public_service_request.created', status: 'active' },
  { id: 'NOT-002', title: 'Quotation overdue warning', zh: '报价超时预警', target: 'Admin + Super Admin', trigger: 'quotation.approval_overdue', status: 'active' },
  { id: 'NOT-003', title: 'Payment confirmed', zh: '付款确认', target: 'Customer + Finance', trigger: 'payment.confirmed', status: 'active' },
  { id: 'NOT-004', title: 'Review approved for website', zh: '评价批准展示', target: 'Website CMS + Customer Center', trigger: 'review.approved', status: 'draft' }
];

const timeline = [
  ['09:10', 'Customer submitted repair request / 客户提交报修', 'Customer Portal'],
  ['09:12', 'Operations notified / 已通知运营', 'Internal Inbox'],
  ['09:25', 'AI scored lead priority P0 / AI 判定 P0', 'AI Engine'],
  ['10:40', 'Inspection scheduling overdue warning / 查验排程超时提醒', 'SLA Engine'],
  ['10:55', 'Super Admin takeover recommended / 建议总管理员接管', 'Dashboard']
];

function statusTone(status: string) {
  if (status === 'active') return 'green';
  if (status === 'draft') return 'blue';
  return 'amber';
}

export function AutomationNotificationWorkspace() {
  const [selected, setSelected] = useState(slaRules[0]);
  const [logs, setLogs] = useState<string[]>([]);

  function log(action: string) {
    setLogs((current) => [`${new Date().toLocaleString()} — ${action} — ${selected.id}`, ...current].slice(0, 6));
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Workflow SLA Engine / 流程 SLA 引擎" subtitle="Define response time, owner, escalation and notification channel for each core workflow. / 为每个核心流程设置响应时限、负责人、升级规则和通知渠道。">
        <div id="workflow-sla-engine" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[1fr_90px_120px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1fr_90px_120px_190px]">
              <span>Workflow / 流程</span><span>SLA</span><span>Owner</span><span className="hidden md:block">Channel</span>
            </div>
            {slaRules.map((rule) => (
              <button key={rule.id} type="button" onClick={() => setSelected(rule)} className={`grid w-full grid-cols-[1fr_90px_120px] gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-blue-50 md:grid-cols-[1fr_90px_120px_190px] ${selected.id === rule.id ? 'bg-sky-50' : 'bg-white'}`}>
                <span><span className="block font-black text-slate-900">{rule.workflow}</span><span className="block text-xs font-semibold text-slate-500">{rule.zh} · {rule.id}</span></span>
                <span className="font-black text-activeBlue">{rule.sla}</span>
                <span className="font-bold text-slate-600">{rule.owner}</span>
                <span className="hidden text-xs font-bold text-slate-500 md:block">{rule.channel}</span>
              </button>
            ))}
          </div>

          <aside className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-300 to-blue-600 p-5 text-white">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-white/75">Selected SLA / 当前规则</div>
              <h3 className="mt-2 text-xl font-black">{selected.workflow}</h3>
              <p className="mt-1 text-sm font-bold text-white/85">{selected.zh}</p>
            </div>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-3"><b>Escalation:</b> {selected.escalation}</div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>Channel:</b> {selected.channel}</div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>Rule:</b> P0 can notify WhatsApp + Dashboard; P1 uses Dashboard + Email; P2 stays in internal inbox.</div>
            </div>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={() => log('Save SLA rule / 保存 SLA 规则')} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700">Save SLA rule / 保存 SLA 规则</button>
              <button type="button" onClick={() => log('Test notification / 测试通知')} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-200">Test notification / 测试通知</button>
              <button type="button" onClick={() => log('Super Admin force escalation / 总管理员强制升级')} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700">Force escalation / 强制升级</button>
            </div>
          </aside>
        </div>
      </SectionCard>

      <SectionCard title="Notification Rules / 通知规则中心" subtitle="Every notification must have trigger, target, channel and audit trail. / 每条通知必须有触发事件、目标对象、通道和审计记录。">
        <div id="notification-rules" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {notifications.map((item) => (
            <button key={item.id} type="button" className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:ring-1 hover:ring-activeBlue">
              <div className="flex items-center justify-between gap-3"><span className="font-black text-slate-900">{item.title}</span><Badge tone={statusTone(item.status)}>{item.status}</Badge></div>
              <div className="mt-1 text-xs font-semibold text-slate-500">{item.zh}</div>
              <div className="mt-3 text-xs font-bold text-slate-600">Target: {item.target}</div>
              <div className="mt-1 text-xs font-black text-activeBlue">{item.trigger}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Customer Timeline & Escalation / 客户时间线与升级" subtitle="Customer-facing and internal events are merged into one timeline for follow-up, SLA and Super Admin takeover decisions. / 客户事件和内部事件合并到同一时间线，用于跟进、SLA 和总管理员接管判断。">
        <div id="customer-timeline-escalation" className="space-y-3">
          {timeline.map(([time, event, source]) => (
            <div key={`${time}-${event}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[80px_1fr_180px]">
              <div className="font-black text-activeBlue">{time}</div>
              <div className="font-bold text-slate-800">{event}</div>
              <div className="text-xs font-black text-slate-500">{source}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Automation Audit Preview / 自动化审计预览" subtitle="Connected APIs should write notification tests, rule changes and escalation overrides into Audit Logs. / API 接入后，通知测试、规则修改和强制升级都应写入 Audit Logs。">
        <div id="automation-audit-logs" className="grid gap-2">
          {logs.length ? logs.map((item) => <div key={item} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">{item}</div>) : <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-100">No automation action yet / 暂无自动化操作</div>}
        </div>
      </SectionCard>
    </div>
  );
}
