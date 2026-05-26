export type AdPlatform = 'google_ads' | 'ga4' | 'google_business_profile' | 'meta_ads' | 'tiktok_ads' | 'youtube_ads' | 'xiaohongshu' | 'manual_import';
export type AdApprovalStatus = 'draft' | 'pending_review' | 'finance_review' | 'approved' | 'rejected' | 'paused' | 'archived';
export type AdRiskLevel = 'normal' | 'watch' | 'high' | 'critical';

export const adPlatforms: Array<{ key: AdPlatform; label: string; status: string; syncMode: string }> = [
  { key: 'google_ads', label: 'Google Ads / 谷歌广告', status: 'planned_api_or_csv', syncMode: 'API + CSV fallback' },
  { key: 'ga4', label: 'Google Analytics 4 / GA4', status: 'planned_api_or_bigquery', syncMode: 'Event + attribution import' },
  { key: 'google_business_profile', label: 'Google Business Profile / 谷歌商家资料', status: 'planned_api_or_manual', syncMode: 'Review/message/local action import' },
  { key: 'meta_ads', label: 'Meta Ads / Facebook & Instagram 广告', status: 'planned_api_or_csv', syncMode: 'API + CSV fallback' },
  { key: 'tiktok_ads', label: 'TikTok Ads / TikTok 广告', status: 'planned_api_or_csv', syncMode: 'API + CSV fallback' },
  { key: 'youtube_ads', label: 'YouTube Ads / YouTube 广告', status: 'via_google_ads', syncMode: 'Google Ads import' },
  { key: 'xiaohongshu', label: 'Xiaohongshu Promotion / 小红书推广', status: 'manual_or_csv', syncMode: 'Manual + CSV fallback' },
  { key: 'manual_import', label: 'Manual CSV / 手动导入', status: 'enabled_phase_1', syncMode: 'CSV / Excel / manual daily spend' }
];

export const adCenterSections = [
  ['Advertising Dashboard', '广告总览'],
  ['Ad Accounts', '广告账号'],
  ['Campaigns', '广告活动'],
  ['Budgets & Strategy', '预算与策略'],
  ['Creatives & Copy', '素材与文案'],
  ['Landing Pages & UTM', '落地页与追踪链接'],
  ['ROI Analytics', 'ROI 分析'],
  ['Conversion Attribution', '转化归因'],
  ['AI Ad Suggestions', 'AI 广告建议'],
  ['Approval Center', '广告审核中心'],
  ['Reports', '广告报告'],
  ['Settings', '广告设置']
];

export const superAdminAdvertisingCapabilities = [
  'View all advertising accounts, campaigns, creatives, budgets, ROI reports and attribution data / 查看所有广告账号、活动、素材、预算、ROI 与归因数据',
  'Create, edit, approve, pause, resume or archive any campaign / 创建、编辑、批准、暂停、恢复或归档任何广告活动',
  'Create ad copy, upload creatives, publish videos and modify website landing page content / 创建广告文案、上传素材、发布视频、修改网站落地页内容',
  'Override workflow owners and take over operations, finance, content or support tasks / 覆盖流程负责人并接管运营、财务、内容或客服任务',
  'Approve or reject budget changes and strategy changes / 批准或驳回预算和策略调整',
  'Manually correct attribution, ROI mapping and campaign ownership with audit logs / 可在审计日志下人工修正归因、ROI 映射和广告负责人',
  'Use every role capability without switching accounts / 无需切换账号即可拥有所有角色能力'
];

export const adRoleMatrix = [
  { role: 'super_admin', label: 'Super Admin / 总管理员', permissions: 'All permissions, all roles, final approval, takeover and override / 全部权限、全部角色、最终审批、接管与覆盖' },
  { role: 'operations_admin', label: 'Operations / 运营', permissions: 'Campaign draft, strategy proposal, performance review, approval request / 广告草稿、策略建议、表现查看、提交审批' },
  { role: 'finance', label: 'Finance / 财务', permissions: 'Spend, budget, ROI, invoice/payment impact review / 花费、预算、ROI、发票/付款影响审核' },
  { role: 'content_admin', label: 'Content / 内容管理', permissions: 'Creative, copy, CTA, landing page draft and AI copy review / 素材、文案、CTA、落地页草稿与 AI 文案审核' },
  { role: 'support', label: 'Support / 客服', permissions: 'Lead source and customer conversation source only, no budget editing / 查看线索来源和客户咨询来源，不可改预算' },
  { role: 'engineer', label: 'Inspection & Repair / 检修', permissions: 'Assigned job source visibility only, no ad spend or customer private campaign data / 只看分配工单来源，不看广告花费和客户隐私广告数据' }
];

export const sampleAdCampaignRows = [
  { platform: 'Google Ads', campaign: 'HDB Ceiling Leak Emergency', service: 'Leak Detection', spend: 420, leads: 18, bookings: 7, revenue: 3800, roi: 8.05, status: 'pending_review', risk: 'watch' },
  { platform: 'Meta Ads', campaign: 'No-Hacking Toilet Repair', service: 'No-Hacking Repair', spend: 260, leads: 11, bookings: 4, revenue: 2200, roi: 7.46, status: 'draft', risk: 'normal' },
  { platform: 'TikTok Ads', campaign: 'Before After Waterproofing Video', service: 'Waterproofing Works', spend: 180, leads: 5, bookings: 1, revenue: 0, roi: -1, status: 'finance_review', risk: 'high' },
  { platform: 'Manual CSV', campaign: 'Xiaohongshu Condo Leak Post Boost', service: 'Condo Leak Repair', spend: 90, leads: 4, bookings: 2, revenue: 980, roi: 9.89, status: 'approved', risk: 'normal' }
];

export const adWorkflow = [
  'Create or import campaign / 创建或导入广告活动',
  'Attach platform, service category, landing page and UTM / 绑定平台、服务类别、落地页与 UTM',
  'Select or create creatives and copy variants / 选择或创建素材与文案版本',
  'Set budget draft and stop-loss rule / 设置预算草稿和止损规则',
  'AI generates editable suggestions / AI 生成可编辑建议',
  'Operations/content submit review / 运营或内容提交审核',
  'Finance reviews budget impact / 财务审核预算影响',
  'Super Admin final approval or takeover / 总管理员最终批准或接管',
  'Daily performance and ROI sync / 每日表现与 ROI 同步',
  'Audit log every decision / 所有决策写入审计日志'
];

export function calculateRoas(revenue: number, spend: number) {
  return spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;
}

export function calculateRoi(revenue: number, spend: number, grossProfit = revenue) {
  return spend > 0 ? Number(((grossProfit - spend) / spend).toFixed(2)) : 0;
}
