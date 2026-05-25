import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'components/SocialMultiPlatformPreviewBoard.tsx',
  'components/SocialMultiPlatformPreviewWorkspace.tsx',
  'components/SocialExpandedAccountsBindingWorkspace.tsx',
  'app/social-media/[section]/page.tsx',
  'app/api/admin/social-media/route.ts',
  'app/api/admin/social-accounts/route.ts',
  'lib/nanofix/socialMediaConfig.ts'
];

const requiredPlatforms = [
  'facebook',
  'tiktok',
  'youtube_shorts',
  'instagram',
  'xiaohongshu',
  'forum',
  'google_business_profile',
  'linkedin',
  'whatsapp_channel',
  'telegram_channel',
  'website_blog'
];

const requiredPreviewLabels = [
  'FB Preview',
  'TikTok Preview',
  'YouTube Shorts Preview',
  'Instagram Preview',
  'Xiaohongshu Preview',
  'Forum Preview',
  'Google Business Profile Preview',
  'LinkedIn Preview',
  'WhatsApp Channel Preview',
  'Telegram Channel Preview',
  'Website Blog Preview'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const board = read('components/SocialMultiPlatformPreviewBoard.tsx');
  const workspace = read('components/SocialMultiPlatformPreviewWorkspace.tsx');
  const accountWorkspace = read('components/SocialExpandedAccountsBindingWorkspace.tsx');
  const page = read('app/social-media/[section]/page.tsx');
  const socialApi = read('app/api/admin/social-media/route.ts');
  const accountsApi = read('app/api/admin/social-accounts/route.ts');
  const config = read('lib/nanofix/socialMediaConfig.ts');

  if (!board.includes('SOCIAL_PREVIEW_PLATFORMS')) failures.push('SOCIAL_PREVIEW_PLATFORMS registry is missing.');
  if (!workspace.includes('SocialMultiPlatformPreviewBoard')) failures.push('SocialMultiPlatformPreviewWorkspace does not render preview board.');
  if (!page.includes('SocialMultiPlatformPreviewWorkspace') || !page.includes("section.key === 'multi-platform-preview-review'")) {
    failures.push('multi-platform-preview-review route is not wired to the dedicated workspace.');
  }
  if (!page.includes('SocialExpandedAccountsBindingWorkspace') || page.includes('SocialAccountsBindingWorkspace')) {
    failures.push('social-accounts route must use SocialExpandedAccountsBindingWorkspace and not the old binding workspace.');
  }
  if (!socialApi.includes('create_multi_platform_drafts')) failures.push('social-media API is missing create_multi_platform_drafts action.');
  if (!socialApi.includes('ai_auto_publish_allowed: false') || !socialApi.includes('admin_review_required: true')) {
    failures.push('multi-platform draft generation must preserve AI draft-only and admin review safety flags.');
  }

  for (const platform of requiredPlatforms) {
    if (!board.includes(platform)) failures.push(`Preview board missing platform: ${platform}`);
    if (!socialApi.includes(platform)) failures.push(`social-media API missing platform: ${platform}`);
    if (!accountsApi.includes(platform)) failures.push(`social-accounts API missing binding platform: ${platform}`);
    if (!accountWorkspace.includes(platform)) failures.push(`expanded account binding workspace missing platform: ${platform}`);
  }

  for (const label of requiredPreviewLabels) {
    if (!board.includes(label)) failures.push(`Preview board missing label: ${label}`);
  }

  const requiredConfigKeys = [
    'forum-preview',
    'linkedin-preview',
    'whatsapp-channel-preview',
    'telegram-channel-preview',
    'website-blog-preview'
  ];
  for (const key of requiredConfigKeys) {
    if (!config.includes(key)) failures.push(`socialMediaConfig missing section key: ${key}`);
  }
}

if (failures.length) {
  console.error('NANOFIX social multi-platform preview verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX social multi-platform preview verification passed.');
console.log('Checked preview windows, route wiring, API draft generation, account binding platforms and AI draft-only safety flags.');
