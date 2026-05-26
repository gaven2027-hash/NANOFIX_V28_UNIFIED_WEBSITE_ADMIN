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
      bi("Invoice, payment, receipt and warranty", "发票、付款、收据与保修"),
      bi("Field Media Center for customer photos, engineer inspection media and warranty proof", "现场素材中心：客户照片、工程师查验素材与保修证明")
    ],
    controls: [
      bi("Status machine guards", "状态机保护"),
      bi("Engineer assignment RLS", "工程师派工 RLS"),
      bi("Finance approval logs", "财务审批日志"),
      bi("Local upload / URL import / media library selection for field attachments", "现场附件支持本地上传 / URL 导入 / 素材库选择")
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
      bi("Preview and publish approval", "预览与发布审批"),
      bi("Page SEO media and block visual media picker", "页面 SEO 素材与区块视觉素材选择器")
    ],
    controls: [
      bi("No public QR sections", "前台不显示 QR 区块"),
      bi("Version history", "版本历史"),
      bi("Publish audit logs", "发布审计日志"),
      bi("Website images/GIF/videos from local upload, URL import or media library", "官网图片/GIF/视频来自本地上传、URL 导入或素材库")
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
      bi("Multi-platform preview review", "多平台预览审核"),
      bi("Reply attachment picker and social AI draft media sources", "回复附件选择器与社媒 AI 草稿素材来源")
    ],
    controls: [
      bi("Official API/webhook policy", "官方 API / Webhook 政策"),
      bi("AI confidence threshold", "AI 置信度阈值"),
      bi("Negative review approval", "负面评论审批"),
      bi("Human approval before sending messages with media assets", "带素材消息发送前必须人工批准")
    ]
  },
  {
    order: "5",
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
      bi("Prompt, safety and usage logs", "提示词、安全与使用日志"),
      bi("AI Media Center for analysis, materials, quotation, invoice and report attachments", "AI 素材中心：分析、材料、报价、发票与报告附件")
    ],
    controls: [
      bi("No auto-publish", "禁止自动发布"),
      bi("Prompt injection checks", "提示注入检查"),
      bi("Reviewer ownership", "审核人责任归属"),
      bi("Approve for AI / Block AI / Sensitive restricted media controls", "允许 AI / 禁止 AI / 敏感限制素材控制")
    ]
  },
  {
    order: "6",
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
      bi("Quotes, invoices, receipts and warranties", "报价、发票、收据与保修"),
      bi("Customer-visible field media for portal repair tracking", "客户中心可见的现场素材与报修追踪附件")
    ],
    controls: [
      bi("Customer-owned RLS", "客户本人数据 RLS"),
      bi("No plaintext passwords", "不显示明文密码"),
      bi("Access/correction workflow", "访问 / 更正请求流程"),
      bi("Admin controls customer_visible vs internal media visibility", "后台控制 customer_visible 与内部素材可见范围")
    ]
  },
  {
    order: "7",
    title: bi("Website & System Settings", "网站与系统设置"),
    subtitle: bi("Company, branding, integrations, permissions, backups, QR backend and audit logs.", "公司资料、品牌、集成、权限、备份、后台 QR 与审计日志。"),
    icon: "fa-sliders",
    accent: "#64748B",
    metrics: [
      { label: bi("Healthy modules", "健康模块"), value: "9/10", tone: "green" },
      { label: bi("Backups", "备份"), value: "7", tone: "blue" },
      { label: bi("Secrets due", "待处理密钥"), value: "2", tone: "amber" },
      { label: bi("Failed jobs", "失败任务"), value: "1", tone: "red" }
    ],
    functions: [
      bi("Company and login branding", "公司与登录品牌"),
      bi("API integrations and secrets", "API 集成与密钥"),
      bi("Search settings and permissions", "搜索设置与权限"),
      bi("QR generation/download backend only", "QR 生成 / 下载仅限后台"),
      bi("Backup, restore and audit logs", "备份、恢复与审计日志"),
      bi("Unified Media Library settings and module backup coverage", "统一素材库设置与模块备份覆盖")
    ],
    controls: [
      bi("Server-only secrets", "服务端密钥"),
      bi("Signed download links", "签名下载链接"),
      bi("Restore logs", "恢复日志"),
      bi("Media library, field media, AI media and publish media package audit coverage", "素材库、现场素材、AI 素材和发布素材包审计覆盖")
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
    status: bi("draft / sent / paid / void / overdue", "草稿 / 已发送 / 已付款 / 作废 / 已逾期"),
    owner: bi("Finance", "财务"),
    guardrail: bi("Invoice edits after sent are audit logged.", "发票发送后的修改必须记录审计日志。")
  },
  {
    name: bi("Warranty", "保修"),
    status: bi("active / expired / claim_open / claim_closed", "有效 / 已过期 / 保修申请中 / 已关闭"),
    owner: bi("Operations Admin", "运营管理员"),
    guardrail: bi("Warranty QR points to customer login / member center, not a public lookup page.", "保修 QR 指向客户登录 / 会员中心，不做公开查询页。")
  }
];

