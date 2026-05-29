'use client';

import { useEffect, useMemo, useState } from 'react';
import { menu } from '@/data/adminNavigation';

type Section = {
  id: string;
  href: string;
  title: string;
  zh: string;
  parentOrder: string;
  parentTitle: string;
  childOrder: string;
};

type WorkRow = {
  id: string;
  subject: string;
  owner: string;
  status: string;
  priority: string;
  next: string;
};

type IntegrationMode = 'live' | 'partial' | 'contract';

type WorkspaceProfile = {
  summary: string;
  table: string;
  api: string;
  primaryAction: string;
  secondaryAction: string;
  auditAction: string;
  integrationMode: IntegrationMode;
  rows: WorkRow[];
  metrics: Array<{ label: string; value: string; tone: string }>;
};

function basePath(href: string) {
  return href.split('#')[0] || '/admin';
}

function currentHash() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#/, '');
}

function slugText(section: Section) {
  return `${section.parentTitle} ${section.title} ${section.zh}`.toLowerCase();
}

function modeCopy(mode: IntegrationMode) {
  if (mode === 'live') return {
    label: 'Live API / 真实接口',
    tone: 'bg-emerald-50 text-emerald-950 ring-emerald-200',
    note: 'This module is connected to server APIs and should write real Supabase records and Audit Logs. / 此模块已连接服务端 API，应写入真实 Supabase 记录和 Audit Logs。'
  };
  if (mode === 'partial') return {
    label: 'Partial live binding / 部分真实绑定',
    tone: 'bg-amber-50 text-amber-950 ring-amber-200',
    note: 'This module has some real components, but this generic submodule panel still contains contract/sample rows. Confirm the dedicated workspace before production use. / 此模块已有部分真实组件，但本通用二级面板仍含契约/示例行，上线前需以专用工作区为准。'
  };
  return {
    label: 'Contract scaffold / 契约占位',
    tone: 'bg-slate-50 text-slate-700 ring-slate-200',
    note: 'This panel is an OA/ERP module contract preview. It is not a real write workflow until the listed API and tables are implemented and verified. / 本面板是 OA/ERP 模块契约预览；在所列 API 和数据表实现并验证前，不代表真实写入流程。'
  };
}

