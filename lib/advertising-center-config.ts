export type AdvertisingPlatform = 'google_ads' | 'ga4' | 'google_business_profile' | 'meta_ads' | 'tiktok_ads' | 'youtube_ads' | 'xiaohongshu' | 'manual_import';
export type AdvertisingStatus = 'draft' | 'pending_review' | 'approved' | 'active' | 'paused' | 'rejected' | 'archived';
export type AdvertisingApprovalStatus = 'draft' | 'submitted' | 'finance_review' | 'super_admin_review' | 'approved' | 'rejected';

export const advertisingPlatforms: Array<{ key: AdvertisingPlatform; label: string; note: string }> = [
  { key: 'google_ads', label: 'Google Ads / 谷歌广告', note: 'Search, display and conversion tracking.' },
  { key: 'ga4', label: 'Google Analytics 4 / GA4', note: 'Website events and attribution source.' },
  { key: 'google_business_profile', label: 'Google Business Profile / Google 商家资料', note: 'Local discovery, messages and reviews.' },
  { key: 'meta_ads', label: 'Meta Ads / Facebook & Instagram 广告', note: 'Social paid promotion and retargeting.' },
  { key: 'tiktok_ads', label: 'TikTok Ads / TikTok 广告', note: 'Short video promotion.' },
  { key: 'youtube_ads', label: 'YouTube Ads / YouTube 广告', note: 'Video and Shorts promotion.' },
  { key: 'xiaohongshu', label: 'Xiaohongshu / 小红书推广', note: 'Chinese-language social discovery.' },
  { key: 'manual_import', label: 'Manual / CSV / 手动导入', note: 'Fallback when platform API is not connected.' }
];

export const advertisingServiceCategories = [
  'Leak Detection / 漏水检测',
  'No-Hacking Repair / 免敲砖维修',
  'Waterproofing Works / 防水工程',
  'Commercial & Industrial / 商业与工业',
  'Warranty Trust / 保修信任',
  'Remarketing / 再营销'
];

export const advertisingRolePolicy = [
  {
    role: 'super_admin',
    label: 'Super Admin / 总管理员',
    authority: 'All permissions. Can create ads, publish videos, modify website content, approve budgets, override workflow ownership and take over any advertising or backend process at any time.'
  },
  { role: 'operations_admin', label: 'Operations / 运营', authority: 'Create campaign and strategy drafts, review performance, submit budget changes for approval.' },
  { role: 'finance', label: 'Finance / 财务', authority: 'View spend, budget, invoices, payment, ROI and review budget impact.' },
  { role: 'content_admin', label: 'Content Management / 内容管理', authority: 'Create ad creatives, copy variants, AI drafts and landing page suggestions.' },
  { role: 'support', label: 'Customer Service / 客服', authority: 'View lead source and campaign attribution for customer handling, without campaign budget control.' },
  { role: 'engineer', label: 'Inspection & Repair / 检修', authority: 'View assigned job ad-source context only; no budget or full customer ad data.' }
];

export const advertisingWorkflow = [
  'Connect ad account or use CSV/manual import / 连接广告账号或手动导入',
  'Create campaign draft with platform, service, audience, landing page and UTM / 创建广告活动草稿',
  'Create or choose creative and copy variants / 创建或选择素材文案版本',
  'AI generates editable suggestions only / AI 只生成可编辑建议',
  'Operations submits strategy and budget change request / 运营提交策略和预算调整申请',
  'Finance reviews budget impact and ROI / 财务审核预算影响和 ROI',
  'Super Admin approves, rejects or takes over / 总管理员批准、驳回或接管',
  'Performance sync or manual import updates ROI dashboard / 平台同步或手动导入更新 ROI'
];

export function calculateRoas(revenue: number, spend: number) {
  return spend > 0 ? revenue / spend : 0;
}

export function calculateRoi(grossProfit: number, spend: number) {
  return spend > 0 ? (grossProfit - spend) / spend : 0;
}

export function calculateCpl(spend: number, leads: number) {
  return leads > 0 ? spend / leads : 0;
}
