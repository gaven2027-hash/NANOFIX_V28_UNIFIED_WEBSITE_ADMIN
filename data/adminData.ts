export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

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

export const menu: MenuItem[] = [
  {
    "order": "Top",
    "href": "/dashboard#global-search",
    "title": "Top Fixed Global Search",
    "zh": "顶部固定全局搜索",
    "badge": "All",
    "children": [
      {
        "href": "/dashboard#global-search-1",
        "title": "Global Search Input",
        "zh": "全局搜索输入框"
      },
      {
        "href": "/dashboard#global-search-2",
        "title": "Collapsible Category Filters",
        "zh": "可折叠分类筛选"
      },
      {
        "href": "/dashboard#global-search-3",
        "title": "RLS-Filtered Result Groups",
        "zh": "RLS 权限过滤结果组"
      },
      {
        "href": "/dashboard#global-search-4",
        "title": "Permission-Controlled Deep Links",
        "zh": "按权限控制深度链接"
      },
      {
        "href": "/dashboard#global-search-5",
        "title": "Search / Click / Export Audit Logs",
        "zh": "搜索/点击/导出审计日志"
      }
    ]
  },
  {
    "order": "1",
    "href": "/dashboard",
    "title": "Dashboard, Analytics & Alerts",
    "zh": "数据分析、预警、待处理事项",
    "badge": 18,
    "children": [
      {
        "href": "/dashboard#dashboard-1",
        "title": "Main Dashboard",
        "zh": "主仪表盘"
      },
      {
        "href": "/dashboard#dashboard-2",
        "title": "Today’s Tasks",
        "zh": "今日待处理事项"
      },
      {
        "href": "/dashboard#dashboard-3",
        "title": "AI Alerts",
        "zh": "AI 预警"
      },
      {
        "href": "/dashboard#dashboard-4",
        "title": "Unified Intake",
        "zh": "统一入口"
      },
      {
        "href": "/dashboard#dashboard-5",
        "title": "Module Badges",
        "zh": "模块角标"
      },
      {
        "href": "/dashboard#dashboard-6",
        "title": "Notification Bell",
        "zh": "通知铃铛"
      },
      {
        "href": "/dashboard#dashboard-7",
        "title": "New Leads",
        "zh": "新线索"
      },
      {
        "href": "/dashboard#dashboard-8",
        "title": "Pending Customer Binding",
        "zh": "待绑定客户"
      },
      {
        "href": "/dashboard#dashboard-9",
        "title": "Pending Inspection",
        "zh": "待查验"
      },
      {
        "href": "/dashboard#dashboard-10",
        "title": "Pending Quotes",
        "zh": "待报价"
      },
      {
        "href": "/dashboard#dashboard-11",
        "title": "Unpaid / Overdue Invoices",
        "zh": "未付款/逾期发票"
      },
      {
        "href": "/dashboard#dashboard-12",
        "title": "Reports",
        "zh": "报表"
      },
      {
        "href": "/dashboard#dashboard-13",
        "title": "Web / Social / GMB / WhatsApp / Live Chat Alerts",
        "zh": "网站/社媒/GMB/WhatsApp/在线聊天提醒"
      },
      {
        "href": "/dashboard#dashboard-14",
        "title": "Module Health & Degraded Mode",
        "zh": "模块健康与降级模式"
      }
    ]
  },
  {
    "order": "2",
    "href": "/service-operations",
    "title": "Service & Order Operations",
    "zh": "业务订单处理",
    "badge": 42,
    "children": [
      {
        "href": "/service-operations#operations-1",
        "title": "Leads",
        "zh": "线索"
      },
      {
        "href": "/service-operations#operations-2",
        "title": "Service Requests",
        "zh": "服务请求/报修单"
      },
      {
        "href": "/service-operations#operations-3",
        "title": "Bookings",
        "zh": "预约"
      },
      {
        "href": "/service-operations#operations-4",
        "title": "Inspections",
        "zh": "查验"
      },
      {
        "href": "/service-operations#operations-5",
        "title": "Inspection Checklist",
        "zh": "查验清单"
      },
      {
        "href": "/service-operations#operations-6",
        "title": "Before / After Photos",
        "zh": "施工前后照片"
      },
      {
        "href": "/service-operations#operations-7",
        "title": "Quotations",
        "zh": "报价"
      },
      {
        "href": "/service-operations#operations-8",
        "title": "Quotation Versions",
        "zh": "报价版本"
      },
      {
        "href": "/service-operations#operations-9",
        "title": "Approvals",
        "zh": "审批"
      },
      {
        "href": "/service-operations#operations-10",
        "title": "Jobs / Work Execution",
        "zh": "工单/施工执行"
      },
      {
        "href": "/service-operations#operations-11",
        "title": "Engineer Assignment",
        "zh": "工程师分配"
      },
      {
        "href": "/service-operations#operations-12",
        "title": "Engineer Calendar",
        "zh": "工程师日历"
      },
      {
        "href": "/service-operations#operations-13",
        "title": "Dispatch Board",
        "zh": "派工看板"
      },
      {
        "href": "/service-operations#operations-14",
        "title": "ETA / Arrival / On-Site Status",
        "zh": "预计到达/到场/现场状态"
      },
      {
        "href": "/service-operations#operations-15",
        "title": "Customer Signature",
        "zh": "客户签名"
      },
      {
        "href": "/service-operations#operations-16",
        "title": "Job Completion",
        "zh": "完工"
      },
      {
        "href": "/service-operations#operations-17",
        "title": "Rework Handling",
        "zh": "返工处理"
      },
      {
        "href": "/service-operations#operations-18",
        "title": "Invoices",
        "zh": "发票"
      },
      {
        "href": "/service-operations#operations-19",
        "title": "Payments",
        "zh": "付款"
      },
      {
        "href": "/service-operations#operations-20",
        "title": "Payment Webhook Reconciliation",
        "zh": "付款回调核对"
      },
      {
        "href": "/service-operations#operations-21",
        "title": "Receipts",
        "zh": "收据"
      },
      {
        "href": "/service-operations#operations-22",
        "title": "Refund / Void Rules",
        "zh": "退款/作废规则"
      },
      {
        "href": "/service-operations#operations-23",
        "title": "Warranties",
        "zh": "保修"
      },
      {
        "href": "/service-operations#operations-24",
        "title": "Warranty Claims",
        "zh": "保修索赔"
      }
    ]
  },
  {
    "order": "3",
    "href": "/website-management",
    "title": "Website Management",
    "zh": "网站后台管理",
    "badge": 7,
    "children": [
      {
        "href": "/website-management#website-1",
        "title": "Navigation & Menu",
        "zh": "导航与菜单"
      },
      {
        "href": "/website-management#website-2",
        "title": "Page Content",
        "zh": "页面内容"
      },
      {
        "href": "/website-management#website-3",
        "title": "Home Content",
        "zh": "首页内容"
      },
      {
        "href": "/website-management#website-4",
        "title": "Service / Landing Pages",
        "zh": "服务/落地页"
      },
      {
        "href": "/website-management#website-5",
        "title": "Guide Library",
        "zh": "Guide 内容库"
      },
      {
        "href": "/website-management#website-6",
        "title": "SEO / AEO Library",
        "zh": "SEO/AEO 内容库"
      },
      {
        "href": "/website-management#website-7",
        "title": "AI Website Content Generator",
        "zh": "AI 网站内容生成"
      },
      {
        "href": "/website-management#website-8",
        "title": "AI Draft Review",
        "zh": "AI 草稿审核"
      },
      {
        "href": "/website-management#website-9",
        "title": "Preview",
        "zh": "预览"
      },
      {
        "href": "/website-management#website-10",
        "title": "Publish",
        "zh": "发布"
      },
      {
        "href": "/website-management#website-11",
        "title": "Forms",
        "zh": "表单"
      },
      {
        "href": "/website-management#website-12",
        "title": "Website Leads",
        "zh": "网站线索"
      },
      {
        "href": "/website-management#website-13",
        "title": "Media Library",
        "zh": "媒体库"
      },
      {
        "href": "/website-management#website-14",
        "title": "Schema / FAQ / Internal Links",
        "zh": "结构化数据/FAQ/内链"
      },
      {
        "href": "/website-management#website-15",
        "title": "QR Display Disabled on Public Website",
        "zh": "公共网站禁止显示二维码"
      }
    ]
  },
  {
    "order": "4",
    "href": "/social-media",
    "title": "Social Media Management",
    "zh": "社媒管理",
    "badge": 13,
    "children": [
      {
        "href": "/social-media#social-1",
        "title": "Social Accounts",
        "zh": "社媒账号"
      },
      {
        "href": "/social-media#social-2",
        "title": "Google Business Profile",
        "zh": "Google 商家资料"
      },
      {
        "href": "/social-media#social-3",
        "title": "GMB Messages",
        "zh": "GMB 消息"
      },
      {
        "href": "/social-media#social-4",
        "title": "GMB Reviews",
        "zh": "GMB 评论"
      },
      {
        "href": "/social-media#social-5",
        "title": "GMB Q&A",
        "zh": "GMB 问答"
      },
      {
        "href": "/social-media#social-6",
        "title": "Unified Social Inbox",
        "zh": "统一社媒收件箱"
      },
      {
        "href": "/social-media#social-7",
        "title": "WhatsApp AI Reply",
        "zh": "WhatsApp AI 回复"
      },
      {
        "href": "/social-media#social-8",
        "title": "Transfer to Human",
        "zh": "转人工"
      },
      {
        "href": "/social-media#social-9",
        "title": "Live Chat / Webhook Collector",
        "zh": "在线聊天/Webhook 收集"
      },
      {
        "href": "/social-media#social-10",
        "title": "Temporary Lead Creation",
        "zh": "临时线索创建"
      },
      {
        "href": "/social-media#social-11",
        "title": "One-Click Convert to Lead",
        "zh": "一键转为线索"
      },
      {
        "href": "/social-media#social-12",
        "title": "Media Library",
        "zh": "媒体库"
      },
      {
        "href": "/social-media#social-13",
        "title": "AI Social Content Studio",
        "zh": "AI 社媒内容工作室"
      },
      {
        "href": "/social-media#social-14",
        "title": "Multi-Platform Preview Review",
        "zh": "多平台并排模拟预览审核"
      },
      {
        "href": "/social-media#social-15",
        "title": "Facebook Preview",
        "zh": "Facebook 预览"
      },
      {
        "href": "/social-media#social-16",
        "title": "Instagram Preview",
        "zh": "Instagram 预览"
      },
      {
        "href": "/social-media#social-17",
        "title": "TikTok Preview",
        "zh": "TikTok 预览"
      },
      {
        "href": "/social-media#social-18",
        "title": "YouTube Shorts Preview",
        "zh": "YouTube Shorts 预览"
      },
      {
        "href": "/social-media#social-19",
        "title": "Xiaohongshu Preview",
        "zh": "小红书预览"
      },
      {
        "href": "/social-media#social-20",
        "title": "Google Business Profile Post Preview",
        "zh": "Google 商家帖子预览"
      },
      {
        "href": "/social-media#social-21",
        "title": "Schedule / Publish Approval",
        "zh": "排期/发布审批"
      },
      {
        "href": "/social-media#social-22",
        "title": "Social Logs",
        "zh": "社媒日志"
      }
    ]
  },
  {
    "order": "5",
    "href": "/ai-intelligence",
    "title": "AI Intelligence Center",
    "zh": "AI 智能中心",
    "badge": 9,
    "children": [
      {
        "href": "/ai-intelligence#ai-1",
        "title": "Global Web Search",
        "zh": "全网搜索中心"
      },
      {
        "href": "/ai-intelligence#ai-2",
        "title": "AI Website Assistant",
        "zh": "AI 网站助手"
      },
      {
        "href": "/ai-intelligence#ai-3",
        "title": "AI Social Assistant",
        "zh": "AI 社媒助手"
      },
      {
        "href": "/ai-intelligence#ai-4",
        "title": "AI Conversation Intelligence",
        "zh": "AI 对话智能"
      },
      {
        "href": "/ai-intelligence#ai-5",
        "title": "Lead Discovery",
        "zh": "获客线索发现"
      },
      {
        "href": "/ai-intelligence#ai-6",
        "title": "AI Rules",
        "zh": "AI 规则"
      },
      {
        "href": "/ai-intelligence#ai-7",
        "title": "AI Safety Rules",
        "zh": "AI 安全规则"
      },
      {
        "href": "/ai-intelligence#ai-8",
        "title": "Approved FAQ Knowledge Base",
        "zh": "已审核 FAQ 知识库"
      },
      {
        "href": "/ai-intelligence#ai-9",
        "title": "Human Handoff Queue",
        "zh": "转人工队列"
      },
      {
        "href": "/ai-intelligence#ai-10",
        "title": "AI Logs",
        "zh": "AI 日志"
      },
      {
        "href": "/ai-intelligence#ai-11",
        "title": "Usage & Cost",
        "zh": "用量与成本"
      },
      {
        "href": "/ai-intelligence#ai-12",
        "title": "AI Alerts",
        "zh": "AI 预警"
      },
      {
        "href": "/ai-intelligence#ai-13",
        "title": "Material AI Suggestions",
        "zh": "材料 AI 建议"
      },
      {
        "href": "/ai-intelligence#ai-14",
        "title": "Quotation AI Assist",
        "zh": "报价 AI 辅助"
      },
      {
        "href": "/ai-intelligence#ai-15",
        "title": "Invoice AI Assist",
        "zh": "发票 AI 辅助"
      },
      {
        "href": "/ai-intelligence#ai-16",
        "title": "AI Default Save as Draft",
        "zh": "AI 默认保存草稿"
      },
      {
        "href": "/ai-intelligence#ai-17",
        "title": "No Auto Publish / No Auto Approve",
        "zh": "禁止自动发布/自动审批"
      }
    ]
  },
  {
    "order": "6",
    "href": "/customer-center",
    "title": "Customer Center",
    "zh": "客户相关",
    "badge": 21,
    "children": [
      {
        "href": "/customer-center#customer-1",
        "title": "Customers",
        "zh": "客户"
      },
      {
        "href": "/customer-center#customer-2",
        "title": "Customer Profiles",
        "zh": "客户档案"
      },
      {
        "href": "/customer-center#customer-3",
        "title": "Customer 360",
        "zh": "客户全景"
      },
      {
        "href": "/customer-center#customer-4",
        "title": "Customer Portal Management",
        "zh": "客户门户管理"
      },
      {
        "href": "/customer-center#customer-5",
        "title": "Repair Tracking",
        "zh": "维修进度追踪"
      },
      {
        "href": "/customer-center#customer-6",
        "title": "Linked Leads",
        "zh": "关联线索"
      },
      {
        "href": "/customer-center#customer-7",
        "title": "Linked Service Requests",
        "zh": "关联服务请求"
      },
      {
        "href": "/customer-center#customer-8",
        "title": "Linked Jobs",
        "zh": "关联工单"
      },
      {
        "href": "/customer-center#customer-9",
        "title": "Linked Quotes",
        "zh": "关联报价"
      },
      {
        "href": "/customer-center#customer-10",
        "title": "Linked Invoices",
        "zh": "关联发票"
      },
      {
        "href": "/customer-center#customer-11",
        "title": "Linked Payments / Receipts",
        "zh": "关联付款/收据"
      },
      {
        "href": "/customer-center#customer-12",
        "title": "Linked Warranties",
        "zh": "关联保修"
      },
      {
        "href": "/customer-center#customer-13",
        "title": "Customer Binding",
        "zh": "客户绑定"
      },
      {
        "href": "/customer-center#customer-14",
        "title": "Pending Binding Review",
        "zh": "待绑定审核"
      },
      {
        "href": "/customer-center#customer-15",
        "title": "Customer Registration / Login",
        "zh": "客户注册/登录"
      },
      {
        "href": "/customer-center#customer-16",
        "title": "Email / Mobile / WhatsApp OTP",
        "zh": "邮箱/手机/WhatsApp OTP"
      },
      {
        "href": "/customer-center#customer-17",
        "title": "Force Password Reset",
        "zh": "强制重置密码"
      },
      {
        "href": "/customer-center#customer-18",
        "title": "Disable / Freeze / Blacklist",
        "zh": "禁用/冻结/拉黑"
      },
      {
        "href": "/customer-center#customer-19",
        "title": "Delete / Soft Delete / Archive",
        "zh": "删除/软删除/归档"
      },
      {
        "href": "/customer-center#customer-20",
        "title": "PDPA Access / Correction Requests",
        "zh": "PDPA 访问/更正请求"
      }
    ]
  },
  {
    "order": "7",
    "href": "/system-settings",
    "title": "Website & System Settings",
    "zh": "网站与系统设置",
    "badge": 3,
    "children": [
      {
        "href": "/system-settings#settings-1",
        "title": "Company Settings",
        "zh": "公司设置"
      },
      {
        "href": "/system-settings#settings-2",
        "title": "Logo & Brand Assets",
        "zh": "LOGO 与品牌素材"
      },
      {
        "href": "/system-settings#settings-3",
        "title": "Admin Login Branding",
        "zh": "后台登录品牌显示"
      },
      {
        "href": "/system-settings#settings-4",
        "title": "API Integrations",
        "zh": "API 集成"
      },
      {
        "href": "/system-settings#settings-5",
        "title": "Supabase Settings",
        "zh": "Supabase 设置"
      },
      {
        "href": "/system-settings#settings-6",
        "title": "GitHub / Vercel Deployment Settings",
        "zh": "GitHub/Vercel 部署设置"
      },
      {
        "href": "/system-settings#settings-7",
        "title": "Search Settings",
        "zh": "搜索设置"
      },
      {
        "href": "/system-settings#settings-8",
        "title": "QR Backend Management",
        "zh": "后台二维码管理"
      },
      {
        "href": "/system-settings#settings-9",
        "title": "QR Generate / Download",
        "zh": "二维码生成/下载"
      },
      {
        "href": "/system-settings#settings-10",
        "title": "Backup & Download Center",
        "zh": "模块备份与下载中心"
      },
      {
        "href": "/system-settings#settings-11",
        "title": "Central Database Backup",
        "zh": "中心数据库备份"
      },
      {
        "href": "/system-settings#settings-12",
        "title": "Module Backup Schedules",
        "zh": "模块备份计划"
      },
      {
        "href": "/system-settings#settings-13",
        "title": "Restore Logs",
        "zh": "恢复日志"
      },
      {
        "href": "/system-settings#settings-14",
        "title": "Permissions / RBAC",
        "zh": "权限/RBAC"
      },
      {
        "href": "/system-settings#settings-15",
        "title": "Roles",
        "zh": "角色"
      },
      {
        "href": "/system-settings#settings-16",
        "title": "Audit Logs",
        "zh": "审计日志"
      },
      {
        "href": "/system-settings#settings-17",
        "title": "PDPA / Privacy Settings",
        "zh": "PDPA/隐私设置"
      },
      {
        "href": "/system-settings#settings-18",
        "title": "Retention Rules",
        "zh": "数据保留规则"
      },
      {
        "href": "/system-settings#settings-19",
        "title": "Breach Assessment Workflow",
        "zh": "数据泄露评估流程"
      },
      {
        "href": "/system-settings#settings-20",
        "title": "Health Checks",
        "zh": "健康检查"
      },
      {
        "href": "/system-settings#settings-21",
        "title": "Environment Variables Reminder",
        "zh": "环境变量提醒"
      }
    ]
  },
  {
    "order": "P1",
    "href": "/customer-portal",
    "title": "Customer Portal",
    "zh": "客户会员中心入口",
    "badge": "Portal",
    "children": [
      {
        "href": "/customer-portal#customer-portal-1",
        "title": "My Repair Requests",
        "zh": "我的报修"
      },
      {
        "href": "/customer-portal#customer-portal-2",
        "title": "My Quotes",
        "zh": "我的报价"
      },
      {
        "href": "/customer-portal#customer-portal-3",
        "title": "My Invoices",
        "zh": "我的发票"
      },
      {
        "href": "/customer-portal#customer-portal-4",
        "title": "My Payments / Receipts",
        "zh": "我的付款/收据"
      },
      {
        "href": "/customer-portal#customer-portal-5",
        "title": "My Warranties",
        "zh": "我的保修"
      },
      {
        "href": "/customer-portal#customer-portal-6",
        "title": "Submit New Repair Request",
        "zh": "提交新报修"
      },
      {
        "href": "/customer-portal#customer-portal-7",
        "title": "Registration With Optional Repair Request",
        "zh": "注册时可选同时提交报修"
      }
    ]
  },
  {
    "order": "P2",
    "href": "/engineer-portal",
    "title": "Engineer Portal",
    "zh": "工程师端入口",
    "badge": "Portal",
    "children": [
      {
        "href": "/engineer-portal#engineer-portal-1",
        "title": "Assigned Jobs",
        "zh": "已分配工单"
      },
      {
        "href": "/engineer-portal#engineer-portal-2",
        "title": "Today Schedule",
        "zh": "今日排程"
      },
      {
        "href": "/engineer-portal#engineer-portal-3",
        "title": "ETA / En Route / Arrived",
        "zh": "预计到达/出发/到场"
      },
      {
        "href": "/engineer-portal#engineer-portal-4",
        "title": "Inspection Checklist",
        "zh": "查验清单"
      },
      {
        "href": "/engineer-portal#engineer-portal-5",
        "title": "Upload Photos",
        "zh": "上传照片"
      },
      {
        "href": "/engineer-portal#engineer-portal-6",
        "title": "Customer Signature",
        "zh": "客户签名"
      },
      {
        "href": "/engineer-portal#engineer-portal-7",
        "title": "Completion / Rework Status",
        "zh": "完工/返工状态"
      }
    ]
  }
];

