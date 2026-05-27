export type MenuChild = {
  href: string;
  title: string;
  zh: string;
};

export type MenuItem = {
  order: string;
  href: string;
  title: string;
  zh: string;
  badge: number | string;
  children: MenuChild[];
};

const child = (href: string, title: string, zh: string): MenuChild => ({ href, title, zh });

export const menu: MenuItem[] = [
  {
    order: '0',
    href: '/admin',
    title: 'Global Search & Admin Home',
    zh: '全局搜索与后台首页',
    badge: 'Home',
    children: [
      child('/admin#module-launch', 'All Module Launch Board', '全部模块入口总览'),
      child('/admin#global-search', 'Top Fixed Global Search', '顶部固定全局搜索'),
      child('/admin#unified-intake-feed', 'Unified Intake Feed', '统一入口动态'),
      child('/admin#module-health', 'Module Health & Degraded Mode', '模块健康与降级模式'),
      child('/admin#pending-approvals', 'Pending Approvals Snapshot', '待审批总览'),
      child('/admin#audit-alerts', 'Audit & Alerts Snapshot', '审计与预警总览')
    ]
  },
  {
    order: '1',
    href: '/dashboard',
    title: 'Dashboard, Analytics & Alerts',
    zh: '仪表盘、数据分析与预警',
    badge: 12,
    children: [
      child('/dashboard#dashboard-main', 'Main Dashboard', '主仪表盘'),
      child('/dashboard#today-tasks', 'Today’s Tasks', '今日待处理事项'),
      child('/dashboard#ai-alerts', 'AI Alerts', 'AI 预警'),
      child('/dashboard#unified-intake', 'Unified Intake', '统一入口'),
      child('/dashboard#new-leads', 'New Leads', '新线索'),
      child('/dashboard#pending-customer-binding', 'Pending Customer Binding', '待绑定客户'),
      child('/dashboard#finance-snapshot', 'Finance Snapshot', '财务快照'),
      child('/dashboard#operations-snapshot', 'Operations Snapshot', '运营快照'),
      child('/dashboard#kpi-performance', 'KPI & Performance', 'KPI 与绩效'),
      child('/dashboard#reports', 'Reports', '报表中心'),
      child('/dashboard#audit-drilldown', 'Audit Drill-down', '审计下钻'),
      child('/dashboard#module-health', 'Module Health', '模块健康')
    ]
  },
  {
    order: '2',
    href: '/service-operations',
    title: 'Service & Order Operations',
    zh: '服务与订单运营',
    badge: 16,
    children: [
      child('/service-operations#leads', 'Leads', '线索'),
      child('/service-operations#service-requests', 'Service Requests', '服务请求 / 报修单'),
      child('/service-operations#inspection-scheduling', 'Inspection Scheduling', '查验排程'),
      child('/service-operations#inspections', 'Inspections', '查验记录'),
      child('/service-operations#quotations', 'Quotations', '报价'),
      child('/service-operations#quotation-approval', 'Quotation Approval', '报价审批'),
      child('/service-operations#jobs', 'Jobs', '工单'),
      child('/service-operations#work-execution', 'Work Execution', '施工执行'),
      child('/service-operations#engineer-assignment', 'Engineer Assignment', '工程师分配（业务字段）'),
      child('/service-operations#progress-updates', 'Progress Updates', '进度更新'),
      child('/service-operations#invoices', 'Invoices', '发票'),
      child('/service-operations#payments', 'Payments', '付款'),
      child('/service-operations#receipts', 'Receipts', '收据'),
      child('/service-operations#warranty-records', 'Warranty Records', '保修记录'),
      child('/service-operations#rework', 'Rework', '返工管理'),
      child('/service-operations#status-flow-logs', 'Status Flow & Logs', '状态流转与日志')
    ]
  },
  {
    order: '3',
    href: '/website-management',
    title: 'Website Management',
    zh: '网站后台管理',
    badge: 14,
    children: [
      child('/website-management#navigation-menu', 'Navigation & Menu', '导航与菜单'),
      child('/website-management#homepage-content', 'Homepage Content', '首页内容'),
      child('/website-management#page-content', 'Page Content', '页面内容'),
      child('/website-management#service-page-content', 'Service Page Content', '服务页内容'),
      child('/website-management#guide-library', 'Guide Library', 'Guide 内容库'),
      child('/website-management#faq-tips', 'FAQ & Tips', 'FAQ 与维护建议'),
      child('/website-management#seo-aeo-library', 'SEO / AEO Library', 'SEO / AEO 内容库'),
      child('/website-management#ai-website-content-generator', 'AI Website Content Generator', 'AI 网站内容生成'),
      child('/website-management#forms-public-submission', 'Forms & Public Submission', '表单与公开提交'),
      child('/website-management#media-library', 'Media Library', '媒体素材库'),
      child('/website-management#preview', 'Preview', '预览'),
      child('/website-management#publish-approval', 'Publish Approval', '发布审批'),
      child('/website-management#version-history', 'Version History', '版本历史'),
      child('/website-management#website-leads-analytics', 'Website Leads & Analytics', '网站线索与分析')
    ]
  },
  {
    order: '4',
    href: '/social-media',
    title: 'Social Media Management',
    zh: '社媒管理',
    badge: 13,
    children: [
      child('/social-media#social-accounts', 'Social Accounts', '社媒账号'),
      child('/social-media#google-business-profile', 'Google Business Profile', 'Google 商家资料'),
      child('/social-media#unified-social-inbox', 'Unified Social Inbox', '统一社媒收件箱'),
      child('/social-media#whatsapp-ai-reply', 'WhatsApp AI Reply', 'WhatsApp AI 回复'),
      child('/social-media#transfer-to-human', 'Transfer to Human', '转人工'),
      child('/social-media#live-chat-webhook-collector', 'Live Chat / Webhook Collector', '在线聊天 / Webhook 收集'),
      child('/social-media#review-comment-management', 'Review & Comment Management', '评论与留言管理'),
      child('/social-media#ai-social-content-studio', 'AI Social Content Studio', 'AI 社媒内容工作室'),
      child('/social-media#multi-platform-preview-review', 'Multi-Platform Preview Review', '多平台并排预览审核'),
      child('/social-media#schedule-publish-approval', 'Schedule / Publish Approval', '排期 / 发布审批'),
      child('/social-media#campaign-posting-queue', 'Campaign Posting Queue', '发布队列'),
      child('/social-media#social-logs', 'Social Logs', '社媒日志'),
      child('/social-media#social-performance', 'Social Performance', '社媒表现')
    ]
  },
  {
    order: '5',
    href: '/admin/advertising-center',
    title: 'Advertising & Promotion Center',
    zh: '广告投放与推广中心',
    badge: 'Ads',
    children: [
      child('/admin/advertising-center#campaign-dashboard', 'Overview / Campaign Dashboard', '总览 / 广告活动面板'),
      child('/admin/advertising-center#campaign-planning', 'Campaign Planning', '广告策划'),
      child('/admin/advertising-center#create-campaign-draft', 'Create Campaign Draft', '创建广告草稿'),
      child('/admin/advertising-center/import', 'CSV / Excel Import', 'CSV / Excel 导入'),
      child('/admin/advertising-center/insights', 'ROI Insights & Alerts', 'ROI 分析与预警'),
      child('/admin/advertising-center/creatives', 'Creatives & Copy', '素材与文案'),
      child('/admin/advertising-center/budgets', 'Budgets & Strategy', '预算与策略'),
      child('/admin/advertising-center#approval-gates', 'Approval Gates', '审批闸门'),
      child('/admin/advertising-center#ad-account-connections', 'Ad Account Connections', '广告账号连接'),
      child('/admin/advertising-center#utm-landing-pages', 'UTM & Landing Pages', 'UTM 与落地页'),
      child('/admin/advertising-center#roi-comparison', 'CPL / ROAS / ROI Comparison', 'CPL / ROAS / ROI 对比'),
      child('/admin/advertising-center#daily-spend-review', 'Daily Spend Review', '日花费审核'),
      child('/admin/advertising-center#finance-review', 'Finance Review', '财务审核'),
      child('/admin/advertising-center#super-admin-takeover', 'Super Admin Takeover', '总管理员接管'),
      child('/admin/advertising-center#ad-logs', 'Ad Logs', '广告日志')
    ]
  },
  {
    order: '6',
    href: '/ai-intelligence',
    title: 'AI Intelligence Center',
    zh: 'AI 智能中心',
    badge: 14,
    children: [
      child('/ai-intelligence#global-web-search', 'Global Web Search', '全网搜索中心'),
      child('/ai-intelligence#ai-website-assistant', 'AI Website Assistant', 'AI 网站助手'),
      child('/ai-intelligence#ai-social-assistant', 'AI Social Assistant', 'AI 社媒助手'),
      child('/ai-intelligence#ai-conversation-intelligence', 'AI Conversation Intelligence', 'AI 对话智能'),
      child('/ai-intelligence#lead-discovery-scoring', 'Lead Discovery & Scoring', '线索发现与评分'),
      child('/ai-intelligence#ai-rules', 'AI Rules', 'AI 规则'),
      child('/ai-intelligence#ai-api-settings', 'AI API Settings', 'AI 接口设置'),
      child('/ai-intelligence#ai-analysis-logs', 'AI Analysis Logs', 'AI 分析日志'),
      child('/ai-intelligence#ai-alerts', 'AI Alerts', 'AI 预警'),
      child('/ai-intelligence#material-ai-suggestions', 'Material AI Suggestions', '材料 AI 建议'),
      child('/ai-intelligence#usage-cost', 'Usage & Cost', '用量与成本'),
      child('/ai-intelligence#quotation-ai-assist', 'Quotation AI Assist', '报价 AI 辅助'),
      child('/ai-intelligence#invoice-ai-assist', 'Invoice AI Assist', '发票 AI 辅助'),
      child('/ai-intelligence#prompt-safety-audit', 'Prompt Safety & Audit', '提示词安全与审计')
    ]
  },
  {
    order: '7',
    href: '/customer-center',
    title: 'Customer Center',
    zh: '客户中心',
    badge: 14,
    children: [
      child('/customer-center#customer-list', 'Customer List', '客户列表'),
      child('/customer-center#customer-profiles', 'Customer Profiles', '客户档案'),
      child('/customer-center#customer-360-timeline', 'Customer 360 Timeline', '客户 360 时间线'),
      child('/customer-center#pending-customer-binding', 'Pending Customer Binding', '待绑定客户'),
      child('/customer-center#binding-review-merge', 'Binding Review & Merge', '绑定审核与合并'),
      child('/customer-center#repair-tracking', 'Repair Tracking', '维修进度追踪'),
      child('/customer-center#customer-quotes', 'Quotes Linked to Customer', '客户关联报价'),
      child('/customer-center#customer-invoices', 'Invoices Linked to Customer', '客户关联发票'),
      child('/customer-center#customer-payments-receipts', 'Payments & Receipts', '客户付款与收据'),
      child('/customer-center#customer-warranty-records', 'Warranty Records', '客户保修记录'),
      child('/customer-center#customer-portal-management', 'Customer Portal Management', '客户门户管理'),
      child('/customer-center#testimonials-reviews', 'Testimonials & Reviews', '客户评价与见证'),
      child('/customer-center#pdpa-privacy-requests', 'PDPA / Privacy Requests', '隐私请求'),
      child('/customer-center#customer-access-control', 'Customer Access Control', '客户访问控制')
    ]
  },
  {
    order: '8',
    href: '/system-settings',
    title: 'Website & System Settings',
    zh: '网站与系统设置',
    badge: 16,
    children: [
      child('/system-settings#company-settings', 'Company Settings', '公司设置'),
      child('/system-settings#logo-brand-assets', 'Logo & Brand Assets', 'Logo 与品牌素材'),
      child('/system-settings#admin-login-branding', 'Admin Login Branding', '后台登录品牌'),
      child('/system-settings#api-integrations', 'API Integrations', 'API 集成'),
      child('/system-settings#supabase-settings', 'Supabase Settings', 'Supabase 设置'),
      child('/system-settings#github-vercel-deployment-settings', 'GitHub / Vercel Deployment Settings', 'GitHub / Vercel 部署设置'),
      child('/system-settings#search-settings', 'Search Settings', '搜索设置'),
      child('/system-settings#role-groups-permissions', 'Role Groups & Permissions', '角色分组与权限'),
      child('/system-settings#admin-accounts', 'Admin Accounts', '管理员账号'),
      child('/system-settings#admin-registration-review', 'Admin Registration Review', '管理员注册审核'),
      child('/system-settings#backup-download-center', 'Backup & Download Center', '备份与下载中心'),
      child('/system-settings#qr-backend-management', 'QR Backend Management', '后台二维码管理'),
      child('/system-settings#audit-logs', 'Audit Logs', '审计日志'),
      child('/system-settings#health-checks', 'Health Checks', '健康检查'),
      child('/system-settings#error-boundaries-module-isolation', 'Error Boundaries & Module Isolation', '错误边界与模块隔离'),
      child('/system-settings#security-settings', 'Security Settings', '安全设置')
    ]
  }
];
