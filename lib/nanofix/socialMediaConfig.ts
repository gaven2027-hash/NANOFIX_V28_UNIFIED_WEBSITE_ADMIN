export type SocialMediaSectionKey =
  | 'social-accounts'
  | 'google-business-profile'
  | 'gmb-messages'
  | 'gmb-reviews'
  | 'gmb-qa'
  | 'unified-social-inbox'
  | 'whatsapp-ai-reply'
  | 'transfer-to-human'
  | 'live-chat-webhook-collector'
  | 'temporary-lead-creation'
  | 'one-click-convert-to-lead'
  | 'media-library'
  | 'ai-social-content-studio'
  | 'multi-platform-preview-review'
  | 'facebook-preview'
  | 'instagram-preview'
  | 'tiktok-preview'
  | 'youtube-shorts-preview'
  | 'xiaohongshu-preview'
  | 'google-business-profile-post-preview'
  | 'schedule-publish-approval'
  | 'social-logs';

export type SocialMediaSectionConfig = {
  key: SocialMediaSectionKey;
  href: string;
  title: string;
  zh: string;
  tab: 'records' | 'messages' | 'drafts' | 'versions';
  platform: string;
  helper: string;
};

export const socialMediaSections: SocialMediaSectionConfig[] = [
  { key: 'social-accounts', href: '/social-media/social-accounts', title: 'Social Accounts', zh: '社媒账号', tab: 'records', platform: 'all', helper: 'Manage platform account URLs, active status and connection notes.' },
  { key: 'google-business-profile', href: '/social-media/google-business-profile', title: 'Google Business Profile', zh: 'Google 商家资料', tab: 'records', platform: 'google_business_profile', helper: 'Manage Google Business Profile configuration, posting rules and local business details.' },
  { key: 'gmb-messages', href: '/social-media/gmb-messages', title: 'GMB Messages', zh: 'GMB 消息', tab: 'messages', platform: 'google_business_profile', helper: 'Read, search, tag and hand off Google Business Profile messages.' },
  { key: 'gmb-reviews', href: '/social-media/gmb-reviews', title: 'GMB Reviews', zh: 'GMB 评论', tab: 'records', platform: 'google_business_profile', helper: 'Track Google review response drafts, status and approval records.' },
  { key: 'gmb-qa', href: '/social-media/gmb-qa', title: 'GMB Q&A', zh: 'GMB 问答', tab: 'records', platform: 'google_business_profile', helper: 'Manage Google Q&A answer drafts and approved knowledge snippets.' },
  { key: 'unified-social-inbox', href: '/social-media/unified-social-inbox', title: 'Unified Social Inbox', zh: '统一社媒收件箱', tab: 'messages', platform: 'all', helper: 'Central inbox for inbound social messages across all channels.' },
  { key: 'whatsapp-ai-reply', href: '/social-media/whatsapp-ai-reply', title: 'WhatsApp AI Reply', zh: 'WhatsApp AI 回复', tab: 'drafts', platform: 'whatsapp', helper: 'Create and review WhatsApp AI reply drafts. AI cannot auto-send.' },
  { key: 'transfer-to-human', href: '/social-media/transfer-to-human', title: 'Transfer to Human', zh: '转人工', tab: 'messages', platform: 'all', helper: 'Manage handoff status and notes for social conversations that require human review.' },
  { key: 'live-chat-webhook-collector', href: '/social-media/live-chat-webhook-collector', title: 'Live Chat / Webhook Collector', zh: '在线聊天/Webhook 收集', tab: 'messages', platform: 'website_live_chat', helper: 'Review captured webhook/live-chat events and convert qualified messages to leads.' },
  { key: 'temporary-lead-creation', href: '/social-media/temporary-lead-creation', title: 'Temporary Lead Creation', zh: '临时线索创建', tab: 'records', platform: 'all', helper: 'Create temporary social lead records before full customer binding.' },
  { key: 'one-click-convert-to-lead', href: '/social-media/one-click-convert-to-lead', title: 'One-Click Convert to Lead', zh: '一键转为线索', tab: 'messages', platform: 'all', helper: 'Review social messages and prepare one-click conversion handoff to Lead records.' },
  { key: 'media-library', href: '/social-media/media-library', title: 'Media Library', zh: '媒体库', tab: 'records', platform: 'all', helper: 'Manage social media asset metadata and placement notes.' },
  { key: 'ai-social-content-studio', href: '/social-media/ai-social-content-studio', title: 'AI Social Content Studio', zh: 'AI 社媒内容工作室', tab: 'drafts', platform: 'all', helper: 'Generate and edit platform-specific social drafts. AI output remains draft until approval.' },
  { key: 'multi-platform-preview-review', href: '/social-media/multi-platform-preview-review', title: 'Multi-Platform Preview Review', zh: '多平台并排模拟预览审核', tab: 'drafts', platform: 'all', helper: 'Review platform-specific drafts side-by-side before approval, scheduling or publishing.' },
  { key: 'facebook-preview', href: '/social-media/facebook-preview', title: 'Facebook Preview', zh: 'Facebook 预览', tab: 'drafts', platform: 'facebook', helper: 'Create and preview Facebook post drafts.' },
  { key: 'instagram-preview', href: '/social-media/instagram-preview', title: 'Instagram Preview', zh: 'Instagram 预览', tab: 'drafts', platform: 'instagram', helper: 'Create and preview Instagram caption, cover and hashtag drafts.' },
  { key: 'tiktok-preview', href: '/social-media/tiktok-preview', title: 'TikTok Preview', zh: 'TikTok 预览', tab: 'drafts', platform: 'tiktok', helper: 'Create and preview TikTok short video title, caption and hashtag drafts.' },
  { key: 'youtube-shorts-preview', href: '/social-media/youtube-shorts-preview', title: 'YouTube Shorts Preview', zh: 'YouTube Shorts 预览', tab: 'drafts', platform: 'youtube_shorts', helper: 'Create and preview YouTube Shorts title, description and CTA drafts.' },
  { key: 'xiaohongshu-preview', href: '/social-media/xiaohongshu-preview', title: 'Xiaohongshu Preview', zh: '小红书预览', tab: 'drafts', platform: 'xiaohongshu', helper: 'Create and preview Xiaohongshu title, post body, hashtags and localised CTA.' },
  { key: 'google-business-profile-post-preview', href: '/social-media/google-business-profile-post-preview', title: 'Google Business Profile Post Preview', zh: 'Google 商家帖子预览', tab: 'drafts', platform: 'google_business_profile', helper: 'Create and preview Google Business Profile post drafts.' },
  { key: 'schedule-publish-approval', href: '/social-media/schedule-publish-approval', title: 'Schedule / Publish Approval', zh: '排期/发布审批', tab: 'versions', platform: 'all', helper: 'Approve, schedule and record social publish snapshots. AI cannot auto-publish.' },
  { key: 'social-logs', href: '/social-media/social-logs', title: 'Social Logs', zh: '社媒日志', tab: 'versions', platform: 'all', helper: 'Review social publish/version records and audit trail.' }
];

export function getSocialMediaSection(key: string | undefined) {
  return socialMediaSections.find((section) => section.key === key) || null;
}