export const dashboardKpis = [
  { label: 'New Leads', zh: '新线索', value: '28', trend: '+16%', tone: 'blue' },
  { label: 'Pending Inspection', zh: '待查验', value: '11', trend: '4 urgent', tone: 'amber' },
  { label: 'Pending Quotes', zh: '待报价', value: '8', trend: '2 expiring', tone: 'cyan' },
  { label: 'Unpaid Invoices', zh: '未付款发票', value: '$18.6k', trend: '5 overdue', tone: 'red' },
  { label: 'AI Human Handoff', zh: 'AI 转人工', value: '6', trend: 'P0/P1', tone: 'red' },
  { label: 'Module Health', zh: '模块健康', value: '97%', trend: '1 degraded', tone: 'green' }
];

export const serviceFlow = [
  'Lead',
  'Service Request',
  'Inspection',
  'Quotation',
  'Approval',
  'Job / Work Execution',
  'Invoice',
  'Payment',
  'Receipt',
  'Warranty / Warranty Claim'
];

export const intakeItems = [
  { source: 'Website Form', customer: 'Mr Tan', issue: 'Toilet ceiling leak', priority: 'P0', status: 'pending_review', owner: 'Ops Admin', sla: '3 min left' },
  { source: 'Google Business Profile', customer: 'Ms Lim', issue: '1-star review: recurring leak', priority: 'P0', status: 'human_required', owner: 'Support', sla: 'overdue' },
  { source: 'WhatsApp', customer: 'Condo MCST', issue: 'Facade seepage photos uploaded', priority: 'P1', status: 'qualified', owner: 'Ops Admin', sla: '22 min left' },
  { source: 'Instagram', customer: 'Retail tenant', issue: 'Waterproofing quote requested', priority: 'P2', status: 'new', owner: 'Support', sla: '1 business day' }
] as const;

