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
  | 'social-video-render-jobs'
  | 'facebook-preview'
  | 'instagram-preview'
  | 'tiktok-preview'
  | 'youtube-shorts-preview'
  | 'xiaohongshu-preview'
  | 'forum-preview'
  | 'google-business-profile-post-preview'
  | 'linkedin-preview'
  | 'x-twitter-preview'
  | 'carousell-services-preview'
  | 'seedly-community-preview'
  | 'whatsapp-channel-preview'
  | 'telegram-channel-preview'
  | 'website-blog-preview'
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
  { key: 'social-accounts', href: '/social-media/social-accounts', title: 'Social Accounts', zh: '社媒账号', tab: 'records', platform: 'all', helper: 'Manage social platform account binding and connection metadata.' },
  { key: 'google-business-profile', href: '/social-media/google-business-profile', title: 'Google Business Profile', zh: 'Google 商家资料', tab: 'records', platform: 'google_business_profile', helper: 'Manage Google Business Profile settings and posting rules.' },
  { key: 'gmb-messages', href: '/social-media/gmb-messages', title: 'GMB Messages', zh: 'GMB 消息', tab: 'messages', platform: 'google_business_profile', helper: 'Review Google Business Profile messages.' },
  { key: 'gmb-reviews', href: '/social-media/gmb-reviews', title: 'GMB Reviews', zh: 'GMB 评论', tab: 'records', platform: 'google_business_profile', helper: 'Review Google response drafts and approval records.' },
  { key: 'gmb-qa', href: '/social-media/gmb-qa', title: 'GMB Q&A', zh: 'GMB 问答', tab: 'records', platform: 'google_business_profile', helper: 'Manage Google Q&A answer drafts.' },
  { key: 'unified-social-inbox', href: '/social-media/unified-social-inbox', title: 'Unified Social Inbox', zh: '统一社媒收件箱', tab: 'messages', platform: 'all', helper: 'Central inbox for social messages.' },
  { key: 'whatsapp-ai-reply', href: '/social-media/whatsapp-ai-reply', title: 'WhatsApp AI Reply', zh: 'WhatsApp AI 回复', tab: 'drafts', platform: 'whatsapp', helper: 'Create reviewed reply drafts.' },
  { key: 'transfer-to-human', href: '/social-media/transfer-to-human', title: 'Transfer to Human', zh: '转人工', tab: 'messages', platform: 'all', helper: 'Manage handoff conversations.' },
  { key: 'live-chat-webhook-collector', href: '/social-media/live-chat-webhook-collector', title: 'Live Chat / Webhook Collector', zh: '在线聊天/Webhook 收集', tab: 'messages', platform: 'website_live_chat', helper: 'Review live chat and webhook events.' },
  { key: 'temporary-lead-creation', href: '/social-media/temporary-lead-creation', title: 'Temporary Lead Creation', zh: '临时线索创建', tab: 'records', platform: 'all', helper: 'Create temporary social leads.' },
  { key: 'one-click-convert-to-lead', href: '/social-media/one-click-convert-to-lead', title: 'One-Click Convert to Lead', zh: '一键转为线索', tab: 'messages', platform: 'all', helper: 'Convert social messages to leads.' },
  { key: 'media-library', href: '/social-media/media-library', title: 'Media Library', zh: '媒体库', tab: 'records', platform: 'all', helper: 'Manage social media asset metadata.' },
  { key: 'ai-social-content-studio', href: '/social-media/ai-social-content-studio', title: 'AI Social Content Studio', zh: 'AI 社媒内容工作室', tab: 'drafts', platform: 'all', helper: 'Generate platform-specific draft content.' },
  { key: 'multi-platform-preview-review', href: '/social-media/multi-platform-preview-review', title: 'Multi-Platform Preview Review', zh: '多平台并排模拟预览审核', tab: 'drafts', platform: 'all', helper: 'Review all platform previews side by side.' },
  { key: 'social-video-render-jobs', href: '/social-media/social-video-render-jobs', title: 'Social Video Render Jobs', zh: '社媒视频渲染任务', tab: 'drafts', platform: 'all', helper: 'Create and review video rendering queue jobs from approved source videos, reference videos and uploaded clips. This is a queue foundation, not automatic publishing.' },
  { key: 'facebook-preview', href: '/social-media/facebook-preview', title: 'Facebook Preview', zh: 'Facebook 预览', tab: 'drafts', platform: 'facebook', helper: 'Preview Facebook drafts.' },
  { key: 'instagram-preview', href: '/social-media/instagram-preview', title: 'Instagram Preview', zh: 'Instagram 预览', tab: 'drafts', platform: 'instagram', helper: 'Preview Instagram drafts.' },
  { key: 'tiktok-preview', href: '/social-media/tiktok-preview', title: 'TikTok Preview', zh: 'TikTok 预览', tab: 'drafts', platform: 'tiktok', helper: 'Preview TikTok drafts.' },
  { key: 'youtube-shorts-preview', href: '/social-media/youtube-shorts-preview', title: 'YouTube Shorts Preview', zh: 'YouTube Shorts 预览', tab: 'drafts', platform: 'youtube_shorts', helper: 'Preview YouTube Shorts drafts.' },
  { key: 'xiaohongshu-preview', href: '/social-media/xiaohongshu-preview', title: 'Xiaohongshu Preview', zh: '小红书预览', tab: 'drafts', platform: 'xiaohongshu', helper: 'Preview Xiaohongshu drafts.' },
  { key: 'forum-preview', href: '/social-media/forum-preview', title: 'Forum Preview', zh: '论坛预览', tab: 'drafts', platform: 'forum', helper: 'Preview forum thread drafts.' },
  { key: 'google-business-profile-post-preview', href: '/social-media/google-business-profile-post-preview', title: 'Google Business Profile Post Preview', zh: 'Google 商家帖子预览', tab: 'drafts', platform: 'google_business_profile', helper: 'Preview Google Business Profile posts.' },
  { key: 'linkedin-preview', href: '/social-media/linkedin-preview', title: 'LinkedIn Preview', zh: 'LinkedIn 预览', tab: 'drafts', platform: 'linkedin', helper: 'Preview LinkedIn company updates.' },
  { key: 'x-twitter-preview', href: '/social-media/x-twitter-preview', title: 'X / Twitter Preview', zh: 'X / Twitter 预览', tab: 'drafts', platform: 'x_twitter', helper: 'Preview short public update, complaint-monitoring response or thread drafts.' },
  { key: 'carousell-services-preview', href: '/social-media/carousell-services-preview', title: 'Carousell Services Preview', zh: 'Carousell 服务预览', tab: 'drafts', platform: 'carousell_services', helper: 'Preview local service listing drafts with service area, before/after images and WhatsApp CTA.' },
  { key: 'seedly-community-preview', href: '/social-media/seedly-community-preview', title: 'Seedly Community Preview', zh: 'Seedly 社区预览', tab: 'drafts', platform: 'seedly_community', helper: 'Preview helpful community answer drafts for repair cost and home maintenance discussions.' },
  { key: 'whatsapp-channel-preview', href: '/social-media/whatsapp-channel-preview', title: 'WhatsApp Channel Preview', zh: 'WhatsApp 频道预览', tab: 'drafts', platform: 'whatsapp_channel', helper: 'Preview WhatsApp Channel drafts.' },
  { key: 'telegram-channel-preview', href: '/social-media/telegram-channel-preview', title: 'Telegram Channel Preview', zh: 'Telegram 频道预览', tab: 'drafts', platform: 'telegram_channel', helper: 'Preview Telegram Channel drafts.' },
  { key: 'website-blog-preview', href: '/social-media/website-blog-preview', title: 'Website Blog Preview', zh: '网站博客预览', tab: 'drafts', platform: 'website_blog', helper: 'Preview Website Blog drafts.' },
  { key: 'schedule-publish-approval', href: '/social-media/schedule-publish-approval', title: 'Schedule / Publish Approval', zh: '排期/发布审批', tab: 'versions', platform: 'all', helper: 'Approve and schedule publish snapshots.' },
  { key: 'social-logs', href: '/social-media/social-logs', title: 'Social Logs', zh: '社媒日志', tab: 'versions', platform: 'all', helper: 'Review social publish records and audit trail.' }
];

export function getSocialMediaSection(key: string | undefined) {
  return socialMediaSections.find((section) => section.key === key) || null;
}