const demoMetrics = [
  { label: 'Records / 记录', value: 'Contract', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
  { label: 'Actions / 操作', value: 'Verify', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
  { label: 'Audit / 审计', value: 'Required', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
  { label: 'Risk / 风险', value: 'No fake data', tone: 'border-red-400 bg-red-50 text-red-900' }
];

function genericRows(prefix: string, title: string): WorkRow[] {
  return [
    { id: `${prefix}-001`, subject: `${title} record review / ${title} 记录复核`, owner: 'Operations', status: 'contract', priority: 'P1', next: 'Implement real CRUD API before production operation' },
    { id: `${prefix}-002`, subject: `${title} approval / ${title} 审批`, owner: 'Admin', status: 'requires_api', priority: 'P1', next: 'Connect to Supabase table and Audit Logs' },
    { id: `${prefix}-003`, subject: `${title} exception / ${title} 异常`, owner: 'Super Admin', status: 'needs_workflow', priority: 'P0', next: 'Define escalation and takeover rule' }
  ];
}

function profileFor(section: Section): WorkspaceProfile {
  const key = slugText(section);
  if (key.includes('automation') || key.includes('notification engine') || key.includes('通知引擎')) {
    return {
      integrationMode: 'live',
      summary: 'Automation rules turn cross-module events into queued notifications, internal inbox messages and unified tasks. Every rule and enqueue action must be backed by Supabase rows and Audit Logs. / 自动化规则把跨模块事件转换为排队通知、内部消息和统一任务；每个规则和入队动作必须有 Supabase 记录和审计日志。',
      table: 'automation_rules + notification_outbox + audit_logs',
      api: '/api/admin/automation-notifications',
      primaryAction: 'Queue notification / 加入通知队列',
      secondaryAction: 'Open live dashboard panel / 打开真实工作流面板',
      auditAction: 'Open workflow audit / 查看工作流审计',
      metrics: [
        { label: 'Rules / 规则', value: 'Live', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Queued / 已排队', value: 'DB', tone: 'border-cyan-400 bg-cyan-50 text-cyan-900' },
        { label: 'Failed / 失败', value: 'Track', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Audited / 已审计', value: '100%', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' }
      ],
      rows: genericRows('AUTO', section.title)
    };
  }
  if (key.includes('internal inbox') || key.includes('内部收件箱')) {
    return {
      integrationMode: 'live',
      summary: 'Internal Inbox is the role-based action queue for Super Admin, Operations, Finance, Content, Support and Engineer users. Customers do not access this inbox. / 内部收件箱是总管理员、运营、财务、内容、客服和工程师的角色行动队列，客户不可进入。',
      table: 'internal_inbox_messages + profiles + audit_logs',
      api: '/api/admin/internal-inbox',
      primaryAction: 'Acknowledge live message / 确认真实消息',
      secondaryAction: 'Create unified task / 转为统一任务',
      auditAction: 'Archive with audit / 审计后归档',
      metrics: [
        { label: 'Unread / 未读', value: 'Role', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Ack required / 待确认', value: 'SLA', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
        { label: 'P0 / 紧急', value: 'Escalate', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Archived / 归档', value: 'Trace', tone: 'border-slate-400 bg-slate-50 text-slate-900' }
      ],
      rows: genericRows('INBOX', section.title)
    };
  }
  if (key.includes('unified task') || key.includes('统一任务')) {
    return {
      integrationMode: 'live',
      summary: 'Unified Task Engine normalises work from all modules into a single task table with source records, owners, SLA, status, task events and Audit Logs. / 统一任务引擎把所有模块工作统一到任务表，保留来源记录、负责人、SLA、状态、任务事件和审计日志。',
      table: 'unified_tasks + task_events + audit_logs',
      api: '/api/admin/unified-tasks',
      primaryAction: 'Create live task / 创建真实任务',
      secondaryAction: 'Update live status / 更新真实状态',
      auditAction: 'View task events / 查看任务事件',
      metrics: [
        { label: 'Open / 打开', value: 'Live', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'SLA / 时限', value: 'Due', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
        { label: 'Blocked / 阻塞', value: 'Escalate', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Done / 完成', value: 'Audit', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' }
      ],
      rows: genericRows('TASK', section.title)
    };
  }
  if (key.includes('dashboard') || key.includes('queue') || key.includes('summary') || key.includes('alerts')) {
    return {
      integrationMode: 'partial',
      summary: 'Executive command view: counts, risks and urgent items must route to source modules for handling. The generic rows here are readiness contracts unless backed by a dedicated live widget. / 总管理指挥视图：数量、预警和紧急事项必须直达源模块处理；本通用行是上线契约，除非已有专用真实组件支撑。',
      table: 'dashboard_snapshots + module_alerts + unified_tasks',
      api: '/api/admin/dashboard/summary',
      primaryAction: 'Open filtered urgent list / 打开筛选待处理列表',
      secondaryAction: 'Assign owner / 分配负责人',
      auditAction: 'Create takeover note / 创建接管记录',
      metrics: demoMetrics,
      rows: genericRows('DASH', section.title)
    };
  }
  if (key.includes('service') || key.includes('lead') || key.includes('job') || key.includes('quote') || key.includes('invoice') || key.includes('payment') || key.includes('warranty')) {
    return {
      integrationMode: 'partial',
      summary: 'Service operations is the lead-to-warranty workflow. Dedicated panels exist, but each submodule still needs verified live CRUD, status transitions and Audit Logs before OA/ERP go-live. / 服务运营是线索到保修主链路；已有专用面板，但每个二级模块上线前仍需验证真实 CRUD、状态流转和审计日志。',
      table: 'leads + service_requests + jobs + invoices + warranties + audit_logs',
      api: '/api/admin/service-operations or module-specific API',
      primaryAction: 'Open source record / 打开源记录',
      secondaryAction: 'Run server status transition / 服务端状态流转',
      auditAction: 'Show status/audit logs / 查看状态与审计日志',
      metrics: demoMetrics,
      rows: genericRows('OPS', section.title)
    };
  }
  if (key.includes('website') || key.includes('seo') || key.includes('guide') || key.includes('content') || key.includes('publish') || key.includes('media')) {
    return {
      integrationMode: 'partial',
      summary: 'Website CMS manages editable content, public form intake, media and publish approvals. Dedicated CMS pieces exist; every listed submodule still needs live table/API verification before production edits are trusted. / 网站 CMS 管理可编辑内容、公开表单、媒体和发布审批；已有部分 CMS 能力，但所有二级模块仍需验证真实表/API。',
      table: 'cms_blocks + content_drafts + media_assets + unified_intake + audit_logs',
      api: '/api/admin/cms/blocks or module-specific API',
      primaryAction: 'Edit draft / 编辑草稿',
      secondaryAction: 'Preview / 预览',
      auditAction: 'Publish audit / 发布审计',
      metrics: demoMetrics,
      rows: genericRows('WEB', section.title)
    };
  }
  if (key.includes('social') || key.includes('whatsapp') || key.includes('gmb') || key.includes('google business')) {
    return {
      integrationMode: 'partial',
      summary: 'Social modules must separate organic enquiries from paid ads and keep AI replies human-editable before sending. API/account binding must be verified per platform. / 社媒模块必须区分自然咨询和广告线索，AI 回复发送前必须人工可编辑；每个平台需验证账号/API 绑定。',
      table: 'social_accounts + social_messages + social_content_drafts + audit_logs',
      api: '/api/admin/social/messages or platform-specific API',
      primaryAction: 'Open inbox / 打开收件箱',
      secondaryAction: 'Edit AI reply / 编辑 AI 回复',
      auditAction: 'Conversation audit / 对话审计',
      metrics: demoMetrics,
      rows: genericRows('SOC', section.title)
    };
  }
  if (key.includes('advertising') || key.includes('campaign') || key.includes('roi') || key.includes('budget') || key.includes('ads')) {
    return {
      integrationMode: 'partial',
      summary: 'Advertising modules must link campaigns, budgets, ROI, landing pages, attribution and finance review. The module requires live spend/import APIs before production use. / 广告模块必须打通广告活动、预算、ROI、落地页、归因和财务审核；生产使用前需真实花费/导入 API。',
      table: 'ad_campaigns + ad_performance_daily + ad_budget_requests + audit_logs',
      api: '/api/admin/advertising-center and submodule APIs',
      primaryAction: 'Review campaign / 审核广告活动',
      secondaryAction: 'Adjust budget / 调整预算',
      auditAction: 'ROI audit / ROI 审计',
      metrics: demoMetrics,
      rows: genericRows('ADS', section.title)
    };
  }
  if (key.includes('ai') || key.includes('prompt') || key.includes('redaction') || key.includes('attribution')) {
    return {
      integrationMode: 'partial',
      summary: 'AI modules must keep suggestions editable, reviewed and audited before any website, social or customer-facing use. / AI 模块建议内容用于网站、社媒或客户前必须可编辑、可审核、可审计。',
      table: 'ai_logs + content_drafts + review_redaction_queue + audit_logs',
      api: '/api/admin/ai-intelligence or module-specific API',
      primaryAction: 'Open AI draft / 打开 AI 草稿',
      secondaryAction: 'Regenerate suggestion / 重新生成建议',
      auditAction: 'Prompt audit / 提示词审计',
      metrics: demoMetrics,
      rows: genericRows('AI', section.title)
    };
  }
  return {
    integrationMode: key.includes('workflow settings') || key.includes('automation rule settings') || key.includes('notification channel') || key.includes('sla') ? 'live' : 'partial',
    summary: 'System settings controls permissions, integrations, backups, monitoring and security. Settings that are not connected to a live API are shown as OA/ERP contracts until implemented. / 系统设置管理权限、集成、备份、监控和安全；未接入真实 API 的设置以 OA/ERP 契约显示。',
    table: key.includes('workflow settings') || key.includes('automation rule settings') || key.includes('notification channel') || key.includes('sla') ? 'workflow_settings + audit_logs' : 'system_settings + role_permissions + audit_logs',
    api: key.includes('workflow settings') || key.includes('automation rule settings') || key.includes('notification channel') || key.includes('sla') ? '/api/admin/workflow-settings' : '/api/admin/system-settings or module-specific API',
    primaryAction: 'Open settings / 打开设置',
    secondaryAction: 'Save via API / 通过 API 保存',
    auditAction: 'View audit log / 查看审计日志',
    metrics: demoMetrics,
    rows: genericRows('SYS', section.title)
  };
}

export function AdminSubmoduleWorkspace({ route }: { route: string }) {
  const sections = useMemo<Section[]>(() => menu
    .filter((item) => basePath(item.href) === route)
    .flatMap((item) => item.children.map((child, index) => ({
      id: child.href.split('#')[1] || `${item.order}-${index + 1}`,
      href: child.href,
      title: child.title,
      zh: child.zh,
      parentOrder: item.order,
      parentTitle: item.title,
      childOrder: `${item.order}.${index + 1}`
    }))), [route]);
  const [activeId, setActiveId] = useState('');
  const [selectedRowId, setSelectedRowId] = useState('');
  const [auditTrail, setAuditTrail] = useState<string[]>([]);

  useEffect(() => {
    const applyHash = () => setActiveId(currentHash() || sections[0]?.id || '');
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [sections]);

  const active = sections.find((section) => section.id === activeId) || sections[0];
  const profile = active ? profileFor(active) : null;
  const selected = profile?.rows.find((row) => row.id === selectedRowId) || profile?.rows[0];
  const mode = profile ? modeCopy(profile.integrationMode) : null;

  useEffect(() => {
    if (profile?.rows[0]?.id) setSelectedRowId(profile.rows[0].id);
  }, [activeId, profile?.rows]);

  if (!active || !profile || !selected || !mode) return null;

  function runAction(action: string) {
    const stamp = new Date().toLocaleString();
    const prefix = profile.integrationMode === 'live' ? 'Live API action should be handled by the dedicated workspace' : 'Contract-only UI note, no server write';
    setAuditTrail((items) => [`${stamp} — ${prefix} — ${action} — ${selected.id} — ${selected.subject}`, ...items].slice(0, 5));
  }

  return (
    <section className="mt-6 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Submodules / 二级栏目</div>
        <div className="mt-3 grid gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                window.history.replaceState(null, '', `#${section.id}`);
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              }}
              className={`rounded-2xl px-3 py-3 text-left text-sm font-black transition ${section.id === active.id ? 'bg-gradient-to-br from-sky-400 via-cyan-300 to-blue-500 text-white shadow-lg shadow-sky-200' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-activeBlue'}`}
            >
              <span className="block text-xs opacity-80">{section.childOrder}</span>
              <span className="block">{section.title}</span>
              <span className="block text-xs font-bold opacity-75">{section.zh}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="space-y-5">
        <div id={active.id} className="scroll-mt-40 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-sky-500 via-cyan-300 to-blue-600 p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/80">{active.parentOrder}. {active.parentTitle}</div>
                <h2 className="mt-2 text-2xl font-black">{active.childOrder} {active.title}</h2>
                <p className="mt-1 text-sm font-bold text-white/85">{active.zh}</p>
              </div>
              <span className="rounded-2xl bg-white/20 px-3 py-2 text-xs font-black ring-1 ring-white/30">{mode.label}</span>
            </div>
            <p className="mt-4 max-w-4xl text-sm font-semibold leading-6 text-white/90">{profile.summary}</p>
          </div>

          <div className="p-6">
            <div className={`mb-5 rounded-3xl p-4 text-xs font-bold ring-1 ${mode.tone}`}>{mode.note}</div>
            <div className="grid gap-3 md:grid-cols-4">
              {profile.metrics.map((card) => (
                <button key={card.label} type="button" onClick={() => runAction(`Open metric / 打开指标: ${card.label}`)} className={`rounded-2xl border-l-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${card.tone}`}>
                  <div className="text-2xl font-black">{card.value}</div>
                  <div className="text-xs font-black">{card.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
              <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <div className="grid grid-cols-[1fr_120px_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1.4fr_140px_120px_90px]">
                  <span>Record / 条目</span>
                  <span>Owner / 负责人</span>
                  <span>Status / 状态</span>
                  <span className="hidden md:block">Priority</span>
                </div>
                {profile.rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedRowId(row.id)}
                    className={`grid w-full grid-cols-[1fr_120px_110px] gap-3 border-t border-slate-200 px-4 py-3 text-left text-sm transition md:grid-cols-[1.4fr_140px_120px_90px] ${selected.id === row.id ? 'bg-sky-50' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <span>
                      <span className="block font-black text-slate-950">{row.subject}</span>
                      <span className="mt-1 block text-xs font-bold text-activeBlue">{row.id}</span>
                    </span>
                    <span className="font-bold text-slate-600">{row.owner}</span>
                    <span className="font-bold text-slate-600">{row.status}</span>
                    <span className="hidden font-black text-red-600 md:block">{row.priority}</span>
                  </button>
                ))}
              </div>

              <aside className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-activeBlue">Selected item / 当前条目</div>
                <h3 className="mt-2 text-lg font-black text-slate-950">{selected.subject}</h3>
                <dl className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                  <div><dt className="text-xs font-black uppercase text-slate-400">ID</dt><dd>{selected.id}</dd></div>
                  <div><dt className="text-xs font-black uppercase text-slate-400">Next step / 下一步</dt><dd>{selected.next}</dd></div>
                  <div><dt className="text-xs font-black uppercase text-slate-400">Data source / 数据源</dt><dd>{profile.table}</dd></div>
                  <div><dt className="text-xs font-black uppercase text-slate-400">API</dt><dd>{profile.api}</dd></div>
                  <div><dt className="text-xs font-black uppercase text-slate-400">OA/ERP status</dt><dd>{mode.label}</dd></div>
                </dl>
                <div className="mt-4 grid gap-2">
                  {[profile.primaryAction, profile.secondaryAction, profile.auditAction].map((action) => (
                    <button key={action} type="button" onClick={() => runAction(action)} className={`rounded-2xl px-4 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${profile.integrationMode === 'contract' ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-activeBlue text-white hover:bg-blue-700'}`}>
                      {action}
                    </button>
                  ))}
                </div>
              </aside>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">Action log / 页面操作日志</div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">This log is client-side only. Production write actions are valid only in dedicated live workspaces/API responses and server-side Audit Logs. / 此日志只在前端显示；生产写操作必须以专用真实工作区/API 响应和服务端 Audit Logs 为准。</p>
                </div>
                <button type="button" onClick={() => setAuditTrail([])} className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Clear / 清空</button>
              </div>
              <div className="mt-3 grid gap-2">
                {auditTrail.length ? auditTrail.map((item) => (
                  <div key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">{item}</div>
                )) : <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-100">No actions yet / 暂无页面操作</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