export const moduleHealth = [
  { module: 'Website Intake API', status: 'Healthy', lastSync: '2 min ago', degraded: false },
  { module: 'WhatsApp Webhook', status: 'Healthy', lastSync: '1 min ago', degraded: false },
  { module: 'GMB Reviews Sync', status: 'Degraded', lastSync: '38 min ago', degraded: true },
  { module: 'AI Draft Queue', status: 'Healthy', lastSync: '4 min ago', degraded: false },
  { module: 'Backup Center', status: 'Healthy', lastSync: 'Today 02:00', degraded: false },
  { module: 'Payment Webhooks', status: 'Healthy', lastSync: '6 min ago', degraded: false }
];

export const priorities: Record<Priority, { label: string; rule: string; action: string; sla: string }> = {
  P0: { label: 'Critical', rule: 'Urgent leak, 1–3 star review, angry complaint, payment issue, job emergency or system critical error.', action: 'WhatsApp admin push + red dashboard alert + notification bell + task.', sla: 'Acknowledge within 5 minutes.' },
  P1: { label: 'High', rule: 'High-intent booking, urgent inspection, warranty risk or same-day request.', action: 'Dashboard alert + notification bell + owner assignment.', sla: 'Acknowledge within 30 minutes.' },
  P2: { label: 'Normal', rule: 'General message, standard form submission or draft review.', action: 'Module badge + Unified Intake owner queue.', sla: 'Respond within 1 business day.' },
  P3: { label: 'Low', rule: 'Reports, archived logs and low-intent leads.', action: 'Log/report only unless manually escalated.', sla: 'Review in scheduled report.' }
};

