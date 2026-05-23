export type Priority = "P0" | "P1" | "P2" | "P3";

export type BilingualText = {
  en: string;
  zh: string;
};

export type AdminModule = {
  order: string;
  slug: string;
  title: BilingualText;
  description: BilingualText;
  features: BilingualText[];
  connections: BilingualText[];
};

const bi = (en: string, zh: string): BilingualText => ({ en, zh });

export const formatBi = (text: BilingualText) => `${text.en} / ${text.zh}`;

export const adminModules: AdminModule[] = [
  {
    order: "Top",
    slug: "global-search",
    title: bi("Top Fixed Global Search", "顶部固定全局搜索"),
    description: bi(
      "One fixed internal search input visible on every admin page. Filters are collapsible chips, not extra search boxes.",
      "每个后台页面都显示一个固定内部搜索框。筛选项使用可折叠条件，不额外增加搜索框。"
    ),
    features: [
      bi("All permitted internal records", "所有授权内部记录"),
      bi("Collapsible filters", "可折叠筛选"),
      bi("Grouped results", "分组结果"),
      bi("Deep links", "深层链接"),
      bi("Search, click and export logs", "搜索、点击与导出日志")
    ],
    connections: [
      bi("Supabase search index", "Supabase 搜索索引"),
      bi("RLS", "行级安全 RLS"),
      bi("Audit logs", "审计日志"),
      bi("Admin layout", "后台布局")
    ]
  },
  {
    order: "1",
    slug: "dashboard",
    title: bi("Dashboard, Analytics & Alerts", "数据分析、预警与待处理事项"),
    description: bi(
      "Default daily homepage for urgent changes, pending work, conversion, operations, sales, warranty, AI and social alerts.",
      "每日默认首页，用于紧急变化、待处理工作、转化、运营、销售、保修、AI 与社媒预警。"
    ),
    features: [
      bi("Today pending tasks", "今日待处理任务"),
      bi("Business overview", "业务总览"),
      bi("Lead and conversion overview", "线索与转化总览"),
      bi("Job and operation overview", "工单与运营总览"),
      bi("Sales and payment overview", "销售与付款总览"),
      bi("Warranty and AI alerts", "保修与 AI 预警"),
      bi("Reports export", "报表导出")
    ],
    connections: [
      bi("Leads", "线索"),
      bi("Jobs", "工单"),
      bi("Payments", "付款"),
      bi("AI logs", "AI 日志"),
      bi("Webhook queue", "Webhook 队列"),
      bi("Backup health", "备份健康状态")
    ]
  },
  {
    order: "2",
    slug: "operations",
    title: bi("Service & Order Operations", "服务与订单运营中心"),
    description: bi(
      "Daily workflow from lead intake to service request, inspection, job, quotation, invoice, payment, receipt and warranty.",
      "从线索进入到服务请求、勘查、工单、报价、发票、付款、收据和保修的每日流程。"
    ),
    features: [
      bi("Unified intake", "统一获客入口"),
      bi("Service requests", "服务请求"),
      bi("Booking calendar", "预约日历"),
      bi("Site inspections", "现场勘查"),
      bi("Jobs", "工单"),
      bi("Engineer assignment", "工程师派工"),
      bi("Quotations", "报价"),
      bi("Invoices", "发票"),
      bi("Payments", "付款"),
      bi("Warranties", "保修")
    ],
    connections: [
      bi("Customer Center", "客户中心"),
      bi("Engineer Portal", "工程师入口"),
      bi("Dashboard", "仪表盘"),
      bi("Audit logs", "审计日志")
    ]
  },
  {
    order: "3",
    slug: "website",
    title: bi("Website Management", "网站后台管理"),
    description: bi(
      "Manage bilingual website content, forms, media, SEO/AEO, AI drafts, preview and publish logs.",
      "管理中英双语网站内容、表单、媒体、SEO/AEO、AI 草稿、预览与发布日志。"
    ),
    features: [
      bi("Website dashboard", "网站仪表盘"),
      bi("Page content editor", "页面内容编辑器"),
      bi("Guide library", "指南库"),
      bi("SEO/AEO records", "SEO/AEO 记录"),
      bi("AI website drafts", "AI 网站草稿"),
      bi("Preview", "预览"),
      bi("Publish", "发布"),
      bi("Media library", "媒体库"),
      bi("Website forms", "网站表单")
    ],
    connections: [
      bi("Public website APIs", "公开网站 API"),
      bi("Global Search", "全局搜索"),
      bi("AI review flow", "AI 审核流程"),
      bi("Publish logs", "发布日志")
    ]
  },
  {
    order: "4",
    slug: "social",
    title: bi("Social Media Management", "社交媒体管理中心"),
    description: bi(
      "Unified handling for Google Business Profile, WhatsApp, live chat and social channels with AI suggestions and human handoff.",
      "统一处理 Google 商家资料、WhatsApp、在线聊天和社交渠道，并支持 AI 建议与转人工。"
    ),
    features: [
      bi("Unified inbox", "统一收件箱"),
      bi("GMB management", "GMB 管理"),
      bi("WhatsApp AI reply", "WhatsApp AI 回复"),
      bi("Transfer to human", "转人工"),
      bi("Social leads", "社媒线索"),
      bi("Content calendar", "内容日历"),
      bi("Publishing logs", "发布日志"),
      bi("Reports", "报表")
    ],
    connections: [
      bi("Inbound events", "入站事件"),
      bi("Lead conversion", "线索转化"),
      bi("AI risk rules", "AI 风险规则"),
      bi("Dashboard alerts", "仪表盘预警")
    ]
  },
  {
    order: "5",
    slug: "ai",
    title: bi("AI Intelligence Center", "AI 智能中心"),
    description: bi(
      "AI assists with search intelligence, reply drafts, lead screening, content generation, quotation support and alert classification.",
      "AI 协助搜索智能、回复草稿、线索筛选、内容生成、报价支持和预警分类。"
    ),
    features: [
      bi("Global web search", "全网搜索"),
      bi("AI knowledge base", "AI 知识库"),
      bi("AI reply rules", "AI 回复规则"),
      bi("Conversation intelligence", "会话智能"),
      bi("Human handoff", "转人工"),
      bi("AI alerts", "AI 预警"),
      bi("Usage and cost", "使用量与成本"),
      bi("Safety rules", "安全规则")
    ],
    connections: [
      bi("AI logs", "AI 日志"),
      bi("Review queues", "审核队列"),
      bi("Website drafts", "网站草稿"),
      bi("Social replies", "社媒回复"),
      bi("Service requests", "服务请求")
    ]
  },
  {
    order: "6",
    slug: "customers",
    title: bi("Customer Center", "客户中心"),
    description: bi(
      "Customer 360 view, portal management, repair tracking, pending binding and communication history.",
      "客户 360 视图、客户中心管理、报修追踪、待绑定客户与沟通历史。"
    ),
    features: [
      bi("Customer dashboard", "客户仪表盘"),
      bi("Customer profiles", "客户资料"),
      bi("Customer requests", "客户请求"),
      bi("Customer jobs", "客户工单"),
      bi("Customer quotations", "客户报价"),
      bi("Customer invoices", "客户发票"),
      bi("Customer payments", "客户付款"),
      bi("Customer warranties", "客户保修"),
      bi("Pending customer binding", "待处理客户绑定")
    ],
    connections: [
      bi("Customer portal", "客户中心"),
      bi("Service requests", "服务请求"),
      bi("Audit logs", "审计日志"),
      bi("RLS", "行级安全 RLS")
    ]
  },
  {
    order: "7",
    slug: "settings",
    title: bi("Website & System Settings", "网站与系统设置"),
    description: bi(
      "Low-frequency configuration for branding, users, roles, integrations, notification tiers, backups, restore and audit logs.",
      "低频配置区，用于品牌、用户、角色、集成、通知等级、备份、恢复与审计日志。"
    ),
    features: [
      bi("Logo and favicon", "LOGO 与 favicon"),
      bi("Admin users", "后台用户"),
      bi("Roles and permissions", "角色与权限"),
      bi("Search scope", "搜索范围"),
      bi("API integrations", "API 集成"),
      bi("AI provider settings", "AI 供应商设置"),
      bi("Notification P0/P1/P2/P3", "通知 P0/P1/P2/P3"),
      bi("Backup and restore", "备份与恢复"),
      bi("Security settings", "安全设置"),
      bi("Audit logs", "审计日志")
    ],
    connections: [
      bi("Supabase", "Supabase"),
      bi("GitHub", "GitHub"),
      bi("Vercel", "Vercel"),
      bi("Storage", "存储"),
      bi("Webhook queue", "Webhook 队列")
    ]
  }
];

