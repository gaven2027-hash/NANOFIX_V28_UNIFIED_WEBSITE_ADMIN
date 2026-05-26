export type Priority = "P0" | "P1" | "P2" | "P3";

export type BilingualText = {
  en: string;
  zh: string;
};

export type AdminCenter = {
  order: string;
  title: BilingualText;
  subtitle: BilingualText;
  icon: string;
  accent: string;
  metrics: Array<{ label: BilingualText; value: string; tone: "blue" | "green" | "amber" | "red" }>;
  functions: BilingualText[];
  controls: BilingualText[];
};

export type WorkflowStep = {
  name: BilingualText;
  status: BilingualText;
  owner: BilingualText;
  guardrail: BilingualText;
};

export type IntakeRecord = {
  id: string;
  source: BilingualText;
  customer: string;
  issue: BilingualText;
  priority: Priority;
  status: BilingualText;
  nextAction: BilingualText;
};

export type SuccessMessageRule = {
  scenario: BilingualText;
  english: string;
  chinese: string;
  primarySubmitButton: BilingualText;
  nextStepButtons: BilingualText;
  note: BilingualText;
};

export const t = (text: BilingualText) => `${text.en} / ${text.zh}`;
export const en = (text: BilingualText) => text.en;
export const zh = (text: BilingualText) => text.zh;

const bi = (english: string, chinese: string): BilingualText => ({ en: english, zh: chinese });