export const rbac = [
  { role: 'Super Admin / 超级管理员', scope: 'All modules / 全部模块', can: 'Full create/read/update/delete/export/approve/publish/backup/restore/secrets settings / 可完整执行创建、读取、更新、删除、导出、审批、发布、备份、恢复及机密设置', cannot: 'Danger actions require audit and optional second approval. / 高风险操作需要审计，并可选二次审批。' },
  { role: 'Operations Admin / 运营管理员', scope: 'Dashboard, intake, dispatch, jobs / 仪表盘、统一入口、派工、工单', can: 'Create, assign and update jobs; bind customers; manage inspections; resolve P0/P1 / 创建、分配、更新工单；绑定客户；管理查验；处理 P0/P1 事项', cannot: 'Cannot manage secrets, backups or finance void/refund unless granted. / 未授权时不可管理机密、备份或财务作废/退款。' },
  { role: 'Finance / 财务', scope: 'Quotations, invoices, payments, receipts / 报价、发票、付款、收据', can: 'Approve/issue quotes and invoices; reconcile payments; issue receipts; export finance reports / 审批或签发报价与发票；对账付款；签发收据；导出财务报表', cannot: 'Cannot publish website/social content or view unrelated AI secrets. / 不可发布网站/社媒内容，也不可查看无关 AI 密钥。' },
  { role: 'Content Admin / 内容管理员', scope: 'Website, social, AI drafts, media / 网站、社媒、AI 草稿、媒体', can: 'Create, edit, review, schedule and publish approved content / 创建、编辑、审核、排期和发布已批准内容', cannot: 'Cannot access finance exports or broad customer private records. / 不可访问财务导出或大范围客户隐私记录。' },
  { role: 'Support / 客服', scope: 'Unified inbox and limited customer center / 统一收件箱与受限客户中心', can: 'Reply, handoff, convert conversations to leads, update contact notes / 回复、转人工、将对话转为线索、更新联系备注', cannot: 'Cannot issue invoices, reset secrets, delete customer records or publish AI content. / 不可开具发票、重置密钥、删除客户记录或发布 AI 内容。' },
  { role: 'Engineer / 工程师', scope: 'Assigned jobs and inspections / 已分配工单与查验任务', can: 'View assigned jobs, update checklist/status/photos/signature / 查看已分配工单，更新清单、状态、照片与签名', cannot: 'Cannot view unassigned jobs, finance data, full customer DB or settings. / 不可查看未分配工单、财务数据、完整客户库或系统设置。' },
  { role: 'Customer / 客户', scope: 'Own portal records / 仅自己的门户记录', can: 'View own requests, quotes, invoices, receipts, warranties; submit updates and claims / 查看自己的请求、报价、发票、收据、保修；提交更新和索赔', cannot: 'Cannot access other customers, internal notes, audit logs or admin workflows. / 不可访问其他客户、内部备注、审计日志或后台流程。' }
];

