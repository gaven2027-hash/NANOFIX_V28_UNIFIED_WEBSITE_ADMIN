export type MenuStatus = 'active' | 'hidden' | 'redirected' | 'manual_mode' | 'disabled';

export type MenuChild = {
  href: string;
  title: string;
  zh: string;
  description?: string;
  descriptionZh?: string;
  status?: MenuStatus;
  priority?: number;
  legacyFrom?: string[];
  requiredRole?: string;
};

export type MenuItem = {
  order: string;
  href: string;
  title: string;
  zh: string;
  badge: number | string;
  description?: string;
  descriptionZh?: string;
  status?: MenuStatus;
  requiredRole?: string;
  children: MenuChild[];
};

const child = (
  href: string,
  title: string,
  zh: string,
  description: string,
  descriptionZh: string,
  legacyFrom: string[] = [],
  status: MenuStatus = 'active'
): MenuChild => ({ href, title, zh, description, descriptionZh, legacyFrom, status });

export const v287AdminNavigation: MenuItem[] = [
  {
    order: '0',
    href: '/admin',
    title: 'Global Overview & Admin Home',
    zh: '全局总览与后台首页',
    badge: 'Home',
    description: 'Single launch board for daily admin entry, global search and high-priority tasks.',
    descriptionZh: '统一后台入口、全局搜索与高优先级任务总览。',
    children: [
      child('/admin#global-search', 'Global Search', '全局搜索', 'Search customers, leads, jobs, content and system records from one entry.', '统一搜索客户、线索、工单、内容和系统记录。'),
      child('/admin#module-launch-board', 'Module Launch Board', '模块入口总览', 'Open the practical V28.7 backend modules.', '进入 V28.7 精简后的真实后台模块。'),
      child('/admin#my-pending-tasks', 'My Pending Tasks', '我的待处理事项', 'Show approvals, urgent actions and pending operational tasks.', '显示审批、紧急处理和待办任务。'),
      child('/admin#quick-create', 'Quick Create', '快速新建', 'Create common records such as leads, service requests and drafts.', '快速创建线索、报修、工单和草稿。')
    ]
  },
  {
    order: '1',
    href: '/dashboard',
    title: 'Dashboard',
    zh: '全局仪表盘',
    badge: 6,
    description: 'Daily overview for alerts, intake, operations, revenue, channels and health.',
    descriptionZh: '每日查看预警、入口、业务、收入、渠道和系统健康。',
    children: [
      child('/dashboard#executive-overview', 'Executive Overview', '总管理总览', 'One-page business and system overview.', '业务和系统的一页式总览。'),
      child('/dashboard#urgent-action-queue', 'Urgent Action Queue', '紧急待处理队列', 'Prioritize items requiring immediate admin action.', '优先处理需要管理员立即处理的事项。', ['automation-notification-engine', 'internal-inbox', 'unified-task-engine']),
      child('/dashboard#intake-lead-summary', 'Intake & Lead Summary', '入口与线索汇总', 'Summarize public intake, social leads and paid leads.', '汇总公开报修、社媒线索和广告线索。'),
      child('/dashboard#operations-summary', 'Operations Summary', '业务运营摘要', 'Summarize inspections, quotations, jobs and warranties.', '汇总查验、报价、工单和保修。'),
      child('/dashboard#channel-performance-snapshot', 'Channel Performance Snapshot', '渠道表现快照', 'Compare website, social, WhatsApp and ads performance.', '对比官网、社媒、WhatsApp 和广告表现。'),
      child('/dashboard#system-health-summary', 'System Health Summary', '系统健康摘要', 'Show database, API, deployment and module health.', '显示数据库、API、部署和模块健康。')
    ]
  },
  {
    order: '2',
    href: '/website-management',
    title: 'Website Management',
    zh: '网站后台管理',
    badge: 8,
    description: 'Real CMS editing, media replacement, submissions, SEO/AEO, preview, publish and rollback.',
    descriptionZh: '真实 CMS 编辑、媒体替换、表单提交、SEO/AEO、预览、发布与回滚。',
    children: [
      child('/website-management#navigation-homepage', 'Navigation & Homepage', '导航与首页', 'Edit homepage banner, CTA, service cards, reviews and homepage media.', '编辑首页 Banner、CTA、服务卡片、客户评价和首页图片。', ['navigation-menu', 'homepage-content', 'customer-review-carousel']),
      child('/website-management#service-pages', 'Service Pages', '服务页面', 'Edit Leak Detection, No-Hacking Repair and Waterproofing Works text, media, FAQ and CTA.', '编辑 Leak Detection、No-Hacking Repair、Waterproofing Works 服务页文字、图片、FAQ 和 CTA。', ['page-content', 'service-page-content', 'service-testimonials-block']),
      child('/website-management#track-record-warranty', 'Track Record & Warranty', '案例与保修', 'Manage projects, before/after photos, warranty terms and testimonials.', '管理案例、Before/After、项目照片、保修条款和客户见证。', ['track-record-warranty-content', 'client-testimonials-display']),
      child('/website-management#guide-faq-tips', 'Guide, FAQ & Tips', '指南、问答与维护建议', 'Manage Guide articles, FAQ, care tips, SEO questions and AEO answers.', '管理 Guide 文章、FAQ、维护建议、SEO 问答和 AEO 问答。', ['guide-library', 'faq-tips', 'seo-aeo-library', 'ai-website-content-generator']),
      child('/website-management#forms-submissions', 'Forms & Submissions', '表单与报修提交', 'Review public repair forms, uploads, leads and source attribution.', '查看公开报修、上传文件、线索和来源归因。', ['forms-public-submission', 'public-form-submissions', 'public-upload-review', 'website-organic-leads', 'website-paid-landing-leads']),
      child('/website-management#media-library', 'Media Library', '媒体素材库', 'Upload, compress, crop, replace and bind images or videos to page blocks.', '上传、压缩、裁剪、替换并绑定图片/视频到页面区块。', ['media-library']),
      child('/website-management#seo-aeo-analytics', 'SEO / AEO & Analytics', 'SEO、AEO 与数据', 'Edit metadata, schema, FAQ schema, keywords and page performance.', '编辑 Meta、Schema、FAQ Schema、关键词和页面表现。', ['website-leads-analytics']),
      child('/website-management#preview-publish-version', 'Preview / Publish / Version', '预览、发布与版本', 'Preview, submit approval, publish, rollback and inspect version history.', '预览、提交审批、发布、回滚和查看版本历史。', ['preview', 'publish-approval', 'version-history'])
    ]
  },
  {
    order: '3',
    href: '/service-operations',
    title: 'Service & Order Operations',
    zh: '业务订单处理',
    badge: 9,
    description: 'Practical OA/ERP chain from leads to inspection, quote, job, payment, warranty and audit.',
    descriptionZh: '从线索到查验、报价、工单、付款、保修和审计的实用 OA/ERP 链路。',
    children: [
      child('/service-operations#leads-intake', 'Leads & Intake', '线索与报修入口', 'Collect website, WhatsApp, social and paid leads.', '汇总官网、WhatsApp、社媒和广告线索。', ['leads', 'service-requests']),
      child('/service-operations#site-inspection', 'Site Inspection', '现场查验', 'Schedule inspections and manage inspection records, photos and findings.', '排程查验并管理查验记录、照片和结果。', ['inspection-scheduling', 'inspections']),
      child('/service-operations#quotations', 'Quotations', '报价', 'Create, revise, approve and track quotation responses.', '创建、修改、审批并追踪报价反馈。', ['quotations', 'quotation-approval']),
      child('/service-operations#jobs-scheduling', 'Jobs & Scheduling', '工单与排期', 'Create jobs, plan schedules and track work execution.', '创建工单、安排施工并追踪执行。', ['jobs', 'work-execution', 'progress-updates']),
      child('/service-operations#engineer-tasks', 'Engineer Tasks', '工程师任务', 'Assign engineers and follow task updates.', '分配工程师并跟进任务更新。', ['engineer-assignment']),
      child('/service-operations#invoices', 'Invoices', '发票', 'Generate invoices and customer-facing PDF documents.', '生成发票和客户可见 PDF 文件。', ['invoices', 'receipts']),
      child('/service-operations#payments', 'Payments', '付款', 'Track payment intent, checkout, receipt and paid/unpaid status.', '追踪付款意图、付款链接、收据和付款状态。', ['payments']),
      child('/service-operations#warranty-completion', 'Warranty & Completion', '完工与保修', 'Generate completion records, warranties and warranty claim handling.', '生成完工记录、保修并处理保修维修。', ['warranty-records', 'warranty-generation-rules', 'warranty-claim-review', 'warranty-claim-routing', 'warranty-claim-messages', 'warranty-claim-attachments', 'warranty-claim-closure', 'warranty-claim-satisfaction-followup']),
      child('/service-operations#operations-audit', 'Operations Audit', '操作审计', 'Review status flow, override actions and audit trail.', '查看状态流转、强制接管和审计时间线。', ['status-flow-logs', 'super-admin-takeover-override', 'warranty-satisfaction-notification-rules', 'warranty-satisfaction-audit-trail', 'rework'])
    ]
  },
  {
    order: '4',
    href: '/customer-center',
    title: 'Customer Center',
    zh: '客户中心',
    badge: 8,
    description: 'Customer profiles, binding, portal, repair tracking, quotes, payments, warranties and privacy consent.',
    descriptionZh: '客户档案、绑定、门户、维修追踪、报价付款、保修文件和隐私授权。',
    children: [
      child('/customer-center#customer-profiles', 'Customer Profiles', '客户档案', 'Manage customer list, 360 profile and offline customer records.', '管理客户列表、360 档案和后台代录客户。', ['add-offline-customer', 'customer-list', 'customer-profiles', 'customer-360-timeline']),
      child('/customer-center#customer-binding-verification', 'Customer Binding & Verification', '客户绑定与验证', 'Review unclaimed profiles, account claims, binding and duplicate merge.', '审核未认领档案、账号认领、绑定和重复客户合并。', ['unclaimed-customer-profiles', 'claim-existing-account-review', 'pending-customer-binding', 'binding-review-merge', 'customer-binding-rules', 'data-matching-rules']),
      child('/customer-center#customer-portal-accounts', 'Customer Portal Accounts', '客户门户账号', 'Manage portal access and customer account status.', '管理客户门户访问和账号状态。', ['customer-portal-management', 'customer-access-control']),
      child('/customer-center#repair-tracking', 'Repair Tracking', '维修进度追踪', 'Show customer-linked jobs, repair progress and service timeline.', '显示客户关联工单、维修进度和服务时间线。', ['repair-tracking', 'lead-source-history']),
      child('/customer-center#quotes-payments', 'Quotes & Payments', '报价与付款', 'Connect quotations, invoices, payments and receipts to customer records.', '把报价、发票、付款和收据关联到客户。', ['customer-quotes', 'customer-invoices', 'customer-payments-receipts']),
      child('/customer-center#warranty-documents', 'Warranty & Documents', '保修与文件', 'Manage customer warranty records and downloadable documents.', '管理客户保修记录和可下载文件。', ['customer-warranty-records']),
      child('/customer-center#reviews-feedback', 'Reviews & Feedback', '评价与反馈', 'Manage customer reviews, testimonials, display locations and archive.', '管理客户评价、见证、展示位置和存档。', ['customer-submit-review', 'my-reviews-management', 'testimonials-reviews', 'review-display-locations', 'review-archive']),
      child('/customer-center#privacy-consent', 'Privacy & Consent', '隐私与授权', 'Handle PDPA consent, privacy requests, redaction and deletion audit.', '处理 PDPA 授权、隐私请求、脱敏和删除审计。', ['review-privacy-settings', 'review-approval-privacy-redaction', 'review-deletion-audit', 'consent-pdpa-log', 'pdpa-privacy-requests'])
    ]
  },
  {
    order: '5',
    href: '/social-media',
    title: 'Social Media Management',
    zh: '社媒管理',
    badge: 8,
    description: 'Social accounts, WhatsApp, AI reply drafts, content studio, video, approvals, leads and performance.',
    descriptionZh: '社媒账号、WhatsApp、AI 回复草稿、内容工作室、视频、审批、线索和表现。',
    children: [
      child('/social-media#social-accounts-api-connections', 'Social Accounts & API Connections', '社媒账号与 API 接入', 'Connect Facebook, Instagram, WhatsApp, GBP, TikTok, YouTube Shorts, X and Xiaohongshu.', '接入 Facebook、Instagram、WhatsApp、GBP、TikTok、YouTube Shorts、X 和小红书。', ['social-accounts', 'google-business-profile']),
      child('/social-media#unified-inbox-whatsapp', 'Unified Inbox & WhatsApp', '统一收件箱与 WhatsApp', 'Collect messages, comments and WhatsApp conversations in one inbox.', '统一接收私信、评论和 WhatsApp 对话。', ['unified-social-inbox', 'whatsapp-ai-reply', 'live-chat-webhook-collector', 'review-comment-management']),
      child('/social-media#ai-reply-human-transfer', 'AI Reply & Human Transfer', 'AI 回复与转人工', 'Generate AI reply drafts, review manually and transfer to human.', '生成 AI 回复草稿、人工审核并转人工。', ['transfer-to-human']),
      child('/social-media#content-studio', 'Content Studio', '内容工作室', 'Create text, image, video, subtitle, cover and CTA drafts.', '创建图文、视频、字幕、封面和 CTA 草稿。', ['ai-social-content-studio']),
      child('/social-media#multi-platform-video-generator', 'Multi-platform Video Generator', '多平台视频生成', 'Generate platform-specific video versions from one source asset.', '一个素材生成多平台合规视频版本。'),
      child('/social-media#preview-approval-publishing', 'Preview, Approval & Publishing', '预览、审批与发布', 'Preview, approve, schedule, publish and retry failed publishing jobs.', '预览、审批、排期、发布和失败重试。', ['multi-platform-preview-review', 'schedule-publish-approval', 'campaign-posting-queue']),
      child('/social-media#social-leads-attribution', 'Social Leads & Attribution', '社媒线索与归因', 'Convert social conversations, comments and messages into leads.', '把社媒私信、评论和消息转为线索。', ['organic-social-leads', 'social-organic-conversion', 'google-facebook-review-import']),
      child('/social-media#social-logs-performance', 'Social Logs & Performance', '社媒日志与表现', 'Review sync logs, publishing logs, errors, clicks, inquiries and conversions.', '查看同步日志、发布日志、错误、点击、询盘和转化。', ['social-logs', 'social-performance'])
    ]
  },
  {
    order: '6',
    href: '/admin/advertising-center',
    title: 'Advertising & Promotion Center',
    zh: '广告推广中心',
    badge: 8,
    description: 'Ads account connections, platform data, creatives, UTM, landing pages, budget and ROI.',
    descriptionZh: '广告账号接入、平台数据、素材、UTM、落地页、预算和 ROI。',
    children: [
      child('/admin/advertising-center#ads-accounts-api-connections', 'Ads Accounts & API Connections', '广告账号与 API 接入', 'Connect Google Ads, Meta Ads, TikTok Ads, X Ads, YouTube Ads, Xiaohongshu Ads and Bing Ads.', '接入 Google Ads、Meta Ads、TikTok Ads、X Ads、YouTube Ads、小红书 Ads 和 Bing Ads。', ['ad-account-connections', 'advertising-account-connection-center']),
      child('/admin/advertising-center#google-ads', 'Google Ads', 'Google 广告', 'Sync Google Ads campaigns, clicks, spend and conversions.', '同步 Google 广告活动、点击、花费和转化。', ['google-ads']),
      child('/admin/advertising-center#meta-ads', 'Meta Ads', 'Meta 广告', 'Manage Facebook and Instagram ad account data and lead ads.', '管理 Facebook / Instagram 广告账号数据和 Lead Ads。', ['paid-social-ads']),
      child('/admin/advertising-center#tiktok-ads', 'TikTok Ads', 'TikTok 广告', 'Track TikTok advertiser data, pixel, lead gen and performance.', '追踪 TikTok 广告账号、Pixel、线索表单和表现。'),
      child('/admin/advertising-center#x-ads', 'X Ads', 'X 广告', 'Track X ad account, campaign, creative, cost, click and lead data.', '追踪 X 广告账号、Campaign、素材、花费、点击和线索。'),
      child('/admin/advertising-center#video-ads-creatives', 'Video Ads & Creatives', '视频广告与素材', 'Prepare ad video, cover, copy, CTA and multi-size versions.', '准备广告视频、封面、文案、CTA 和多尺寸版本。', ['creatives-copy']),
      child('/admin/advertising-center#landing-pages-utm', 'Landing Pages & UTM', '落地页与 UTM', 'Manage landing pages, UTM, WhatsApp clicks and attribution events.', '管理落地页、UTM、WhatsApp 点击和归因事件。', ['utm-landing-pages', 'click-to-whatsapp-ads', 'paid-lead-attribution']),
      child('/admin/advertising-center#budget-roi-performance', 'Budget / ROI / Performance', '预算、ROI 与表现', 'Review spend, CPL, ROAS, ROI, alerts and finance review.', '查看花费、CPL、ROAS、ROI、预警和财务审核。', ['campaign-dashboard', 'campaign-planning', 'create-campaign-draft', 'csv-excel-import', 'roi-insights-alerts', 'budgets-strategy', 'approval-gates', 'roi-comparison', 'daily-spend-review', 'finance-review', 'super-admin-takeover', 'ad-logs'])
    ]
  },
  {
    order: '7',
    href: '/ai-intelligence',
    title: 'AI Intelligence Center',
    zh: 'AI 智能中心',
    badge: 7,
    description: 'AI-assisted website, social, ads, lead scoring, quote, invoice, warranty, risk and logs.',
    descriptionZh: 'AI 辅助网站、社媒、广告、线索评分、报价、发票、保修、风险和日志。',
    children: [
      child('/ai-intelligence#ai-dashboard-alerts', 'AI Dashboard & Alerts', 'AI 总览与预警', 'Show AI alerts, usage and high-risk tasks.', '显示 AI 预警、用量和高风险事项。', ['ai-alerts', 'usage-cost']),
      child('/ai-intelligence#website-ai-content', 'Website AI Content', '网站 AI 内容', 'Generate website SEO/AEO drafts for human approval.', '生成网站 SEO/AEO 草稿供人工审核。', ['ai-website-assistant']),
      child('/ai-intelligence#social-ai-content', 'Social AI Content', '社媒 AI 内容', 'Generate social posts, reply drafts and content variants.', '生成社媒帖子、回复草稿和内容版本。', ['ai-social-assistant', 'ai-review-moderation-assist']),
      child('/ai-intelligence#ads-ai-assistant', 'Ads AI Assistant', '广告 AI 助手', 'Generate ad ideas, copy, keywords and CTA drafts.', '生成广告创意、文案、关键词和 CTA 草稿。', ['ai-attribution-assistant']),
      child('/ai-intelligence#lead-scoring-intake-ai', 'Lead Scoring & Intake AI', '线索评分与报修 AI', 'Classify intake, detect urgency and score leads.', '分类报修、识别紧急程度并给线索评分。', ['lead-discovery-scoring', 'ai-conversation-intelligence']),
      child('/ai-intelligence#quote-invoice-warranty-ai', 'Quote / Invoice / Warranty AI', '报价、发票与保修 AI', 'Draft quotation, invoice and warranty text for admin review.', '生成报价、发票和保修文案供管理员审核。', ['quotation-ai-assist', 'invoice-ai-assist', 'material-ai-suggestions']),
      child('/ai-intelligence#privacy-risk-ai-logs', 'Privacy, Risk & AI Logs', '隐私、风险与 AI 日志', 'Manage AI rules, privacy redaction, API settings, prompt safety and logs.', '管理 AI 规则、隐私脱敏、接口设置、提示词安全和日志。', ['global-web-search', 'ai-privacy-redaction-assist', 'ai-rules', 'ai-api-settings', 'ai-analysis-logs', 'prompt-safety-audit'])
    ]
  },
  {
    order: '8',
    href: '/system-settings',
    title: 'System Settings',
    zh: '系统设置',
    badge: 8,
    description: 'Users, permissions, credentials, Supabase, deployment, backup, security, webhooks and global settings.',
    descriptionZh: '用户权限、凭证、Supabase、部署、备份、安全、Webhook 和全局设置。',
    children: [
      child('/system-settings#users-roles-permissions', 'Users, Roles & Permissions', '用户、角色与权限', 'Manage admin accounts, staff registration and RBAC.', '管理管理员账号、内部人员注册和 RBAC 权限。', ['role-groups-permissions', 'admin-accounts', 'admin-registration-review', 'internal-staff-login-registration']),
      child('/system-settings#api-credential-center', 'API Credential Center', 'API 凭证中心', 'Save encrypted credentials, test connections, sync data and inspect logs.', '加密保存凭证、测试连接、同步数据并查看日志。', ['api-integrations']),
      child('/system-settings#supabase-database-rls', 'Supabase Database & RLS', 'Supabase 数据库与 RLS', 'Inspect database, RLS, public intake security and table health.', '检查数据库、RLS、免登录报修安全和数据表健康。', ['supabase-settings', 'no-login-repair-intake-security']),
      child('/system-settings#github-vercel-deployment', 'GitHub / Vercel Deployment', 'GitHub 与 Vercel 部署', 'Manage deployment settings, release safety and production checks.', '管理部署设置、发布安全和生产检查。', ['github-vercel-deployment-settings']),
      child('/system-settings#backup-restore', 'Backup & Restore', '备份与恢复', 'Run backup, download, restore rehearsal and retention checks.', '执行备份、下载、恢复演练和保留周期检查。', ['backup-download-center']),
      child('/system-settings#security-health-checks', 'Security & Health Checks', '安全与健康检查', 'Review security settings, health checks and module isolation.', '查看安全设置、健康检查和模块隔离。', ['health-checks', 'security-settings', 'error-boundaries-module-isolation']),
      child('/system-settings#webhooks-error-logs', 'Webhooks & Error Logs', 'Webhook 与错误日志', 'Inspect public API monitor, webhook status, audit logs and error queues.', '检查公开接口、Webhook 状态、审计日志和错误队列。', ['public-api-monitor', 'audit-logs']),
      child('/system-settings#global-settings', 'Global Settings', '全局设置', 'Manage company, brand, login, notification, automation, SLA, search, attribution and privacy rules.', '管理公司、品牌、登录、通知、自动化、SLA、搜索、归因和隐私规则。', ['company-settings', 'logo-brand-assets', 'admin-login-branding', 'customer-portal-login-branding', 'customer-portal-login-registration', 'search-settings', 'super-admin-override-rules', 'automation-rule-settings', 'notification-channel-settings', 'unified-task-sla-settings', 'qr-backend-management', 'attribution-rules', 'review-privacy-publishing-rules', 'public-display-consent-rules', 'review-archive-deletion-rules'])
    ]
  }
];

export const menu = v287AdminNavigation;