export const dashboardCards = [
  { label: bi("New leads", "新线索"), value: "24", delta: "+12%", priority: "P1" as Priority },
  { label: bi("Unassigned service requests", "未分配服务请求"), value: "7", delta: "needs action", priority: "P0" as Priority },
  { label: bi("Inspections due today", "今日到期勘查"), value: "5", delta: "3 confirmed", priority: "P1" as Priority },
  { label: bi("Unpaid invoices", "未付款发票"), value: "11", delta: "2 overdue", priority: "P1" as Priority },
  { label: bi("AI drafts pending review", "待审核 AI 草稿"), value: "18", delta: "no auto-publish", priority: "P2" as Priority },
  { label: bi("Webhook failures", "Webhook 失败"), value: "1", delta: "DLQ review", priority: "P0" as Priority }
];

export const workflowStates = [
  {
    entity: bi("Lead", "线索"),
    flow: "new -> contacted -> qualified -> converted -> closed_lost",
    rule: bi("Lead conversion creates or links a service request; duplicate/closed-lost requires reason.", "线索转化会创建或关联服务请求；重复或流失必须填写原因。")
  },
  {
    entity: bi("Service Request", "服务请求"),
    flow: "new -> pending_review -> inspection_scheduled -> converted_to_job -> closed",
    rule: bi("Formal job requires admin review and explicit Create Job action.", "正式工单需要后台审核，并明确点击创建工单。")
  },
  {
    entity: bi("Job", "工单"),
    flow: "draft -> assigned -> in_progress -> completed -> warranty_active -> closed",
    rule: bi("Engineer updates are limited to assigned jobs and always append progress logs.", "工程师只能更新已分配工单，并始终追加进度日志。")
  },
  {
    entity: bi("Quotation", "报价"),
    flow: "draft -> admin_review -> sent_to_customer -> customer_approved -> rejected/expired",
    rule: bi("Customer visibility starts only after admin sends the quotation.", "只有管理员发送报价后客户才可见。")
  },
  {
    entity: bi("Invoice", "发票"),
    flow: "draft -> issued -> partially_paid -> paid -> overdue -> void",
    rule: bi("Financial actions require role permission and audit logs.", "财务操作需要角色权限并记录审计日志。")
  }
];