export const statusMachines = [
  { object: 'Lead / 线索', statuses: 'new → qualified → converted / duplicate / lost / archived / 新建 → 已确认 → 已转化 / 重复 / 丢失 / 已归档', guard: 'duplicate/lost requires reason; conversion target required / 标记重复或丢失需填写原因；转化需指定目标' },
  { object: 'Service Request / 服务请求', statuses: 'pending_review → scheduled → inspected → quoted → approved / cancelled / 待审核 → 已预约 → 已查验 → 已报价 → 已批准 / 已取消', guard: 'formal job requires admin approval / 正式建单需要管理员审批' },
  { object: 'Inspection / 查验', statuses: 'scheduled → assigned → in_progress → completed / rescheduled / cancelled / 已预约 → 已分配 → 进行中 → 已完成 / 改期 / 已取消', guard: 'completed requires checklist and photos / 完成前必须上传清单和照片' },
  { object: 'Quotation / 报价', statuses: 'draft → sent → viewed → accepted / rejected / expired / revised / cancelled / 草稿 → 已发送 → 已查看 → 已接受 / 已拒绝 / 已过期 / 已修订 / 已取消', guard: 'accepted quote locks line items except approved revision / 已接受的报价会锁定条目，除非有批准的修订' },
  { object: 'Job / Work Execution / 工单 / 施工执行', statuses: 'assigned → en_route → arrived → in_progress → completed / rework_required / cancelled / 已分配 → 在途中 → 已到场 → 进行中 → 已完成 / 需要返工 / 已取消', guard: 'completion requires checklist, photos and optional signature / 完工需要清单、照片及可选客户签名' },
  { object: 'Invoice / 发票', statuses: 'draft → issued → partially_paid → paid / overdue / void / 草稿 → 已开具 → 部分付款 → 已付款 / 已逾期 / 已作废', guard: 'issued invoice requires unique number; void requires Finance/Super Admin reason / 已开具发票必须有唯一编号；作废需财务或超级管理员填写原因' },
  { object: 'Payment / 付款', statuses: 'pending → processing → succeeded / failed / refunded / partially_refunded / 待处理 → 处理中 → 成功 / 失败 / 已退款 / 部分退款', guard: 'gateway webhook reconciliation required for online payments / 在线付款需要支付网关 webhook 对账' },
  { object: 'Receipt / 收据', statuses: 'draft → issued / corrected / void / 草稿 → 已签发 / 已更正 / 已作废', guard: 'issued only after successful payment allocation / 仅在付款成功并完成核销后签发' },
  { object: 'Warranty / Claim / 保修 / 索赔', statuses: 'active → expiring → expired / claim_opened → claim_approved / claim_rejected → resolved / 生效中 → 即将到期 → 已到期 / 已开启索赔 → 已批准索赔 / 已拒绝索赔 → 已解决', guard: 'claim approval requires completed job and warranty coverage check / 索赔批准前必须确认工单已完工并通过保修覆盖检查' }
];

