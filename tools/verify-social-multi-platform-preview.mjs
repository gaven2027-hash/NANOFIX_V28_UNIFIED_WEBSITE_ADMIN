import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'components/SocialMultiPlatformPreviewBoard.tsx',
  'components/SocialMultiPlatformPreviewWorkspace.tsx',
  'components/SocialExpandedAccountsBindingWorkspace.tsx',
  'components/SocialMaterialPackBuilder.tsx',
  'components/SocialVideoRenderJobsWorkspace.tsx',
  'app/social-media/[section]/page.tsx',
  'app/api/admin/social-media/route.ts',
  'app/api/admin/social-media/material-upload/route.ts',
  'app/api/admin/social-media/render-jobs/route.ts',
  'app/api/admin/social-accounts/route.ts',
  'lib/nanofix/socialMediaConfig.ts',
  'supabase/migrations/20260526009000_v28_1_3_social_video_material_storage.sql',
  'supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql'
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
  'x_twitter',
  'carousell_services',
  'seedly_community',
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
  'X / Twitter Preview',
  'Carousell Services Preview',
  'Seedly Community Preview',
  'WhatsApp Channel Preview',
  'Telegram Channel Preview',
  'Website Blog Preview'
];

const requiredMaterialFields = [
  'script_keywords',
  'source_video_urls',
  'reference_video_urls',
  'video_clip_urls',
  'cover_image_url',
  'image_urls',
  'reference_notes',
  'uploaded_materials'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const board = read('components/SocialMultiPlatformPreviewBoard.tsx');
  const workspace = read('components/SocialMultiPlatformPreviewWorkspace.tsx');
  const accountWorkspace = read('components/SocialExpandedAccountsBindingWorkspace.tsx');
  const materialBuilder = read('components/SocialMaterialPackBuilder.tsx');
  const renderWorkspace = read('components/SocialVideoRenderJobsWorkspace.tsx');
  const uploadApi = read('app/api/admin/social-media/material-upload/route.ts');
  const renderApi = read('app/api/admin/social-media/render-jobs/route.ts');
  const storageMigration = read('supabase/migrations/20260526009000_v28_1_3_social_video_material_storage.sql');
  const renderMigration = read('supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql');
  const page = read('app/social-media/[section]/page.tsx');
  const socialApi = read('app/api/admin/social-media/route.ts');
  const accountsApi = read('app/api/admin/social-accounts/route.ts');
  const config = read('lib/nanofix/socialMediaConfig.ts');

  if (!board.includes('SOCIAL_PREVIEW_PLATFORMS')) failures.push('SOCIAL_PREVIEW_PLATFORMS registry is missing.');
  if (!board.includes('SocialMaterialPackBuilder') || !board.includes('defaultSocialMaterialPack')) failures.push('Multi-platform preview board must render the structured material pack builder.');
  if (!workspace.includes('SocialMultiPlatformPreviewBoard')) failures.push('SocialMultiPlatformPreviewWorkspace does not render preview board.');
  if (!workspace.includes('Create Video Render Job') || !workspace.includes('/api/admin/social-media/render-jobs')) failures.push('Multi-platform workspace must create video render jobs from selected drafts.');
  if (!page.includes('SocialMultiPlatformPreviewWorkspace') || !page.includes("section.key === 'multi-platform-preview-review'")) failures.push('multi-platform-preview-review route is not wired to the dedicated workspace.');
  if (!page.includes('SocialVideoRenderJobsWorkspace') || !page.includes("section.key === 'social-video-render-jobs'")) failures.push('social-video-render-jobs route is not wired to the render jobs workspace.');
  if (!page.includes('SocialExpandedAccountsBindingWorkspace') || page.includes('SocialAccountsBindingWorkspace')) failures.push('social-accounts route must use SocialExpandedAccountsBindingWorkspace and not the old binding workspace.');
  if (!socialApi.includes('create_multi_platform_drafts')) failures.push('social-media API is missing create_multi_platform_drafts action.');
  if (!socialApi.includes('ai_auto_publish_allowed: false') || !socialApi.includes('admin_review_required: true')) failures.push('multi-platform draft generation must preserve AI draft-only and admin review safety flags.');

  for (const platform of requiredPlatforms) {
    if (!board.includes(platform)) failures.push(`Preview board missing platform: ${platform}`);
    if (!socialApi.includes(platform)) failures.push(`social-media API missing platform: ${platform}`);
    if (!accountsApi.includes(platform)) failures.push(`social-accounts API missing binding platform: ${platform}`);
    if (!accountWorkspace.includes(platform)) failures.push(`expanded account binding workspace missing platform: ${platform}`);
  }

  for (const label of requiredPreviewLabels) {
    if (!board.includes(label)) failures.push(`Preview board missing label: ${label}`);
  }

  for (const field of requiredMaterialFields) {
    if (!materialBuilder.includes(field)) failures.push(`Structured material builder missing field: ${field}`);
  }

  for (const uploadKind of ['source_video', 'reference_video', 'video_clip', 'cover_image', 'image']) {
    if (!materialBuilder.includes(uploadKind)) failures.push(`Structured material builder missing upload kind: ${uploadKind}`);
    if (!uploadApi.includes(uploadKind)) failures.push(`Material upload API missing upload kind: ${uploadKind}`);
  }

  if (!uploadApi.includes('nanofix-social-materials') || !storageMigration.includes('nanofix-social-materials')) failures.push('Private social material storage bucket is missing.');
  if (!uploadApi.includes('maxFileSize') || !uploadApi.includes('500 * 1024 * 1024')) failures.push('Material upload API must enforce 500MB max file size.');
  if (!uploadApi.includes('auditLog') || !uploadApi.includes('upload_social_material')) failures.push('Material upload API must write audit logs.');
  if (!storageMigration.includes('public = excluded.public') || !storageMigration.includes('false')) failures.push('Social material storage bucket must remain private.');

  if (!renderMigration.includes('create table if not exists public.social_video_render_jobs')) failures.push('social_video_render_jobs migration table is missing.');
  if (!renderMigration.includes('enable row level security')) failures.push('social_video_render_jobs RLS is missing.');
  if (!renderMigration.includes('social_video_render_jobs_admin_all')) failures.push('social_video_render_jobs admin policy is missing.');
  for (const renderNeedle of ['render_status', 'render_type', 'material_pack', 'render_settings', 'output_json', 'admin_review_required', 'ai_auto_publish_allowed']) {
    if (!renderMigration.includes(renderNeedle) || !renderApi.includes(renderNeedle) || !renderWorkspace.includes(renderNeedle)) failures.push(`Render job support missing: ${renderNeedle}`);
  }
  if (!renderApi.includes('create_social_video_render_job') || !renderApi.includes('update_social_video_render_job')) failures.push('Render jobs API must write create/update audit logs.');
  if (!renderApi.includes('ai_auto_publish_allowed: false') || !renderApi.includes('admin_review_required: true')) failures.push('Render jobs API must force AI auto-publish off and admin review on.');
  if (!renderWorkspace.includes('Social Video Render Jobs') || !renderWorkspace.includes('Queue / 加入队列') || !renderWorkspace.includes('Approve / 批准')) failures.push('Render jobs workspace must expose queue and approval controls.');

  const requiredConfigKeys = [
    'social-video-render-jobs',
    'forum-preview',
    'linkedin-preview',
    'x-twitter-preview',
    'carousell-services-preview',
    'seedly-community-preview',
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
console.log('Checked preview windows, structured source/reference video material inputs, upload API, private storage bucket, render job queue, route wiring, API draft generation, account binding platforms and AI draft-only safety flags.');