export const adminCenters: AdminCenter[] = [
  {
    order: "1",
    title: bi("Dashboard, Analytics & Alerts", "仪表盘、数据分析与预警"),
    subtitle: bi("Daily command center for leads, jobs, alerts, finance and AI tasks.", "每日线索、工单、预警、财务与 AI 任务指挥中心。"),
    icon: "fa-gauge-high",
    accent: "#2563EB",
    metrics: [
      { label: bi("New leads", "新线索"), value: "18", tone: "blue" },
      { label: bi("P0 alerts", "P0 预警"), value: "3", tone: "red" },
      { label: bi("Pending quotes", "待处理报价"), value: "7", tone: "amber" },
      { label: bi("Paid today", "今日收款"), value: "$8.4k", tone: "green" }
    ],
    functions: [
      bi("Today tasks and overdue SLA", "今日任务与超时 SLA"),
      bi("Unified intake feed", "统一获客入口动态"),
      bi("Notification bell and module badges", "通知铃与模块角标"),
      bi("P0 WhatsApp admin push queue", "P0 WhatsApp 管理员推送队列"),
      bi("Operations and finance reports", "运营与财务报表")
    ],
    controls: [
      bi("RLS-filtered widgets", "RLS 过滤组件"),
      bi("Audit logged drill-downs", "带审计日志的下钻查看"),
      bi("Role-specific dashboards", "按角色显示的仪表盘")
    ]
  },
  {
    order: "2",
    title: bi("Service & Order Operations", "服务与订单运营"),
    subtitle: bi("Lead to warranty lifecycle with inspection, quote, job, invoice and receipt controls.", "从线索到保修的完整流程，包含勘查、报价、工单、发票与收据控制。"),
    icon: "fa-clipboard-check",
    accent: "#0EA5E9",
    metrics: [
      { label: bi("Inspections", "勘查"), value: "12", tone: "blue" },
      { label: bi("Active jobs", "进行中工单"), value: "22", tone: "green" },
      { label: bi("Overdue", "已超时"), value: "4", tone: "red" },
      { label: bi("Warranty claims", "保修申请"), value: "2", tone: "amber" }
    ],
    functions: [
      bi("Leads and service requests", "线索与服务请求"),
      bi("Inspection scheduling", "勘查排程"),
      bi("Quotation approval", "报价审批"),
      bi("Dispatch board and work execution", "派工板与现场施工"),
      bi("Invoice, payment, receipt and warranty", "发票、付款、收据与保修")
    ],
    controls: [
      bi("Status machine guards", "状态机保护"),
      bi("Engineer assignment RLS", "工程师派工 RLS"),
      bi("Finance approval logs", "财务审批日志")
    ]
  },
  {
    order: "3",
    title: bi("Website Management", "网站管理"),
    subtitle: bi("Admin-only website content, forms, SEO/AEO, drafts, preview and publish.", "仅限后台管理的网站内容、表单、SEO/AEO、草稿、预览与发布。"),
    icon: "fa-window-restore",
    accent: "#14B8A6",
    metrics: [
      { label: bi("Draft pages", "草稿页面"), value: "9", tone: "blue" },
      { label: bi("Live forms", "上线表单"), value: "5", tone: "green" },
      { label: bi("SEO tasks", "SEO 任务"), value: "14", tone: "amber" },
      { label: bi("Publish holds", "发布阻止"), value: "1", tone: "red" }
    ],
    functions: [
      bi("Navigation and menu control", "导航与菜单控制"),
      bi("Page content and guide library", "页面内容与指南库"),
      bi("SEO/AEO schema library", "SEO/AEO 结构化数据库"),
      bi("AI website content generator", "AI 网站内容生成器"),
      bi("Preview and publish approval", "预览与发布审批")
    ],
    controls: [
      bi("No public QR sections", "前台不显示 QR 区块"),
      bi("Version history", "版本历史"),
      bi("Publish audit logs", "发布审计日志")
    ]
  },
  {
    order: "4",
    title: bi("Social Media Management", "社交媒体管理"),
    subtitle: bi("GMB, WhatsApp, social inbox, webhooks, media and AI social review.", "GMB、WhatsApp、社媒收件箱、Webhook、媒体与 AI 社媒审核。"),
    icon: "fa-comments",
    accent: "#8B5CF6",
    metrics: [
      { label: bi("Inbox", "收件箱"), value: "31", tone: "blue" },
      { label: bi("Human required", "需要人工"), value: "6", tone: "red" },
      { label: bi("Scheduled posts", "已排程帖子"), value: "11", tone: "green" },
      { label: bi("GMB reviews", "GMB 评论"), value: "4", tone: "amber" }
    ],
    functions: [
      bi("Unified social inbox", "统一社媒收件箱"),
      bi("GMB messages, reviews and Q&A", "GMB 消息、评论与问答"),
      bi("WhatsApp AI reply and human handoff", "WhatsApp AI 回复与转人工"),
      bi("Live chat / webhook collector", "在线聊天 / Webhook 收集器"),
      bi("Multi-platform preview review", "多平台预览审核")
    ],
    controls: [
      bi("Official API/webhook policy", "官方 API / Webhook 政策"),
      bi("AI confidence threshold", "AI 置信度阈值"),
      bi("Negative review approval", "负面评论审批")
    ]
  },
  {
    order: "5",
    title: bi("Advertising & Promotion Center", "广告投放与推广中心"),
    subtitle: bi("Unified paid acquisition center for Google Ads, social promotion, ROI, budget, creatives, UTM, AI suggestions and approval.", "统一管理谷歌广告、社媒推广、ROI、预算、素材、UTM、AI 建议与审批。"),
    icon: "fa-bullhorn",
    accent: "#F97316",
    metrics: [
      { label: bi("Ad spend", "广告花费"), value: "$950", tone: "amber" },
      { label: bi("Paid leads", "广告线索"), value: "38", tone: "blue" },
      { label: bi("Bookings", "预约查验"), value: "14", tone: "green" },
      { label: bi("ROI alerts", "ROI 预警"), value: "2", tone: "red" }
    ],
    functions: [
      bi("Google Ads and social promotion management", "谷歌广告与社媒推广管理"),
      bi("Campaigns, creatives, copy and UTM links", "广告活动、素材、文案与 UTM 链接"),
      bi("Budget requests and finance review", "预算申请与财务审核"),
      bi("ROI, ROAS, CPL and attribution analytics", "ROI、ROAS、CPL 与归因分析"),
      bi("AI ad suggestions and editable drafts", "AI 广告建议与可编辑草稿")
    ],
    controls: [
      bi("Super Admin can take over any ad workflow", "总管理员可接管任何广告流程"),
      bi("No automatic publishing or budget increase", "不自动发布或自动加预算"),
      bi("All approvals and corrections are audit logged", "所有审批与修正写入审计日志")
    ]
  },
  {
    order: "6",
    title: bi("AI Intelligence Center", "AI 智能中心"),
    subtitle: bi("AI assistants, rules, content generation, conversation intelligence and cost logs.", "AI 助手、规则、内容生成、会话智能与成本日志。"),
    icon: "fa-wand-magic-sparkles",
    accent: "#F59E0B",
    metrics: [
      { label: bi("Drafts", "草稿"), value: "17", tone: "blue" },
      { label: bi("Blocked risk", "已阻止风险"), value: "5", tone: "red" },
      { label: bi("Approved", "已批准"), value: "23", tone: "green" },
      { label: bi("Cost today", "今日成本"), value: "$18", tone: "amber" }
    ],
    functions: [
      bi("AI website assistant", "AI 网站助手"),
      bi("AI social assistant", "AI 社媒助手"),
      bi("AI conversation intelligence", "AI 会话智能"),
      bi("Lead discovery and scoring", "线索发现与评分"),
      bi("Prompt, safety and usage logs", "提示词、安全与使用日志")
    ],
    controls: [
      bi("No auto-publish", "禁止自动发布"),
      bi("Prompt injection checks", "提示注入检查"),
      bi("Reviewer ownership", "审核人责任归属")
    ]
  },
  {
    order: "7",
    title: bi("Customer Center", "客户中心"),
    subtitle: bi("Customer 360, portal records, binding, repair tracking and warranty history.", "客户 360、客户中心记录、客户绑定、报修追踪与保修历史。"),
    icon: "fa-user-shield",
    accent: "#10B981",
    metrics: [
      { label: bi("Pending binding", "待绑定客户"), value: "8", tone: "amber" },
      { label: bi("Portal users", "客户中心用户"), value: "246", tone: "green" },
      { label: bi("VIP", "VIP"), value: "12", tone: "blue" },
      { label: bi("Risk tags", "风险标签"), value: "3", tone: "red" }
    ],
    functions: [
      bi("Customer profiles and addresses", "客户资料与地址"),
      bi("Customer 360 timeline", "客户 360 时间线"),
      bi("Pending customer binding", "待处理客户绑定"),
      bi("Portal repair tracking", "客户中心报修追踪"),
      bi("Quotes, invoices, receipts and warranties", "报价、发票、收据与保修")
    ],
    controls: [
      bi("Customer-owned RLS", "客户本人数据 RLS"),
      bi("No plaintext passwords", "不显示明文密码"),
      bi("Access/correction workflow", "访问 / 更正请求流程")
    ]
  },
  {
    order: "8",
    title: bi("Website & System Settings", "网站与系统设置"),
    subtitle: bi("Company, branding, integrations, permissions, backups, QR backend and audit logs.", "公司资料、品牌、集成、权限、备份、后台 QR 与审计日志。"),
    icon: "fa-sliders",
    accent: "#64748B",
    metrics: [
      { label: bi("Healthy modules", "健康模块"), value: "10/11", tone: "green" },
      { label: bi("Backups", "备份"), value: "8", tone: "blue" },
      { label: bi("Secrets due", "待处理密钥"), value: "2", tone: "amber" },
      { label: bi("Failed jobs", "失败任务"), value: "1", tone: "red" }
    ],
    functions: [
      bi("Company and login branding", "公司与登录品牌"),
      bi("API integrations and secrets", "API 集成与密钥"),
      bi("Search settings and permissions", "搜索设置与权限"),
      bi("QR generation/download backend only", "QR 生成 / 下载仅限后台"),
      bi("Backup, restore and audit logs", "备份、恢复与审计日志")
    ],
    controls: [
      bi("Server-only secrets", "服务端密钥"),
      bi("Signed download links", "签名下载链接"),
      bi("Restore logs", "恢复日志")
    ]
  }
];