export const aiRiskRules = [
  {
    level: bi("Low", "低"),
    examples: bi("FAQ summary, tagging, classification, internal notes", "FAQ 摘要、标签、分类、内部备注"),
    review: bi("Can auto-suggest for internal use", "可自动建议，仅供内部使用"),
    externalAction: bi("No external send or publish", "不得对外发送或发布")
  },
  {
    level: bi("Medium", "中"),
    examples: bi("Customer reply draft, website/social content draft", "客户回复草稿、网站 / 社媒内容草稿"),
    review: bi("Human review required", "需要人工审核"),
    externalAction: bi("Send/publish only after approval", "批准后才可发送 / 发布")
  },
  {
    level: bi("High", "高"),
    examples: bi("Pricing, warranty, complaint, refund, legal/privacy", "价格、保修、投诉、退款、法律 / 隐私"),
    review: bi("Senior/admin review required", "需要高级人员 / 管理员审核"),
    externalAction: bi("No auto-send", "不得自动发送")
  },
  {
    level: bi("Critical", "紧急"),
    examples: bi("Severe leakage, burst pipe, urgent today inspection, system failure", "严重漏水、爆管、当天紧急勘查、系统故障"),
    review: bi("Immediate human handoff", "立即转人工"),
    externalAction: bi("P0/P1 admin alert", "P0/P1 管理员预警")
  }
];

export const searchFilters = [
  "customers",
  "leads",
  "service_requests",
  "jobs",
  "site_inspections",
  "quotations",
  "invoices",
  "payments",
  "receipts",
  "warranties",
  "website_content",
  "guide_articles",
  "social_messages",
  "social_leads",
  "materials",
  "suppliers",
  "ai_logs",
  "audit_logs"
];
