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

type WorkspaceProfile = {
  summary: string;
  table: string;
  api: string;
  primaryAction: string;
  secondaryAction: string;
  auditAction: string;
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

function profileFor(section: Section): WorkspaceProfile {
  const key = slugText(section);
  if (key.includes('automation') || key.includes('notification engine') || key.includes('通知引擎')) {
    return {
      summary: 'Automation rules turn cross-module events into queued notifications, internal inbox messages and unified tasks. Every rule and enqueue action must be backed by Supabase rows and Audit Logs. / 自动化规则把跨模块事件转换为排队通知、内部消息和统一任务；每个规则和入队动作必须有 Supabase 记录和审计日志。',
      table: 'automation_rules + notification_outbox + audit_logs',
      api: '/api/admin/automation-notifications',
      primaryAction: 'Create automation rule / 创建自动化规则',
      secondaryAction: 'Queue notification / 加入通知队列',
      auditAction: 'Open automation audit / 查看自动化审计',
      metrics: [
        { label: 'Rules / 规则', value: 'Live', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Queued / 已排队', value: 'DB', tone: 'border-cyan-400 bg-cyan-50 text-cyan-900' },
        { label: 'Failed / 失败', value: 'Track', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Audited / 已审计', value: '100%', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' }
      ],
      rows: [
        { id: 'AUTO-SR-001', subject: 'New repair request trigger / 新报修触发器', owner: 'Operations', status: 'enabled', priority: 'P0', next: 'Queue Operations inbox and task' },
        { id: 'AUTO-QT-002', subject: 'Quotation overdue trigger / 报价超时触发器', owner: 'Admin', status: 'enabled', priority: 'P1', next: 'Escalate to Super Admin if overdue' },
        { id: 'AUTO-REV-003', subject: 'Review redaction trigger / 评价脱敏触发器', owner: 'Customer Center', status: 'draft', priority: 'P1', next: 'Send to review moderation task' }
      ]
    };
  }
  if (key.includes('internal inbox') || key.includes('内部收件箱')) {
    return {
      summary: 'Internal Inbox is the role-based action queue for Super Admin, Operations, Finance, Content, Support and Engineer users. Customers do not access this inbox. / 内部收件箱是总管理员、运营、财务、内容、客服和工程师的角色行动队列，客户不可进入。',
      table: 'internal_inbox_messages + profiles + audit_logs',
      api: '/api/admin/internal-inbox',
      primaryAction: 'Acknowledge message / 确认消息',
      secondaryAction: 'Assign to task / 转为任务',
      auditAction: 'Archive with audit / 审计后归档',
      metrics: [
        { label: 'Unread / 未读', value: 'Role', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Ack required / 待确认', value: 'SLA', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
        { label: 'P0 / 紧急', value: 'Escalate', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Archived / 归档', value: 'Trace', tone: 'border-slate-400 bg-slate-50 text-slate-900' }
      ],
      rows: [
        { id: 'INBOX-OPS-001', subject: 'New public repair needs triage / 公开报修需分配', owner: 'Operations', status: 'unread', priority: 'P0', next: 'Open related service request' },
        { id: 'INBOX-FIN-002', subject: 'Payment confirmation review / 付款确认审核', owner: 'Finance', status: 'ack_required', priority: 'P1', next: 'Confirm payment and receipt' },
        { id: 'INBOX-ENG-003', subject: 'Inspection photo upload missing / 查验照片未上传', owner: 'Engineer', status: 'needs_action', priority: 'P1', next: 'Upload inspection evidence' }
      ]
    };
  }
  if (key.includes('unified task') || key.includes('统一任务')) {
    return {
      summary: 'Unified Task Engine normalises work from all modules into a single task table with source records, owners, SLA, status, task events and Audit Logs. / 统一任务引擎把所有模块工作统一到任务表，保留来源记录、负责人、SLA、状态、任务事件和审计日志。',
      table: 'unified_tasks + task_events + audit_logs',
      api: '/api/admin/unified-tasks',
      primaryAction: 'Create task / 创建任务',
      secondaryAction: 'Update status / 更新状态',
      auditAction: 'View task events / 查看任务事件',
      metrics: [
        { label: 'Open / 打开', value: 'Live', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'SLA / 时限', value: 'Due', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
        { label: 'Blocked / 阻塞', value: 'Escalate', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Done / 完成', value: 'Audit', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' }
      ],
      rows: [
        { id: 'TASK-SR-001', subject: 'Schedule first inspection / 安排首次查验', owner: 'Operations', status: 'open', priority: 'P0', next: 'Assign engineer and due time' },
        { id: 'TASK-QT-002', subject: 'Approve quotation draft / 审核报价草稿', owner: 'Admin', status: 'review', priority: 'P1', next: 'Approve or request revision' },
        { id: 'TASK-WTY-003', subject: 'Warranty claim decision / 保修范围判断', owner: 'Operations', status: 'in_progress', priority: 'P1', next: 'Decide in-warranty or new quote' }
      ]
    };
  }
  if (key.includes('dashboard') || key.includes('queue') || key.includes('summary') || key.includes('alerts')) {
    return {
      summary: 'Executive command view: counts, risks and urgent items are clickable and route to their original module for handling. / 总管理指挥视图：数量、预警和紧急事项可点击直达对应模块处理。',
      table: 'dashboard_snapshots + module_alerts + task_queue',
      api: '/api/admin/dashboard/summary',
      primaryAction: 'Open filtered urgent list / 打开筛选待处理列表',
      secondaryAction: 'Assign owner / 分配负责人',
      auditAction: 'Create takeover note / 创建接管记录',
      metrics: [
        { label: 'Urgent / 紧急', value: '8', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Due today / 今日到期', value: '23', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
        { label: 'Revenue / 收款', value: '$8.4k', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
        { label: 'System OK / 系统正常', value: '10/11', tone: 'border-sky-400 bg-sky-50 text-sky-900' }
      ],
      rows: [
        { id: 'DASH-P0-001', subject: 'Overdue quotation approval / 超时报价审批', owner: 'Operations', status: 'needs_action', priority: 'P0', next: 'Open Quotations filtered by overdue' },
        { id: 'DASH-FIN-004', subject: 'Payment abnormal reminder / 付款异常提醒', owner: 'Finance', status: 'review_required', priority: 'P1', next: 'Open Finance Snapshot items' },
        { id: 'DASH-ADS-002', subject: 'High spend low conversion alert / 高花费低转化预警', owner: 'Advertising', status: 'watch', priority: 'P1', next: 'Open Advertising ROI alert' }
      ]
    };
  }
  if (key.includes('review') || key.includes('testimonial') || key.includes('privacy redaction') || key.includes('评价')) {
    return {
      summary: 'Review workflow: customer-submitted reviews are checked, redacted, approved, archived or soft-deleted with audit logs. / 评价流程：客户提交评价后进行审核、脱敏、批准、存档或软删除，并写入审计日志。',
      table: 'customer_reviews + review_privacy_choices + review_audit_logs',
      api: '/api/admin/customer-reviews',
      primaryAction: 'Approve with redaction / 脱敏后批准',
      secondaryAction: 'Archive or soft delete / 存档或软删除',
      auditAction: 'View consent audit / 查看授权审计',
      metrics: [
        { label: 'Pending / 待审核', value: '5', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
        { label: 'Approved / 已批准', value: '31', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
        { label: 'Needs redaction / 需脱敏', value: '2', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Archived / 已存档', value: '9', tone: 'border-slate-400 bg-slate-50 text-slate-900' }
      ],
      rows: [
        { id: 'REV-2026-001', subject: '5-star toilet no-hacking review / 厕所免敲砖五星评价', owner: 'Customer Center', status: 'pending_review', priority: 'P1', next: 'Redact name and approve for homepage carousel' },
        { id: 'REV-2026-007', subject: 'Photo contains unit number / 图片含门牌号', owner: 'PDPA Reviewer', status: 'redaction_required', priority: 'P0', next: 'Mask image before public display' },
        { id: 'REV-2026-011', subject: 'Customer requested deletion / 客户请求删除评价', owner: 'Super Admin', status: 'deletion_audit', priority: 'P1', next: 'Soft delete and keep audit trail' }
      ]
    };
  }
  if (key.includes('takeover') || key.includes('override') || key.includes('approval')) {
    return {
      summary: 'Super Admin can explicitly take over stuck role tasks, force flow changes and record every action in Audit Logs. / 总管理员可明确接管卡住的角色任务、强制流转，并将所有动作写入审计日志。',
      table: 'workflow_tasks + approvals + audit_logs',
      api: '/api/admin/workflow-takeover',
      primaryAction: 'Take over task / 接管任务',
      secondaryAction: 'Reassign owner / 重新分配',
      auditAction: 'Open audit trail / 查看审计轨迹',
      metrics: [
        { label: 'Stuck / 卡住', value: '4', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Overdue / 超时', value: '7', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
        { label: 'Reassigned / 已重分配', value: '3', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Audited / 已审计', value: '100%', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' }
      ],
      rows: [
        { id: 'TAKE-ENG-001', subject: 'Engineer inspection not submitted / 工程师未提交查验', owner: 'Engineer role', status: 'overdue', priority: 'P0', next: 'Super Admin act as Inspection & Repair' },
        { id: 'TAKE-FIN-002', subject: 'Finance review pending / 财务审核未处理', owner: 'Finance', status: 'pending', priority: 'P1', next: 'Approve or reassign finance review' },
        { id: 'TAKE-OPS-003', subject: 'Job stuck before warranty / 工单卡在保修前', owner: 'Operations', status: 'stuck', priority: 'P1', next: 'Force status flow with reason' }
      ]
    };
  }
  if (key.includes('service') || key.includes('lead') || key.includes('job') || key.includes('quote') || key.includes('invoice') || key.includes('payment') || key.includes('warranty')) {
    return {
      summary: 'Service operations workspace for lead-to-warranty workflow, record ownership, status flow and SLA handling. / 服务运营工作区，处理线索到保修的完整流程、负责人、状态流转和 SLA。',
      table: 'leads + service_requests + jobs + invoices + warranty_records',
      api: '/api/admin/service-operations',
      primaryAction: 'Open record / 打开记录',
      secondaryAction: 'Update status / 更新状态',
      auditAction: 'Show status logs / 查看状态日志',
      metrics: [
        { label: 'Open / 未完成', value: '18', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Overdue / 超时', value: '4', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Completed / 已完成', value: '29', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
        { label: 'Warranty / 保修', value: '6', tone: 'border-amber-400 bg-amber-50 text-amber-900' }
      ],
      rows: [
        { id: 'SR-2026-019', subject: 'HDB ceiling leak / HDB 天花漏水', owner: 'Operations', status: 'pending_inspection', priority: 'P0', next: 'Schedule inspection' },
        { id: 'QT-2026-012', subject: 'No-hacking toilet repair quotation / 免敲砖厕所维修报价', owner: 'Admin', status: 'quote_review', priority: 'P1', next: 'Approve quotation' },
        { id: 'WTY-2026-004', subject: 'Warranty scope claim / 保修范围申请', owner: 'Customer Center', status: 'warranty_review_required', priority: 'P1', next: 'Decide in-warranty or new quote' }
      ]
    };
  }
  if (key.includes('website') || key.includes('seo') || key.includes('guide') || key.includes('content') || key.includes('publish') || key.includes('media')) {
    return {
      summary: 'Website CMS workspace for editable English/Chinese content, public form intake, media and publish approvals. / 网站 CMS 工作区，处理可编辑中英内容、公开表单、媒体素材和发布审批。',
      table: 'website_pages + cms_blocks + media_assets + publish_requests',
      api: '/api/admin/website-management',
      primaryAction: 'Edit draft / 编辑草稿',
      secondaryAction: 'Preview / 预览',
      auditAction: 'Publish audit / 发布审计',
      metrics: [
        { label: 'Drafts / 草稿', value: '9', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Publish holds / 发布阻止', value: '1', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Forms / 表单', value: '5', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
        { label: 'SEO tasks / SEO 任务', value: '14', tone: 'border-amber-400 bg-amber-50 text-amber-900' }
      ],
      rows: [
        { id: 'WEB-HOME-001', subject: 'Homepage hero content / 首页大图内容', owner: 'Website Admin', status: 'editable', priority: 'P1', next: 'Edit CMS fields' },
        { id: 'WEB-REV-003', subject: 'Homepage review carousel / 首页评价滚动区', owner: 'Customer Center', status: 'awaiting_approved_reviews', priority: 'P1', next: 'Select approved reviews' },
        { id: 'WEB-FORM-005', subject: 'Public repair form submissions / 公开报修表单', owner: 'Operations', status: 'live', priority: 'P0', next: 'Open public submissions' }
      ]
    };
  }
  if (key.includes('social') || key.includes('whatsapp') || key.includes('gmb') || key.includes('google business')) {
    return {
      summary: 'Social workspace separates organic enquiries from paid ads and keeps AI replies editable before sending. / 社媒工作区区分自然咨询和广告线索，AI 建议回复发送前可编辑。',
      table: 'social_inbox + social_drafts + organic_leads + review_imports',
      api: '/api/admin/social-media',
      primaryAction: 'Open inbox / 打开收件箱',
      secondaryAction: 'Edit AI reply / 编辑 AI 回复',
      auditAction: 'Conversation audit / 对话审计',
      metrics: [
        { label: 'Inbox / 收件箱', value: '31', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Human required / 需人工', value: '6', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Organic leads / 自然线索', value: '11', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
        { label: 'Scheduled / 已排期', value: '4', tone: 'border-amber-400 bg-amber-50 text-amber-900' }
      ],
      rows: [
        { id: 'SOC-WA-001', subject: 'WhatsApp photo consult / WhatsApp 图片咨询', owner: 'Customer Service', status: 'needs_reply', priority: 'P0', next: 'Edit AI reply then send' },
        { id: 'SOC-ORG-009', subject: 'Instagram organic DM / Instagram 自然私信', owner: 'Operations', status: 'organic_lead', priority: 'P1', next: 'Convert to lead' },
        { id: 'SOC-REV-002', subject: 'Google review import / Google 评论导入', owner: 'Customer Center', status: 'pending_review', priority: 'P2', next: 'Send to review approval' }
      ]
    };
  }
  if (key.includes('advertising') || key.includes('campaign') || key.includes('roi') || key.includes('budget') || key.includes('ads')) {
    return {
      summary: 'Advertising workspace handles paid campaigns, budgets, ROI, finance review and Super Admin takeover. / 广告工作区处理付费广告、预算、ROI、财务审核和总管理员接管。',
      table: 'ad_campaigns + ad_performance_daily + ad_budget_requests',
      api: '/api/admin/advertising-center',
      primaryAction: 'Review campaign / 审核广告活动',
      secondaryAction: 'Adjust budget / 调整预算',
      auditAction: 'ROI audit / ROI 审计',
      metrics: [
        { label: 'Spend / 花费', value: '$950', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Leads / 线索', value: '38', tone: 'border-cyan-400 bg-cyan-50 text-cyan-900' },
        { label: 'ROAS / 回报', value: '6.8x', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
        { label: 'Alerts / 预警', value: '2', tone: 'border-red-400 bg-red-50 text-red-900' }
      ],
      rows: [
        { id: 'ADS-GGL-001', subject: 'HDB ceiling leak emergency / HDB 天花漏水广告', owner: 'Advertising', status: 'pending_review', priority: 'P1', next: 'Review ROI and approve' },
        { id: 'ADS-META-003', subject: 'No-hacking repair campaign / 免敲砖维修广告', owner: 'Finance', status: 'budget_review', priority: 'P1', next: 'Finance review' },
        { id: 'ADS-TTK-002', subject: 'High spend low conversion / 高花费低转化', owner: 'Super Admin', status: 'takeover_available', priority: 'P0', next: 'Pause or reduce budget' }
      ]
    };
  }
  if (key.includes('ai') || key.includes('prompt') || key.includes('redaction') || key.includes('attribution')) {
    return {
      summary: 'AI workspace keeps suggestions editable, reviewed and audited before any website, social or customer-facing use. / AI 工作区确保建议内容在用于网站、社媒或客户前可编辑、可审核、可审计。',
      table: 'ai_drafts + ai_analysis_logs + ai_alerts',
      api: '/api/admin/ai-intelligence',
      primaryAction: 'Open AI draft / 打开 AI 草稿',
      secondaryAction: 'Regenerate suggestion / 重新生成建议',
      auditAction: 'Prompt audit / 提示词审计',
      metrics: [
        { label: 'Drafts / 草稿', value: '17', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
        { label: 'Approved / 已批准', value: '23', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
        { label: 'Blocked risk / 已阻止风险', value: '5', tone: 'border-red-400 bg-red-50 text-red-900' },
        { label: 'Cost today / 今日成本', value: '$18', tone: 'border-amber-400 bg-amber-50 text-amber-900' }
      ],
      rows: [
        { id: 'AI-REV-001', subject: 'Review redaction suggestion / 评价脱敏建议', owner: 'Customer Center', status: 'needs_human_review', priority: 'P1', next: 'Approve or edit redaction' },
        { id: 'AI-QT-004', subject: 'Quotation assist draft / 报价辅助草稿', owner: 'Operations', status: 'draft', priority: 'P2', next: 'Edit before sending' },
        { id: 'AI-SAFE-002', subject: 'Prompt injection check / 提示注入检查', owner: 'Super Admin', status: 'blocked', priority: 'P0', next: 'Review safety log' }
      ]
    };
  }
  return {
    summary: 'System settings workspace controls permissions, integrations, backups, monitoring and security. / 系统设置工作区管理权限、集成、备份、监控和安全。',
    table: 'system_settings + role_permissions + audit_logs',
    api: '/api/admin/system-settings',
    primaryAction: 'Open settings / 打开设置',
    secondaryAction: 'Save rule / 保存规则',
    auditAction: 'View audit log / 查看审计日志',
    metrics: [
      { label: 'Healthy / 健康', value: '10/11', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
      { label: 'Backups / 备份', value: '8', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
      { label: 'Due secrets / 待处理密钥', value: '2', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
      { label: 'Failed jobs / 失败任务', value: '1', tone: 'border-red-400 bg-red-50 text-red-900' }
    ],
    rows: [
      { id: 'SYS-RBAC-001', subject: 'Role permission matrix / 角色权限矩阵', owner: 'Super Admin', status: 'active', priority: 'P0', next: 'Review permissions' },
      { id: 'SYS-API-002', subject: 'Public API monitor / 公开接口监控', owner: 'System', status: 'healthy', priority: 'P1', next: 'Open health details' },
      { id: 'SYS-REV-003', subject: 'Review privacy publishing rules / 评价隐私发布规则', owner: 'Customer Center', status: 'active', priority: 'P1', next: 'Edit consent rules' }
    ]
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

  useEffect(() => {
    if (profile?.rows[0]?.id) setSelectedRowId(profile.rows[0].id);
  }, [activeId, profile?.rows]);

  if (!active || !profile || !selected) return null;

  function runAction(action: string) {
    const stamp = new Date().toLocaleString();
    setAuditTrail((items) => [`${stamp} — ${action} — ${selected.id} — ${selected.subject}`, ...items].slice(0, 5));
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
              <span className="rounded-2xl bg-white/20 px-3 py-2 text-xs font-black ring-1 ring-white/30">Workspace active / 工作区已打开</span>
            </div>
            <p className="mt-4 max-w-4xl text-sm font-semibold leading-6 text-white/90">{profile.summary}</p>
          </div>

          <div className="p-6">
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
                </dl>
                <div className="mt-4 grid gap-2">
                  {[profile.primaryAction, profile.secondaryAction, profile.auditAction].map((action) => (
                    <button key={action} type="button" onClick={() => runAction(action)} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700">
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
                  <p className="mt-1 text-xs font-semibold text-slate-500">Actions are recorded in this workspace panel and should map to server-side Audit Logs when the connected API is enabled. / 当前工作区会记录操作，接入服务端 API 后应同步写入 Audit Logs。</p>
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