export const workflowSteps: WorkflowStep[] = [
  {
    name: bi("Lead", "线索"),
    status: bi("new / qualified / converted / duplicate / lost", "新建 / 已确认 / 已转化 / 重复 / 已流失"),
    owner: bi("Support or Operations Admin", "客服或运营管理员"),
    guardrail: bi("Duplicate or lost requires reason; conversion links to service_request_id.", "重复或流失必须填写原因；转化时关联 service_request_id。")
  },
  {
    name: bi("Service Request", "服务请求"),
    status: bi("pending_review / scheduled / inspected / quoted / approved / cancelled", "待审核 / 已排程 / 已勘查 / 已报价 / 已批准 / 已取消"),
    owner: bi("Operations Admin", "运营管理员"),
    guardrail: bi("Public repair form may directly create Website Lead / Unified Intake / Service Request; formal job still needs admin review.", "公开报修表单可创建 Website Lead / Unified Intake / Service Request；正式工单仍需后台审核。")
  },
  {
    name: bi("Inspection", "现场勘查"),
    status: bi("scheduled / assigned / in_progress / completed / rescheduled", "已排程 / 已派工 / 进行中 / 已完成 / 已改期"),
    owner: bi("Engineer", "工程师"),
    guardrail: bi("Completion requires checklist and photos.", "完成必须提交清单与照片。")
  },
  {
    name: bi("Quotation", "报价"),
    status: bi("draft / sent / viewed / accepted / rejected / expired / revised", "草稿 / 已发送 / 已查看 / 已接受 / 已拒绝 / 已过期 / 已修订"),
    owner: bi("Finance", "财务"),
    guardrail: bi("Accepted quote locks pricing unless revised with approval.", "已接受报价会锁定价格，除非审批后修订。")
  },
  {
    name: bi("Job / Work Execution", "工单 / 现场施工"),
    status: bi("assigned / en_route / arrived / in_progress / completed / rework_required", "已派工 / 前往中 / 已到达 / 施工中 / 已完成 / 需要返工"),
    owner: bi("Operations Admin + Engineer", "运营管理员 + 工程师"),
    guardrail: bi("Engineer sees assigned jobs only; completion may require customer signature.", "工程师只可查看已分配工单；完成可能需要客户签名。")
  },
  {
    name: bi("Invoice", "发票"),
    status: bi("draft / issued / partially_paid / paid / overdue / void", "草稿 / 已开具 / 部分付款 / 已付款 / 已超期 / 已作废"),
    owner: bi("Finance", "财务"),
    guardrail: bi("Issued invoice number is unique; void requires permission and reason.", "已开具发票号唯一；作废需要权限与原因。")
  },
  {
    name: bi("Payment", "付款"),
    status: bi("pending / processing / succeeded / failed / refunded", "待处理 / 处理中 / 成功 / 失败 / 已退款"),
    owner: bi("Finance", "财务"),
    guardrail: bi("Online payment needs gateway webhook reconciliation.", "线上付款需要支付网关 Webhook 对账。")
  },
  {
    name: bi("Receipt", "收据"),
    status: bi("draft / issued / corrected / void", "草稿 / 已开具 / 已更正 / 已作废"),
    owner: bi("Finance", "财务"),
    guardrail: bi("Receipt is issued after payment allocation only.", "收据只能在付款分配后开具。")
  },
  {
    name: bi("Advertising Campaign", "广告活动"),
    status: bi("draft / submitted / finance_review / super_admin_review / approved / paused", "草稿 / 已提交 / 财务审核 / 总管理审核 / 已批准 / 已暂停"),
    owner: bi("Operations + Finance + Super Admin", "运营 + 财务 + 总管理员"),
    guardrail: bi("No automatic publishing or budget increase; Super Admin can take over any campaign workflow.", "不自动发布或自动加预算；总管理员可接管任何广告流程。")
  },
  {
    name: bi("Warranty / Claim", "保修 / 保修申请"),
    status: bi("active / expired / claim_opened / approved / rejected / resolved", "有效 / 已过期 / 已提交申请 / 已批准 / 已拒绝 / 已解决"),
    owner: bi("Operations Admin", "运营管理员"),
    guardrail: bi("Claim requires linked completed job and coverage check.", "保修申请需要关联已完成工单并检查保修范围。")
  }
];

