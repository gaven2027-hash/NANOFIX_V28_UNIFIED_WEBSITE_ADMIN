export type V287StageStatus = 'planned' | 'ready_for_repair' | 'in_progress' | 'verified' | 'blocked';
export type V287ProviderStatus = 'connected' | 'auth_required' | 'manual_mode' | 'api_review_required' | 'error' | 'disabled';

export type V287ChainStage = {
  key: string;
  order: number;
  title: string;
  zh: string;
  route: string;
  requiredTables: string[];
  requiredApis: string[];
  status: V287StageStatus;
};

export type V287IntegrationProvider = {
  key: string;
  category: 'social' | 'ads' | 'messaging' | 'manual';
  title: string;
  zh: string;
  mode: 'oauth' | 'api_key' | 'manual' | 'webhook' | 'hybrid';
  status: V287ProviderStatus;
  supportsWebhook: boolean;
};

export type V287VideoSpec = {
  platform: string;
  placement: string;
  title: string;
  zh: string;
  aspectRatio: string;
  width?: number;
  height?: number;
  publishMode: 'approval' | 'manual' | 'api' | 'export';
};

export const v287ServiceChainStages: V287ChainStage[] = [
  { key: 'leads_intake', order: 1, title: 'Leads & Intake', zh: '线索与报修入口', route: '/service-operations#leads-intake', requiredTables: ['unified_intake', 'leads', 'service_requests'], requiredApis: ['/api/public/intake', '/api/admin/leads', '/api/admin/service-requests'], status: 'ready_for_repair' },
  { key: 'site_inspection', order: 2, title: 'Site Inspection', zh: '现场查验', route: '/service-operations#site-inspection', requiredTables: ['service_requests', 'inspection_records', 'media_assets'], requiredApis: ['/api/admin/inspections'], status: 'ready_for_repair' },
  { key: 'quotations', order: 3, title: 'Quotations', zh: '报价', route: '/service-operations#quotations', requiredTables: ['quotations', 'quotation_items', 'approval_tasks'], requiredApis: ['/api/admin/quotations'], status: 'ready_for_repair' },
  { key: 'jobs_scheduling', order: 4, title: 'Jobs & Scheduling', zh: '工单与排期', route: '/service-operations#jobs-scheduling', requiredTables: ['jobs', 'job_status_logs', 'engineer_tasks'], requiredApis: ['/api/admin/jobs'], status: 'ready_for_repair' },
  { key: 'engineer_tasks', order: 5, title: 'Engineer Tasks', zh: '工程师任务', route: '/service-operations#engineer-tasks', requiredTables: ['engineer_tasks', 'job_status_logs'], requiredApis: ['/api/admin/engineer-tasks'], status: 'planned' },
  { key: 'invoices', order: 6, title: 'Invoices', zh: '发票', route: '/service-operations#invoices', requiredTables: ['invoices', 'invoice_items'], requiredApis: ['/api/admin/invoices'], status: 'ready_for_repair' },
  { key: 'payments', order: 7, title: 'Payments', zh: '付款', route: '/service-operations#payments', requiredTables: ['payments', 'payment_events'], requiredApis: ['/api/admin/payments'], status: 'ready_for_repair' },
  { key: 'warranty_completion', order: 8, title: 'Warranty & Completion', zh: '完工与保修', route: '/service-operations#warranty-completion', requiredTables: ['warranties', 'warranty_claims', 'completion_records'], requiredApis: ['/api/admin/warranties'], status: 'ready_for_repair' },
  { key: 'operations_audit', order: 9, title: 'Operations Audit', zh: '操作审计', route: '/service-operations#operations-audit', requiredTables: ['audit_logs', 'status_transition_logs'], requiredApis: ['/api/admin/audit-logs'], status: 'ready_for_repair' }
];

export const v287CustomerChainStages: V287ChainStage[] = [
  { key: 'customer_profiles', order: 1, title: 'Customer Profiles', zh: '客户档案', route: '/customer-center#customer-profiles', requiredTables: ['customer_profiles'], requiredApis: ['/api/admin/customers'], status: 'ready_for_repair' },
  { key: 'customer_binding_verification', order: 2, title: 'Customer Binding & Verification', zh: '客户绑定与验证', route: '/customer-center#customer-binding-verification', requiredTables: ['customer_profiles', 'customer_bindings', 'customer_claims'], requiredApis: ['/api/admin/customers/bindings'], status: 'ready_for_repair' },
  { key: 'customer_portal_accounts', order: 3, title: 'Customer Portal Accounts', zh: '客户门户账号', route: '/customer-center#customer-portal-accounts', requiredTables: ['customer_profiles', 'customer_portal_accounts'], requiredApis: ['/api/admin/customer-portal/accounts'], status: 'planned' },
  { key: 'repair_tracking', order: 4, title: 'Repair Tracking', zh: '维修进度追踪', route: '/customer-center#repair-tracking', requiredTables: ['service_requests', 'jobs', 'job_status_logs'], requiredApis: ['/api/customer/repair-tracking'], status: 'ready_for_repair' },
  { key: 'quotes_payments', order: 5, title: 'Quotes & Payments', zh: '报价与付款', route: '/customer-center#quotes-payments', requiredTables: ['quotations', 'invoices', 'payments'], requiredApis: ['/api/customer/quotes', '/api/customer/payments'], status: 'ready_for_repair' },
  { key: 'warranty_documents', order: 6, title: 'Warranty & Documents', zh: '保修与文件', route: '/customer-center#warranty-documents', requiredTables: ['warranties', 'customer_documents'], requiredApis: ['/api/customer/warranties'], status: 'ready_for_repair' },
  { key: 'reviews_feedback', order: 7, title: 'Reviews & Feedback', zh: '评价与反馈', route: '/customer-center#reviews-feedback', requiredTables: ['customer_reviews', 'testimonials'], requiredApis: ['/api/customer/reviews'], status: 'planned' },
  { key: 'privacy_consent', order: 8, title: 'Privacy & Consent', zh: '隐私与授权', route: '/customer-center#privacy-consent', requiredTables: ['consent_logs', 'privacy_requests'], requiredApis: ['/api/customer/privacy'], status: 'planned' }
];

