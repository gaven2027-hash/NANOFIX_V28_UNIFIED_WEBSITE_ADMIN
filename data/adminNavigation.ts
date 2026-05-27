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
    order: 'Top',
    href: '/admin',
    title: 'Global Search & Admin Home',
    zh: '全局搜索与后台首页',
    badge: 'All',
    children: [
      child('/admin#module-launch', 'All Module Launch Board', '全部模块入口'),
      child('/dashboard#global-search', 'Top Fixed Global Search', '顶部固定全局搜索'),
      child('/dashboard#dashboard-4', 'Unified Intake Feed', '统一入口动态'),
      child('/dashboard#dashboard-14', 'Module Health & Degraded Mode', '模块健康与降级模式')
    ]
  },
  {
    order: '1',
    href: '/dashboard',
    title: 'Dashboard, Analytics & Alerts',
    zh: '仪表盘、数据分析与预警',
    badge: 18,
    children: [
      child('/dashboard#dashboard-1', 'Main Dashboard', '主仪表盘'),
      child('/dashboard#dashboard-2', 'Today’s Tasks', '今日待处理事项'),
      child('/dashboard#dashboard-3', 'AI Alerts', 'AI 预警'),
      child('/dashboard#dashboard-4', 'Unified Intake', '统一入口'),
      child('/dashboard#dashboard-7', 'New Leads', '新线索'),
      child('/dashboard#dashboard-8', 'Pending Customer Binding', '待绑定客户'),
      child('/dashboard#dashboard-12', 'Reports', '报表'),
      child('/dashboard#dashboard-14', 'Module Health', '模块健康')
    ]
  },
  {
    order: '2',
    href: '/service-operations',
    title: 'Service & Order Operations',
    zh: '服务与订单运营',
    badge: 42,
    children: [
      child('/service-operations#operations-1', 'Leads', '线索'),
      child('/service-operations#operations-2', 'Service Requests', '服务请求/报修单'),
      child('/service-operations#operations-4', 'Inspections', '查验'),
      child('/service-operations#operations-7', 'Quotations', '报价'),
      child('/service-operations#operations-10', 'Jobs / Work Execution', '工单/施工执行'),
      child('/service-operations#operations-11', 'Engineer Assignment', '工程师分配'),
      child('/service-operations#operations-18', 'Invoices', '发票'),
      child('/service-operations#operations-19', 'Payments', '付款'),
      child('/service-operations#operations-21', 'Receipts', '收据'),
      child('/service-operations#operations-23', 'Warranties', '保修')
    ]
  },
  {
    order: '3',
    href: '/website-management',
    title: 'Website Management',
    zh: '网站后台管理',
    badge: 15,
    children: [
      child('/website-management#website-1', 'Navigation & Menu', '导航与菜单'),
      child('/website-management#website-2', 'Page Content', '页面内容'),
      child('/website-management#website-3', 'Home Content', '首页内容'),
      child('/website-management#website-5', 'Guide Library', 'Guide 内容库'),
      child('/website-management#website-6', 'SEO / AEO Library', 'SEO/AEO 内容库'),
      child('/website-management#website-7', 'AI Website Content Generator', 'AI 网站内容生成'),
      child('/website-management#website-9', 'Preview', '预览'),
      child('/website-management#website-10', 'Publish', '发布'),
      child('/website-management#website-11', 'Forms', '表单'),
      child('/website-management#website-13', 'Media Library', '媒体库')
    ]
  },
  {
    order: '4',
    href: '/social-media',
    title: 'Social Media Management',
    zh: '社交媒体管理',
    badge: 22,
    children: [
      child('/social-media#social-1', 'Social Accounts', '社媒账号'),
      child('/social-media#social-2', 'Google Business Profile', 'Google 商家资料'),
      child('/social-media#social-6', 'Unified Social Inbox', '统一社媒收件箱'),
      child('/social-media#social-7', 'WhatsApp AI Reply', 'WhatsApp AI 回复'),
      child('/social-media#social-8', 'Transfer to Human', '转人工'),
      child('/social-media#social-9', 'Live Chat / Webhook Collector', '在线聊天/Webhook 收集'),
      child('/social-media#social-13', 'AI Social Content Studio', 'AI 社媒内容工作室'),
      child('/social-media#social-14', 'Multi-Platform Preview Review', '多平台并排模拟预览审核'),
      child('/social-media#social-21', 'Schedule / Publish Approval', '排期/发布审批'),
      child('/social-media#social-22', 'Social Logs', '社媒日志')
    ]
  },
  {
    order: '5',
    href: '/admin/advertising-center',
    title: 'Advertising & Promotion Center',
    zh: '广告投放与推广中心',
    badge: 'Ads',
    children: [
      child('/admin/advertising-center', 'Overview / Campaigns', '总览/广告活动'),
      child('/admin/advertising-center/import', 'CSV / Excel Import', 'CSV/Excel 导入'),
      child('/admin/advertising-center/insights', 'ROI Insights & Alerts', 'ROI 分析与预警'),
      child('/admin/advertising-center/creatives', 'Creatives & Copy', '素材与文案'),
      child('/admin/advertising-center/budgets', 'Budgets & Strategy', '预算与策略'),
      child('/admin/advertising-center#accounts', 'Connected Ad Accounts', '广告账号连接'),
      child('/admin/advertising-center#approval-gates', 'Approval Gates', '审批闸门')
    ]
  },
  {
    order: '6',
    href: '/ai-intelligence',
    title: 'AI Intelligence Center',
    zh: 'AI 智能中心',
    badge: 17,
    children: [
      child('/ai-intelligence#ai-1', 'Global Web Search', '全网搜索中心'),
      child('/ai-intelligence#ai-2', 'AI Website Assistant', 'AI 网站助手'),
      child('/ai-intelligence#ai-3', 'AI Social Assistant', 'AI 社媒助手'),
      child('/ai-intelligence#ai-4', 'AI Conversation Intelligence', 'AI 对话智能'),
      child('/ai-intelligence#ai-5', 'Lead Discovery', '获客线索发现'),
      child('/ai-intelligence#ai-6', 'AI Rules', 'AI 规则'),
      child('/ai-intelligence#ai-10', 'AI Logs', 'AI 日志'),
      child('/ai-intelligence#ai-11', 'Usage & Cost', '用量与成本'),
      child('/ai-intelligence#ai-14', 'Quotation AI Assist', '报价 AI 辅助'),
      child('/ai-intelligence#ai-15', 'Invoice AI Assist', '发票 AI 辅助')
    ]
  },
  {
    order: '7',
    href: '/customer-center',
    title: 'Customer Center',
    zh: '客户中心',
    badge: 21,
    children: [
      child('/customer-center#customer-1', 'Customers', '客户'),
      child('/customer-center#customer-2', 'Customer Profiles', '客户档案'),
      child('/customer-center#customer-3', 'Customer 360', '客户全景'),
      child('/customer-center#customer-4', 'Customer Portal Management', '客户门户管理'),
      child('/customer-center#customer-5', 'Repair Tracking', '维修进度追踪'),
      child('/customer-center#customer-9', 'Linked Quotes', '关联报价'),
      child('/customer-center#customer-10', 'Linked Invoices', '关联发票'),
      child('/customer-center#customer-12', 'Linked Warranties', '关联保修'),
      child('/customer-center#customer-13', 'Customer Binding', '客户绑定'),
      child('/customer-center#customer-20', 'PDPA Requests', 'PDPA 请求')
    ]
  },
  {
    order: '8',
    href: '/system-settings',
    title: 'Website & System Settings',
    zh: '网站与系统设置',
    badge: 21,
    children: [
      child('/system-settings#settings-1', 'Company Settings', '公司设置'),
      child('/system-settings#settings-2', 'Logo & Brand Assets', 'LOGO 与品牌素材'),
      child('/system-settings#settings-3', 'Admin Login Branding', '后台登录品牌'),
      child('/system-settings#settings-4', 'API Integrations', 'API 集成'),
      child('/system-settings#settings-5', 'Supabase Settings', 'Supabase 设置'),
      child('/system-settings#settings-6', 'GitHub / Vercel Deployment Settings', 'GitHub/Vercel 部署设置'),
      child('/system-settings#settings-7', 'Search Settings', '搜索设置'),
      child('/system-settings#settings-8', 'QR Backend Management', '后台二维码管理'),
      child('/system-settings#settings-10', 'Backup & Download Center', '备份与下载中心'),
      child('/system-settings#settings-14', 'Permissions / RBAC', '权限/RBAC'),
      child('/system-settings#settings-16', 'Audit Logs', '审计日志'),
      child('/system-settings#settings-20', 'Health Checks', '健康检查')
    ]
  },
  {
    order: 'P1',
    href: '/customer-portal',
    title: 'Customer Portal',
    zh: '客户会员中心入口',
    badge: 'Portal',
    children: [
      child('/customer-portal#customer-portal-1', 'My Repair Requests', '我的报修'),
      child('/customer-portal#customer-portal-2', 'My Quotes', '我的报价'),
      child('/customer-portal#customer-portal-3', 'My Invoices', '我的发票'),
      child('/customer-portal#customer-portal-5', 'My Warranties', '我的保修'),
      child('/customer-portal#customer-portal-6', 'Submit New Repair Request', '提交新报修')
    ]
  },
  {
    order: 'P2',
    href: '/engineer-portal',
    title: 'Engineer Portal',
    zh: '工程师工作台入口',
    badge: 'Portal',
    children: [
      child('/engineer-portal#engineer-portal-1', 'Assigned Jobs', '已分配工单'),
      child('/engineer-portal#engineer-portal-2', 'Today Schedule', '今日排程'),
      child('/engineer-portal#engineer-portal-4', 'Inspection Checklist', '查验清单'),
      child('/engineer-portal#engineer-portal-5', 'Upload Photos', '上传照片'),
      child('/engineer-portal#engineer-portal-7', 'Completion / Rework Status', '完工/返工状态')
    ]
  }
];