export const intakeRecords: IntakeRecord[] = [
  {
    id: "REQ-1024",
    source: bi("Website quick request", "网站快速报修"),
    customer: "Tan HDB / Tampines",
    issue: bi("Bathroom ceiling leak", "卫生间天花漏水"),
    priority: "P0",
    status: bi("New, binding pending", "新建，待绑定"),
    nextAction: bi("Call within 5 minutes", "5 分钟内联系")
  },
  {
    id: "REQ-1025",
    source: bi("WhatsApp photo consult", "WhatsApp 照片咨询"),
    customer: "Condo MCST",
    issue: bi("External wall seepage", "外墙渗水"),
    priority: "P1",
    status: bi("AI triaged, human review", "AI 初筛，待人工复核"),
    nextAction: bi("Schedule inspection", "安排勘查")
  },
  {
    id: "REQ-1026",
    source: bi("Member portal", "会员中心"),
    customer: "Retail unit",
    issue: bi("Planter box waterproofing", "花槽防水"),
    priority: "P2",
    status: bi("Linked customer", "已绑定客户"),
    nextAction: bi("Prepare quote", "准备报价")
  }
];

export const slaRules: Array<[BilingualText, BilingualText, BilingualText, BilingualText]> = [
  [bi("P0 Critical", "P0 紧急"), bi("Active leak / angry review / payment risk", "正在漏水 / 愤怒差评 / 付款风险"), bi("WhatsApp admin + dashboard alert", "WhatsApp 管理员 + 仪表盘预警"), bi("5 minutes", "5 分钟")],
  [bi("P1 High", "P1 高"), bi("Likely conversion or urgent inspection", "高转化或紧急勘查"), bi("Assign owner + due badge", "分配负责人 + 到期角标"), bi("30 minutes", "30 分钟")],
  [bi("P2 Normal", "P2 普通"), bi("Standard request", "普通请求"), bi("Queue in inbox", "进入收件箱队列"), bi("4 hours", "4 小时")],
  [bi("P3 Low", "P3 低"), bi("Low intent or archive", "低意向或归档"), bi("No external push", "不外部推送"), bi("Next working day", "下一个工作日")]
];

export const editableContentBlocks = [
  {
    key: "home-hero",
    label: bi("Home hero conversion block", "首页大图转化区"),
    english: "No-hacking leak detection and waterproofing repair in Singapore. Upload photos and get a fast inspection plan.",
    chinese: "新加坡免敲砖漏水检测与防水维修。上传照片，快速获得勘查方案。"
  },
  {
    key: "submit-success",
    label: bi("Submit request success message", "提交报修成功提示"),
    english: "Your repair request has been received. Our team will review the photos and contact you shortly.",
    chinese: "您的报修请求已收到。我们的团队会查看照片并尽快联系您。"
  },
  {
    key: "ai-reply-template",
    label: bi("AI reply draft template", "AI 回复草稿模板"),
    english: "Thanks for sending the photos. Based on the visible stains, we recommend a site inspection before quoting.",
    chinese: "感谢您发送照片。根据可见水迹，我们建议先安排现场勘查后再报价。"
  }
];