export const v287IntegrationProviders: V287IntegrationProvider[] = [
  { key: 'whatsapp_cloud', category: 'messaging', title: 'WhatsApp Cloud API', zh: 'WhatsApp Cloud API', mode: 'webhook', status: 'auth_required', supportsWebhook: true },
  { key: 'facebook_pages', category: 'social', title: 'Facebook Pages', zh: 'Facebook 页面', mode: 'oauth', status: 'auth_required', supportsWebhook: true },
  { key: 'instagram_business', category: 'social', title: 'Instagram Business', zh: 'Instagram 商业账号', mode: 'oauth', status: 'auth_required', supportsWebhook: true },
  { key: 'google_business_profile', category: 'social', title: 'Google Business Profile', zh: 'Google 商家资料', mode: 'oauth', status: 'auth_required', supportsWebhook: true },
  { key: 'youtube_shorts', category: 'social', title: 'YouTube Shorts', zh: 'YouTube Shorts', mode: 'oauth', status: 'auth_required', supportsWebhook: false },
  { key: 'tiktok_business', category: 'social', title: 'TikTok Business', zh: 'TikTok Business', mode: 'oauth', status: 'api_review_required', supportsWebhook: false },
  { key: 'x_platform', category: 'social', title: 'X Platform', zh: 'X 平台', mode: 'oauth', status: 'auth_required', supportsWebhook: false },
  { key: 'xiaohongshu_manual', category: 'manual', title: 'Xiaohongshu Manual Mode', zh: '小红书手动模式', mode: 'manual', status: 'manual_mode', supportsWebhook: false },
  { key: 'google_ads', category: 'ads', title: 'Google Ads', zh: 'Google 广告', mode: 'oauth', status: 'auth_required', supportsWebhook: false },
  { key: 'meta_ads', category: 'ads', title: 'Meta Ads', zh: 'Meta 广告', mode: 'oauth', status: 'auth_required', supportsWebhook: true },
  { key: 'tiktok_ads', category: 'ads', title: 'TikTok Ads', zh: 'TikTok 广告', mode: 'oauth', status: 'api_review_required', supportsWebhook: false },
  { key: 'x_ads', category: 'ads', title: 'X Ads', zh: 'X 广告', mode: 'oauth', status: 'auth_required', supportsWebhook: false },
  { key: 'bing_ads', category: 'ads', title: 'Bing Ads', zh: 'Bing 广告', mode: 'oauth', status: 'auth_required', supportsWebhook: false }
];

export const v287VideoSpecs: V287VideoSpec[] = [
  { platform: 'instagram', placement: 'reels', title: 'Instagram Reels', zh: 'Instagram Reels', aspectRatio: '9:16', width: 1080, height: 1920, publishMode: 'approval' },
  { platform: 'facebook', placement: 'reels', title: 'Facebook Reels', zh: 'Facebook Reels', aspectRatio: '9:16', width: 1080, height: 1920, publishMode: 'approval' },
  { platform: 'tiktok', placement: 'organic', title: 'TikTok Video', zh: 'TikTok 视频', aspectRatio: '9:16', width: 1080, height: 1920, publishMode: 'manual' },
  { platform: 'youtube', placement: 'shorts', title: 'YouTube Shorts', zh: 'YouTube Shorts', aspectRatio: '9:16', width: 1080, height: 1920, publishMode: 'approval' },
  { platform: 'x', placement: 'video_landscape', title: 'X Landscape Video', zh: 'X 横屏视频', aspectRatio: '16:9', width: 1920, height: 1080, publishMode: 'approval' },
  { platform: 'x', placement: 'video_square', title: 'X Square Video', zh: 'X 方形视频', aspectRatio: '1:1', width: 1080, height: 1080, publishMode: 'approval' },
  { platform: 'google_business_profile', placement: 'post_video', title: 'Google Business Profile Post Video', zh: 'Google 商家帖子视频', aspectRatio: '1:1', width: 1080, height: 1080, publishMode: 'manual' },
  { platform: 'xiaohongshu', placement: 'note_video', title: 'Xiaohongshu Note Video', zh: '小红书笔记视频', aspectRatio: '3:4', width: 1080, height: 1440, publishMode: 'manual' },
  { platform: 'ads', placement: 'vertical_video', title: 'Ads Vertical Video', zh: '广告竖屏视频', aspectRatio: '9:16', width: 1080, height: 1920, publishMode: 'approval' },
  { platform: 'ads', placement: 'square_video', title: 'Ads Square Video', zh: '广告方形视频', aspectRatio: '1:1', width: 1080, height: 1080, publishMode: 'approval' }
];