export const socialDrafts = [
  { platform: 'Facebook', ratio: '1.91:1 / 4:5', title: 'Before water spreads, inspect the source', cta: 'WhatsApp NANOFIX', hashtags: '#LeakDetection #SingaporeHomes', status: 'Pending Review' },
  { platform: 'Instagram', ratio: '4:5 Reel cover', title: 'No-hacking leak repair case', cta: 'Send photos for advice', hashtags: '#NoHackingRepair #WaterproofingSG', status: 'Needs Edit' },
  { platform: 'TikTok', ratio: '9:16', title: 'Ceiling leak diagnosis in 30 seconds', cta: 'Book inspection', hashtags: '#SingaporeLeak #HomeRepair', status: 'Pending Review' },
  { platform: 'YouTube Shorts', ratio: '9:16', title: 'How thermal imaging finds hidden leaks', cta: 'Contact NANOFIX', hashtags: '#LeakDetection #Shorts', status: 'Approved' },
  { platform: 'Xiaohongshu', ratio: '3:4', title: '新加坡漏水免砸砖维修', cta: '私信发送照片', hashtags: '#新加坡漏水 #免砸砖', status: 'Pending Review' },
  { platform: 'Google Business Profile', ratio: 'Post image', title: 'Recent waterproofing repair completed', cta: 'Call / WhatsApp', hashtags: '#NANOFIXSG', status: 'Scheduled' }
];

