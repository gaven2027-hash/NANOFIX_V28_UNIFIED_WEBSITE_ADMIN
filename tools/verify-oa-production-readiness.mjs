import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const requiredFiles = [
  'middleware.ts',
  'app/login/LoginShell.tsx',
  'app/login/LoginForm.tsx',
  'app/register/RegisterShell.tsx',
  'app/register/RegisterForm.tsx',
  'app/api/health/route.ts',
  'app/api/ready/route.ts',
  'app/api/admin/dashboard/route.ts',
  'app/api/admin/service-operations/route.ts',
  'app/api/admin/registration-requests/route.ts',
  'app/api/admin/social-accounts/route.ts',
  'app/api/admin/social-media/route.ts',
  'app/api/admin/social-media/material-upload/route.ts',
  'app/api/admin/social-media/render-jobs/route.ts',
  'app/api/admin/website-social-links/route.ts',
  'app/api/admin/backups/jobs/route.ts',
  'app/api/system/module-health-worker/route.ts',
  'app/api/system/social-video-render-worker/route.ts',
  'components/RegistrationReviewWorkspace.tsx',
  'components/ServiceOperationsWorkspace.tsx',
  'components/WebsiteManagementWorkspace.tsx',
  'components/SocialMediaManagementWorkspace.tsx',
  'components/SocialMultiPlatformPreviewBoard.tsx',
  'components/SocialMultiPlatformPreviewWorkspace.tsx',
  'components/SocialExpandedAccountsBindingWorkspace.tsx',
  'components/SocialMaterialPackBuilder.tsx',
  'components/SocialVideoRenderJobsWorkspace.tsx',
  'components/SystemSettingsWorkspace.tsx',
  'tools/verify-social-multi-platform-preview.mjs',
  'tools/verify-social-video-render-plan.mjs',
  'docs/V28_1_2_SECURITY_HARDENING_SUMMARY.md',
  'supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql',
  'supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql',
  'supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql',
  'supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql',
  'supabase/migrations/20260526008000_v28_1_2_oa_fk_performance_indexes.sql',
  'supabase/migrations/20260526008100_v28_1_2_oa_fk_performance_indexes_b.sql',
  'supabase/migrations/20260526009000_v28_1_3_social_video_material_storage.sql',
  'supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql'
];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing OA production required file: ${file}`);
}

if (!failures.length) {
  const middleware = read('middleware.ts');
  const pkg = JSON.parse(read('package.json'));
  const schemaBridge = read('supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql');
  const fieldRls = read('supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql');
  const securityDefiner = read('supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql');
  const coreRls = read('supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql');
  const moduleRls = read('supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql');
  const fkIndexes = read('supabase/migrations/20260526008000_v28_1_2_oa_fk_performance_indexes.sql');
  const fkIndexesB = read('supabase/migrations/20260526008100_v28_1_2_oa_fk_performance_indexes_b.sql');
  const storageMigration = read('supabase/migrations/20260526009000_v28_1_3_social_video_material_storage.sql');
  const renderMigration = read('supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql');
  const socialApi = read('app/api/admin/social-media/route.ts');
  const socialUploadApi = read('app/api/admin/social-media/material-upload/route.ts');
  const socialRenderApi = read('app/api/admin/social-media/render-jobs/route.ts');
  const socialRenderWorker = read('app/api/system/social-video-render-worker/route.ts');
  const socialAccountsApi = read('app/api/admin/social-accounts/route.ts');
  const socialPreviewBoard = read('components/SocialMultiPlatformPreviewBoard.tsx');
  const socialPreviewWorkspace = read('components/SocialMultiPlatformPreviewWorkspace.tsx');
  const socialAccountsWorkspace = read('components/SocialExpandedAccountsBindingWorkspace.tsx');
  const materialBuilder = read('components/SocialMaterialPackBuilder.tsx');
  const renderWorkspace = read('components/SocialVideoRenderJobsWorkspace.tsx');
  const socialConfig = read('lib/nanofix/socialMediaConfig.ts');
  const socialPage = read('app/social-media/[section]/page.tsx');
  const env = read('.env.example');
  const vercel = read('vercel.json');

  const mustContain = [
    [middleware, 'loginAliases', 'Middleware must support login aliases.'],
    [middleware, 'registerAliases', 'Middleware must support register aliases.'],
    [middleware, 'x-nanofix-auth-verified', 'Middleware must attach verified auth header.'],
    [middleware, 'headers.delete(key)', 'Middleware must strip spoofed role headers.'],
    [schemaBridge, 'transition_status_tx', 'Transactional status RPC is required.'],
    [schemaBridge, 'status_transition_logs', 'Status transition logs table is required.'],
    [fieldRls, 'job_assignments_engineer_own', 'Engineer assignment RLS is required.'],
    [fieldRls, 'customer_signatures_engineer_assigned', 'Customer signature field RLS is required.'],
    [securityDefiner, 'revoke execute on function public.handle_new_auth_user()', 'SECURITY DEFINER function hardening is required.'],
    [securityDefiner, 'with (security_invoker = true)', 'latest_module_health security_invoker is required.'],
    [coreRls, 'audit_logs_admin_select', 'Audit logs must be protected and readable by admins.'],
    [coreRls, 'payments_admin_all', 'Finance payment policy is required.'],
    [moduleRls, 'webhook_events_admin_select', 'Webhook event policy is required.'],
    [moduleRls, 'otp_verifications_admin_select', 'OTP log policy is required.'],
    [fkIndexes, 'job_assignments_job_id_idx', 'OA FK performance index batch A is required.'],
    [fkIndexes, 'service_requests_intake_id_idx', 'Service request FK index batch A is required.'],
    [fkIndexes, 'warranties_job_id_idx', 'Warranty FK index batch A is required.'],
    [fkIndexesB, 'bookings_service_request_id_fk_idx', 'Booking service request FK index batch B is required.'],
    [fkIndexesB, 'service_requests_customer_id_fk_idx', 'Service request customer FK index batch B is required.'],
    [fkIndexesB, 'quotations_service_request_id_fk_idx', 'Quotation service request FK index batch B is required.'],
    [fkIndexesB, 'warranties_customer_id_fk_idx', 'Warranty customer FK index batch B is required.'],
    [socialApi, 'create_multi_platform_drafts', 'Social API must support multi-platform draft generation.'],
    [socialApi, 'multiPlatformTargets', 'Social API must define multi-platform preview targets.'],
    [socialApi, 'x_twitter', 'Social API must support X / Twitter drafts.'],
    [socialApi, 'carousell_services', 'Social API must support Carousell Services drafts.'],
    [socialApi, 'seedly_community', 'Social API must support Seedly Community drafts.'],
    [socialApi, 'ai_auto_publish_allowed: false', 'Social API must keep AI auto publish disabled.'],
    [socialApi, 'admin_review_required: true', 'Social API must require admin review.'],
    [socialUploadApi, 'nanofix-social-materials', 'Social material upload API must use private material bucket.'],
    [socialUploadApi, 'source_video', 'Social material upload API must support source video upload.'],
    [socialUploadApi, 'reference_video', 'Social material upload API must support reference video upload.'],
    [socialUploadApi, 'video_clip', 'Social material upload API must support video clip upload.'],
    [socialUploadApi, '500 * 1024 * 1024', 'Social material upload API must enforce 500MB limit.'],
    [socialUploadApi, 'upload_social_material', 'Social material upload API must write upload audit log.'],
    [storageMigration, 'nanofix-social-materials', 'Social material storage migration must create material bucket.'],
    [storageMigration, 'false', 'Social material storage bucket must be private.'],
    [storageMigration, 'nanofix_social_materials_admin_read', 'Social material storage must have admin read policy.'],
    [storageMigration, 'nanofix_social_materials_admin_insert', 'Social material storage must have admin insert policy.'],
    [renderMigration, 'create table if not exists public.social_video_render_jobs', 'Render job queue table is required.'],
    [renderMigration, 'enable row level security', 'Render job RLS is required.'],
    [renderMigration, 'social_video_render_jobs_admin_all', 'Render job admin RLS policy is required.'],
    [socialRenderApi, 'create_social_video_render_job', 'Render job API create audit log is required.'],
    [socialRenderApi, 'update_social_video_render_job', 'Render job API update audit log is required.'],
    [socialRenderApi, 'generate_render_plan', 'Render job API render-plan action is required.'],
    [socialRenderApi, 'generate_social_video_render_plan', 'Render job API render-plan audit action is required.'],
    [socialRenderApi, 'ai_auto_publish_allowed: false', 'Render job API must force AI auto publish off.'],
    [socialRenderApi, 'admin_review_required: true', 'Render job API must force admin review on.'],
    [socialRenderWorker, 'CRON_SECRET', 'Render worker must require CRON_SECRET or worker token.'],
    [socialRenderWorker, 'NANOFIX_SYSTEM_WORKER_TOKEN', 'Render worker must support system worker token.'],
    [socialRenderWorker, 'NANOFIX_VIDEO_RENDERER_ENDPOINT', 'Render worker must call external renderer only when configured.'],
    [socialRenderWorker, 'Worker marked this job failed instead of fake-rendering a video', 'Render worker must not fake-render videos.'],
    [socialRenderWorker, 'missing_render_plan', 'Render worker must fail queued jobs without render plans.'],
    [socialRenderWorker, 'social_video_render_worker_started', 'Render worker must audit processing start.'],
    [socialRenderWorker, 'social_video_render_worker_failed', 'Render worker must audit render failure.'],
    [socialRenderWorker, 'social_video_render_worker_rendered', 'Render worker must audit rendered result.'],
    [socialRenderWorker, 'ai_auto_publish_allowed: false', 'Render worker must keep AI auto publish disabled.'],
    [socialRenderWorker, 'admin_review_required: true', 'Render worker must keep admin review required.'],
    [renderWorkspace, 'Social Video Render Jobs', 'Render jobs workspace is required.'],
    [renderWorkspace, 'Queue / 加入队列', 'Render jobs workspace must expose queue control.'],
    [renderWorkspace, 'Approve / 批准', 'Render jobs workspace must expose approval control.'],
    [renderWorkspace, 'Generate Render Plan', 'Render jobs workspace must expose render plan generation.'],
    [socialPreviewWorkspace, 'Create Video Render Job', 'Multi-platform preview must create video render jobs from drafts.'],
    [socialPreviewWorkspace, '/api/admin/social-media/render-jobs', 'Multi-platform preview must call render jobs API.'],
    [socialPage, 'SocialVideoRenderJobsWorkspace', 'Social video render jobs route must render dedicated workspace.'],
    [socialPage, "section.key === 'social-video-render-jobs'", 'Social video render jobs route key is required.'],
    [socialAccountsApi, 'x_twitter', 'Social account API must support X / Twitter binding.'],
    [socialAccountsApi, 'carousell_services', 'Social account API must support Carousell Services binding.'],
    [socialAccountsApi, 'seedly_community', 'Social account API must support Seedly Community binding.'],
    [socialAccountsApi, 'whatsapp_channel', 'Social account API must support WhatsApp Channel binding.'],
    [socialAccountsApi, 'telegram_channel', 'Social account API must support Telegram Channel binding.'],
    [socialAccountsApi, 'website_blog', 'Social account API must support Website Blog publishing handoff.'],
    [socialPreviewBoard, 'SOCIAL_PREVIEW_PLATFORMS', 'Social preview board registry is required.'],
    [socialPreviewBoard, 'SocialMaterialPackBuilder', 'Social preview board must render structured material builder.'],
    [socialPreviewBoard, 'defaultSocialMaterialPack', 'Social preview board must use structured default material pack.'],
    [materialBuilder, 'source_video_urls', 'Material builder must separate source videos.'],
    [materialBuilder, 'reference_video_urls', 'Material builder must separate reference videos.'],
    [materialBuilder, 'video_clip_urls', 'Material builder must support uploaded video clips.'],
    [materialBuilder, 'Upload Source Video', 'Material builder must show source video upload control.'],
    [materialBuilder, 'Upload Reference Video', 'Material builder must show reference video upload control.'],
    [materialBuilder, 'Upload Video Clip', 'Material builder must show video clip upload control.'],
    [materialBuilder, '/api/admin/social-media/material-upload', 'Material builder must call material upload API.'],
    [socialPreviewBoard, 'FB Preview', 'FB preview window is required.'],
    [socialPreviewBoard, 'TikTok Preview', 'TikTok preview window is required.'],
    [socialPreviewBoard, 'YouTube Shorts Preview', 'YouTube Shorts preview window is required.'],
    [socialPreviewBoard, 'Instagram Preview', 'Instagram preview window is required.'],
    [socialPreviewBoard, 'Xiaohongshu Preview', 'Xiaohongshu preview window is required.'],
    [socialPreviewBoard, 'Forum Preview', 'Forum preview window is required.'],
    [socialPreviewBoard, 'Google Business Profile Preview', 'Google Business Profile preview window is required.'],
    [socialPreviewBoard, 'LinkedIn Preview', 'LinkedIn preview window is required.'],
    [socialPreviewBoard, 'X / Twitter Preview', 'X / Twitter preview window is required.'],
    [socialPreviewBoard, 'Carousell Services Preview', 'Carousell Services preview window is required.'],
    [socialPreviewBoard, 'Seedly Community Preview', 'Seedly Community preview window is required.'],
    [socialPreviewBoard, 'WhatsApp Channel Preview', 'WhatsApp Channel preview window is required.'],
    [socialPreviewBoard, 'Telegram Channel Preview', 'Telegram Channel preview window is required.'],
    [socialPreviewBoard, 'Website Blog Preview', 'Website Blog preview window is required.'],
    [socialPreviewWorkspace, 'SocialMultiPlatformPreviewBoard', 'Social multi-platform preview workspace must render the board.'],
    [socialAccountsWorkspace, 'SocialExpandedAccountsBindingWorkspace', 'Expanded social account binding workspace is required.'],
    [socialConfig, 'social-video-render-jobs', 'Social video render jobs route config is required.'],
    [socialConfig, 'forum-preview', 'Forum preview route config is required.'],
    [socialConfig, 'linkedin-preview', 'LinkedIn preview route config is required.'],
    [socialConfig, 'x-twitter-preview', 'X / Twitter preview route config is required.'],
    [socialConfig, 'carousell-services-preview', 'Carousell Services preview route config is required.'],
    [socialConfig, 'seedly-community-preview', 'Seedly Community preview route config is required.'],
    [socialConfig, 'whatsapp-channel-preview', 'WhatsApp Channel preview route config is required.'],
    [socialConfig, 'telegram-channel-preview', 'Telegram Channel preview route config is required.'],
    [socialConfig, 'website-blog-preview', 'Website Blog preview route config is required.'],
    [env, 'SUPABASE_SERVICE_ROLE_KEY', '.env.example must document service role key.'],
    [env, 'NANOFIX_BACKUP_ENCRYPTION_KEY', '.env.example must document backup encryption key.'],
    [env, 'CRON_SECRET', '.env.example must document cron secret.'],
    [vercel, '/api/system/module-health-worker', 'Vercel cron health worker is required.']
  ];

  for (const [text, needle, message] of mustContain) {
    if (!text.includes(needle)) failures.push(message);
  }

  const requiredVerifyScripts = [
    'verify:auth-welcome',
    'verify:registration-review',
    'verify:social-accounts',
    'verify:social-video-render-plan',
    'verify:website-social-links',
    'verify:field-rls',
    'verify:security-definer',
    'verify:core-rls',
    'verify:module-rls',
    'verify:oa-readiness'
  ];
  for (const script of requiredVerifyScripts) {
    if (!pkg.scripts?.[script]) failures.push(`Missing npm script: ${script}`);
    if (!pkg.scripts?.['validate:predeploy']?.includes(`npm run ${script}`)) failures.push(`validate:predeploy must include ${script}`);
  }
}

if (failures.length) {
  console.error('NANOFIX OA production readiness verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX OA production readiness verification passed.');
console.log('Checked OA auth, RBAC, audit, workflow, RLS, backup, health, social, website CMS, registration review, structured source/reference video material uploads, social video render job queue, render plan generation, internal render worker, multi-platform preview and FK performance index readiness.');