export const intakeRecords: IntakeRecord[] = [
  {
    id: "SR-28041",
    source: bi("Website quick repair", "网站快速报修"),
    customer: "Mr Tan",
    issue: bi("Urgent ceiling leak above kitchen, photos uploaded", "厨房上方天花板紧急漏水，已上传照片"),
    priority: "P0",
    status: bi("Service Request created, binding pending", "已创建服务请求，等待客户绑定"),
    nextAction: bi("Call within 5 minutes and assign inspection", "5 分钟内致电并安排勘查")
  },
  {
    id: "SR-28042",
    source: bi("Registration + repair", "会员注册 + 报修"),
    customer: "Lina Wong",
    issue: bi("Bathroom seepage, wants portal tracking", "浴室渗水，希望通过客户中心追踪"),
    priority: "P1",
    status: bi("Customer account linked", "客户账户已绑定"),
    nextAction: bi("Schedule inspection and keep portal updated", "安排勘查并同步客户中心")
  },
  {
    id: "AD-5001",
    source: bi("Google Ads", "谷歌广告"),
    customer: "Paid Search Lead",
    issue: bi("High-intent HDB ceiling leak search converted to WhatsApp consult", "高意向 HDB 天花漏水搜索转为 WhatsApp 咨询"),
    priority: "P1",
    status: bi("Advertising attribution linked", "已绑定广告归因"),
    nextAction: bi("Track booking, quotation and ROI", "追踪预约、报价和 ROI")
  },
  {
    id: "GM-1292",
    source: bi("Google Business Profile", "Google 商家资料"),
    customer: "A. Rahman",
    issue: bi("3-star review mentions unresolved warranty concern", "3 星评论提到未解决的保修问题"),
    priority: "P0",
    status: bi("Human required", "需要人工处理"),
    nextAction: bi("Operations Admin review before reply", "运营管理员审核后回复")
  },
  {
    id: "WA-7721",
    source: bi("WhatsApp", "WhatsApp"),
    customer: "Grace Lee",
    issue: bi("Asked for exact quote before inspection", "勘查前询问准确报价"),
    priority: "P1",
    status: bi("AI handoff triggered", "已触发 AI 转人工"),
    nextAction: bi("Explain inspection-first quote policy", "说明先勘查后报价政策")
  }
];