export const successMessageRules: SuccessMessageRule[] = [
  {
    scenario: bi("Public quick repair form", "公开快速报修表单"),
    english: "Your repair request has been submitted successfully. NANOFIX will contact you via WhatsApp or phone after reviewing your photos.",
    chinese: "您的报修请求已成功提交。NANOFIX 会在查看照片后通过 WhatsApp 或电话联系您。",
    primarySubmitButton: bi("Submit Repair Request", "提交报修请求"),
    nextStepButtons: bi("Track My Repair / Contact WhatsApp", "追踪报修 / 联系 WhatsApp"),
    note: bi("Does not require login or OTP before submit.", "提交前不强制登录或 OTP。")
  },
  {
    scenario: bi("Member registration with optional repair", "会员注册并可选提交报修"),
    english: "Your member account is created. If you submitted repair details, a service request has been linked to your account.",
    chinese: "您的会员账号已创建。如您同时提交了报修信息，系统已把服务请求绑定到您的账号。",
    primarySubmitButton: bi("Create Account", "创建账号"),
    nextStepButtons: bi("Open Customer Portal / Submit Repair", "打开客户中心 / 提交报修"),
    note: bi("Registration alone does not create a job.", "仅注册不会自动生成工单。")
  },
  {
    scenario: bi("AI social draft approval", "AI 社媒草稿审批"),
    english: "The AI draft is saved for review. It will not be published until an admin approves and schedules it.",
    chinese: "AI 草稿已保存待审核。管理员批准并排程前不会发布。",
    primarySubmitButton: bi("Save AI Draft", "保存 AI 草稿"),
    nextStepButtons: bi("Preview Platforms / Send for Approval", "预览平台 / 提交审批"),
    note: bi("AI auto-publish is disabled by default.", "AI 默认不能自动发布。")
  }
];

export const rbacRows: Array<[BilingualText, BilingualText, BilingualText, BilingualText]> = [
  [bi("Super Admin", "超级管理员"), bi("Full backend", "全后台"), bi("Manage users, settings, backups, publish, restore", "管理用户、设置、备份、发布、恢复"), bi("Cannot view plaintext passwords", "不能查看明文密码")],
  [bi("Operations Admin", "运营管理员"), bi("Service operations", "业务运营"), bi("Leads, requests, inspections, jobs, warranties", "线索、服务请求、勘查、工单、保修"), bi("Finance actions limited", "财务操作受限")],
  [bi("Finance", "财务"), bi("Quotes and payments", "报价与付款"), bi("Quotes, invoices, receipts, reconciliation", "报价、发票、收据、对账"), bi("No system settings", "不能操作系统设置")],
  [bi("Engineer", "工程师"), bi("Assigned field work", "已分配现场工作"), bi("View assigned jobs and submit reports", "查看已分配工单并提交报告"), bi("No customer-wide search", "不能全客户搜索")],
  [bi("Customer", "客户"), bi("Own portal", "自己的客户中心"), bi("Own repair records, quotes, invoices, payments, warranties", "自己的报修、报价、发票、付款、保修"), bi("No admin backend access", "不能进入管理后台")]
];

export const backupModules: BilingualText[] = [
  bi("Website Management", "网站管理"),
  bi("Service & Order Operations", "服务与订单运营"),
  bi("Social Media Management", "社媒管理"),
  bi("AI Intelligence Center", "AI 智能中心"),
  bi("Customer Center", "客户中心"),
  bi("Unified Media Library", "统一素材库"),
  bi("Field Media Center", "现场素材中心"),
  bi("AI Media Center", "AI 素材中心"),
  bi("Publish Media Package", "发布素材包"),
  bi("Central Database & RLS", "中央数据库与 RLS"),
  bi("Audit Logs", "审计日志")
];