export const customer360 = {
  name: 'Ms Lim Siew Mei',
  status: 'Linked customer',
  phone: '+65 8xxx xxxx',
  risk: 'Warranty risk',
  records: [
    ['Leads', '2', '1 converted, 1 duplicate review'],
    ['Service Requests', '3', '1 pending inspection, 2 closed'],
    ['Jobs', '2', '1 completed, 1 rework_required'],
    ['Quotes', '2', '1 accepted, 1 revised'],
    ['Invoices', '2', '1 paid, 1 overdue'],
    ['Warranties', '1', 'active until 2027-05-21']
  ]
};

export const successMessages = [
  {
    scenario: 'Quick repair request submitted successfully',
    en: 'Thank you. Your repair request has been received. Our NANOFIX team will review it shortly and contact you as soon as possible.',
    zh: '谢谢您，您的报修请求已提交成功。NANOFIX 团队会尽快查看，并尽快与您联系。',
    nextButtons: 'None. No registration-style next-step buttons.'
  },
  {
    scenario: 'Customer registration completed successfully',
    en: 'Welcome to NANOFIX. Your account has been created successfully. You can now track your repair requests, quotations, invoices, payments and warranty records from your customer portal.',
    zh: '欢迎加入 NANOFIX，您的会员账户已创建成功。您现在可以在客户中心查看报修进度、报价、发票、付款和保修记录。',
    nextButtons: 'View Customer Portal / Submit Another Request'
  },
  {
    scenario: 'Customer registration + repair request submitted successfully',
    en: 'Welcome to NANOFIX. Your account and repair request have been created successfully. Our team will review your request shortly, and you can track the progress from your customer portal.',
    zh: '欢迎加入 NANOFIX，您的会员账户和报修请求已创建成功。我们的团队会尽快查看您的请求，您也可以在客户中心追踪处理进度。',
    nextButtons: 'View Customer Portal / Submit Another Request'
  }
];

export const backupSchedules = [
  { module: 'Central Database', frequency: 'Daily', time: '02:00 Asia/Singapore', retention: '35 days', status: 'Healthy' },
  { module: 'Website Management', frequency: 'Daily', time: '02:15 Asia/Singapore', retention: '30 days', status: 'Healthy' },
  { module: 'Service & Orders', frequency: 'Hourly delta + daily full', time: 'Every hour', retention: '90 days', status: 'Healthy' },
  { module: 'AI / Social / Inbox', frequency: 'Daily', time: '02:45 Asia/Singapore', retention: '30 days', status: 'Healthy' },
  { module: 'Storage Manifest', frequency: 'Daily', time: '03:00 Asia/Singapore', retention: '60 days', status: 'Healthy' }
];