export const successMessageRules: SuccessMessageRule[] = [
  {
    scenario: bi("Quick repair request submitted successfully", "快速报修提交成功"),
    english: "Thank you. Your repair request has been received. Our NANOFIX team will review it shortly and contact you as soon as possible.",
    chinese: "谢谢您，您的报修请求已提交成功。NANOFIX 团队会尽快查看，并尽快与您联系。",
    primarySubmitButton: bi("Submit Repair Request", "提交报修"),
    nextStepButtons: bi("None. No next-step buttons on this quick no-login success page.", "无。快速免登录成功页不显示下一步按钮。"),
    note: bi("Fastest no-login repair path for urgent customers.", "面向紧急客户的最快免登录报修路径。")
  },
  {
    scenario: bi("Customer registration completed successfully", "会员注册成功"),
    english: "Welcome to NANOFIX. Your account has been created successfully. You can now track repair requests, quotations, invoices, payments and warranty records from your customer portal.",
    chinese: "欢迎加入 NANOFIX，您的会员账户已创建成功。您现在可以在客户中心查看报修进度、报价、发票、付款和保修记录。",
    primarySubmitButton: bi("Create Account", "注册会员"),
    nextStepButtons: bi("View Customer Portal / Submit Another Request", "查看客户中心 / 再次提交报修"),
    note: bi("Portal-first path for customers who want tracking.", "面向希望全程追踪客户的客户中心路径。")
  },
  {
    scenario: bi("Customer registration + repair request submitted successfully", "会员注册并提交报修成功"),
    english: "Welcome to NANOFIX. Your account and repair request have been created successfully. Our team will review your request shortly, and you can track the progress from your customer portal.",
    chinese: "欢迎加入 NANOFIX，您的会员账户和报修请求已创建成功。我们的团队会尽快查看您的请求，您也可以在客户中心追踪处理进度。",
    primarySubmitButton: bi("Create Account & Submit Repair Request", "注册会员并提交报修"),
    nextStepButtons: bi("View Customer Portal / Submit Another Request", "查看客户中心 / 再次提交报修"),
    note: bi("Registration with linked repair request.", "注册会员并绑定报修请求。")
  }
];

export const slaRules: Array<[BilingualText, BilingualText, BilingualText, BilingualText]> = [
  [bi("P0 Critical", "P0 紧急"), bi("Urgent leak, bad review, angry complaint, payment issue, job emergency", "紧急漏水、差评、强烈投诉、付款问题、工单紧急情况"), bi("WhatsApp admin push + red dashboard alert", "WhatsApp 管理员推送 + 红色仪表盘预警"), bi("Acknowledge within 5 minutes", "5 分钟内确认")],
  [bi("P1 High", "P1 高优先级"), bi("High-intent booking, urgent inspection, warranty risk, same-day request", "高意向预约、紧急勘查、保修风险、当天请求"), bi("Notification bell + owner assignment", "通知铃 + 负责人分配"), bi("Acknowledge within 30 minutes", "30 分钟内确认")],
  [bi("P2 Normal", "P2 普通"), bi("General form/message, normal request, content draft, normal ad draft", "普通表单 / 消息、常规请求、内容草稿、普通广告草稿"), bi("Unified intake and module badge", "统一获客入口与模块角标"), bi("Respond within 1 business day", "1 个工作日内回复")],
  [bi("P3 Low", "P3 低优先级"), bi("Reports, archived logs, low-intent leads", "报表、归档日志、低意向线索"), bi("Logs and reports only", "仅日志与报表"), bi("Review in scheduled report", "在定期报表中查看")]
];

