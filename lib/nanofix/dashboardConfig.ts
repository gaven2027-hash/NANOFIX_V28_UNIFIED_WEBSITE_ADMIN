export type DashboardSectionKey =
  | 'global-search'
  | 'main-dashboard'
  | 'todays-tasks'
  | 'ai-alerts'
  | 'unified-intake'
  | 'module-badges'
  | 'notification-bell'
  | 'new-members'
  | 'new-engineers'
  | 'pending-account-review'
  | 'blocked-accounts'
  | 'new-leads'
  | 'pending-customer-binding'
  | 'pending-inspection'
  | 'pending-quotes'
  | 'unpaid-overdue-invoices'
  | 'reports'
  | 'channel-alerts'
  | 'module-health-degraded';

export type DashboardSectionConfig = {
  key: DashboardSectionKey;
  href: string;
  title: string;
  zh: string;
  detailMode: string;
  helper: string;
};

export const dashboardSections: DashboardSectionConfig[] = [
  { key: 'global-search', href: '/dashboard/global-search', title: 'Top Fixed Global Search', zh: '顶部固定全局搜索', detailMode: 'global_search', helper: 'Search logs and global search activity.' },
  { key: 'main-dashboard', href: '/dashboard/main-dashboard', title: 'Main Dashboard', zh: '主仪表盘', detailMode: 'summary', helper: 'Overall live dashboard summary.' },
  { key: 'todays-tasks', href: '/dashboard/todays-tasks', title: "Today’s Tasks", zh: '今日待处理事项', detailMode: 'tasks', helper: 'Pending daily actions from leads, inspections, quotes, invoices and account review.' },
  { key: 'ai-alerts', href: '/dashboard/ai-alerts', title: 'AI Alerts', zh: 'AI 预警', detailMode: 'ai_handoff', helper: 'AI alerts, high-risk drafts and human handoff items.' },
  { key: 'unified-intake', href: '/dashboard/unified-intake', title: 'Unified Intake', zh: '统一入口', detailMode: 'intake', helper: 'Website, WhatsApp, GMB, social and lead intake.' },
  { key: 'module-badges', href: '/dashboard/module-badges', title: 'Module Badges', zh: '模块角标', detailMode: 'module_health', helper: 'Module counters and degraded-mode indicators.' },
  { key: 'notification-bell', href: '/dashboard/notification-bell', title: 'Notification Bell', zh: '通知铃铛', detailMode: 'notifications', helper: 'Actionable notifications and SLA queue.' },
  { key: 'new-members', href: '/dashboard/new-members', title: 'New Members', zh: '今日新增会员', detailMode: 'new_members', helper: 'Customer member accounts created today.' },
  { key: 'new-engineers', href: '/dashboard/new-engineers', title: 'New Engineers', zh: '今日新增工程师', detailMode: 'new_engineers', helper: 'Engineer accounts created today.' },
  { key: 'pending-account-review', href: '/dashboard/pending-account-review', title: 'Pending Account Review', zh: '待审核账号', detailMode: 'pending_accounts', helper: 'Member, engineer and admin accounts awaiting approval.' },
  { key: 'blocked-accounts', href: '/dashboard/blocked-accounts', title: 'Disabled / Blocked Accounts', zh: '停用/冻结/拉黑账号', detailMode: 'blocked_accounts', helper: 'Disabled, frozen, blacklisted or archived accounts.' },
  { key: 'new-leads', href: '/dashboard/new-leads', title: 'New Leads', zh: '新线索', detailMode: 'new_leads', helper: 'Open new leads list.' },
  { key: 'pending-customer-binding', href: '/dashboard/pending-customer-binding', title: 'Pending Customer Binding', zh: '待绑定客户', detailMode: 'pending_binding', helper: 'Customer binding suggestions awaiting review.' },
  { key: 'pending-inspection', href: '/dashboard/pending-inspection', title: 'Pending Inspection', zh: '待查验', detailMode: 'pending_inspections', helper: 'Scheduled or pending inspection records.' },
  { key: 'pending-quotes', href: '/dashboard/pending-quotes', title: 'Pending Quotes', zh: '待报价', detailMode: 'pending_quotes', helper: 'Draft/sent/pending quotation records.' },
  { key: 'unpaid-overdue-invoices', href: '/dashboard/unpaid-overdue-invoices', title: 'Unpaid / Overdue Invoices', zh: '未付款/逾期发票', detailMode: 'unpaid_invoices', helper: 'Unpaid and overdue invoice records.' },
  { key: 'reports', href: '/dashboard/reports', title: 'Reports', zh: '报表', detailMode: 'reports', helper: 'Operational report data and summary lists.' },
  { key: 'channel-alerts', href: '/dashboard/channel-alerts', title: 'Web / Social / GMB / WhatsApp Alerts', zh: '网站/社媒/GMB/WhatsApp 提醒', detailMode: 'channel_alerts', helper: 'Cross-channel intake and social messages.' },
  { key: 'module-health-degraded', href: '/dashboard/module-health-degraded', title: 'Module Health & Degraded Mode', zh: '模块健康与降级模式', detailMode: 'module_health', helper: 'Health checks and degraded modules.' }
];

export function getDashboardSection(key: string | undefined) {
  return dashboardSections.find((section) => section.key === key) || null;
}