export const rbacRows: Array<[BilingualText, BilingualText, BilingualText, BilingualText]> = [
  [bi("Super Admin", "超级管理员"), bi("All modules", "全部模块"), bi("Full create/read/update/delete/export/approve/publish/backup/restore/takeover", "完整新增 / 查看 / 修改 / 删除 / 导出 / 审批 / 发布 / 备份 / 恢复 / 接管"), bi("Danger actions audited", "高风险操作需要审计")],
  [bi("Operations Admin", "运营管理员"), bi("Service, dispatch, customer operations, ad strategy draft", "服务、派工、客户运营、广告策略草稿"), bi("Assign jobs, bind customers, resolve P0/P1, submit ad strategy", "分配工单、绑定客户、处理 P0/P1、提交广告策略"), bi("No secrets or finance voids by default", "默认不能操作密钥或财务作废")],
  [bi("Finance", "财务"), bi("Quotes, invoices, payments, receipts, ad budget ROI", "报价、发票、付款、收据、广告预算 ROI"), bi("Approve quotes, issue invoices, reconcile payments, review ad budget", "审批报价、开具发票、核对付款、审核广告预算"), bi("No content publishing", "不能发布内容")],
  [bi("Content Admin", "内容管理员"), bi("Website, social, AI drafts, ad creatives", "网站、社媒、AI 草稿、广告素材"), bi("Review, schedule and publish approved content; create ad copy drafts", "审核、排程并发布已批准内容；创建广告文案草稿"), bi("No finance exports", "不能导出财务数据")],
  [bi("Support", "客服"), bi("Inbox and limited customer/ad source context", "收件箱和有限客户 / 广告来源上下文"), bi("Reply, handoff, convert to lead, view lead source", "回复、转人工、转为线索、查看线索来源"), bi("No invoices or settings", "不能操作发票或设置")],
  [bi("Engineer", "工程师"), bi("Assigned jobs", "已分配工单"), bi("Checklist, photos, status updates", "清单、照片、状态更新"), bi("No unassigned jobs or ad budget", "不能查看未分配工单或广告预算")],
  [bi("Customer", "客户"), bi("Own portal", "自己的客户中心"), bi("View own requests, quotes, invoices, receipts, warranties", "查看自己的请求、报价、发票、收据和保修"), bi("No internal notes", "不能查看内部备注")]
];

export const backupModules: BilingualText[] = [
  bi("Central DB", "中央数据库"),
  bi("Website Management", "网站管理"),
  bi("Social / GMB / WhatsApp", "社媒 / GMB / WhatsApp"),
  bi("Advertising & Promotion Center", "广告投放与推广中心"),
  bi("AI Logs", "AI 日志"),
  bi("Service & Orders", "服务与订单"),
  bi("Customer Center", "客户中心"),
  bi("Finance", "财务"),
  bi("Audit Logs", "审计日志")
];

export const editableContentBlocks = [
  {
    key: "dashboard_notice",
    label: bi("Dashboard notice", "仪表盘公告"),
    english: "P0 leakage and negative-review items require immediate human review before any external reply.",
    chinese: "P0 漏水与负面评论事项必须先由人工审核，之后才可对外回复。"
  },
  {
    key: "advertising_center_notice",
    label: bi("Advertising center notice", "广告中心公告"),
    english: "Advertising drafts, AI suggestions and budget changes require human approval. Super Admin may take over any campaign workflow at any time.",
    chinese: "广告草稿、AI 建议和预算调整必须经过人工审批。总管理员可随时接管任何广告活动流程。"
  },
  {
    key: "website_homepage_hero",
    label: bi("Website homepage hero", "网站首页首屏文案"),
    english: "Singapore waterproofing, leak detection and no-hacking repair with free inspection and clear quotation.",
    chinese: "新加坡防水、漏水检测与免敲砖维修，提供免费勘查与清晰报价。"
  },
  {
    key: "ai_reply_template",
    label: bi("AI reply template", "AI 回复模板"),
    english: "Thank you for contacting NANOFIX. We will review your photos, confirm urgency and arrange the next inspection step.",
    chinese: "感谢您联系 NANOFIX。我们会查看您的照片、确认紧急程度，并安排下一步勘查。"
  }
];
