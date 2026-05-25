import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'lib/nanofix/socialVideoRenderPlan.ts',
  'app/api/admin/social-media/render-jobs/route.ts',
  'app/api/system/social-video-render-worker/route.ts',
  'components/SocialVideoRenderJobsWorkspace.tsx',
  'components/SocialMultiPlatformPreviewWorkspace.tsx',
  'supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const planner = read('lib/nanofix/socialVideoRenderPlan.ts');
  const api = read('app/api/admin/social-media/render-jobs/route.ts');
  const worker = read('app/api/system/social-video-render-worker/route.ts');
  const workspace = read('components/SocialVideoRenderJobsWorkspace.tsx');
  const previewWorkspace = read('components/SocialMultiPlatformPreviewWorkspace.tsx');
  const migration = read('supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql');

  const plannerNeedles = [
    'buildSocialVideoRenderPlan',
    'plan_version',
    'v28.1.3-render-plan-1',
    'plan_status',
    'ready_for_worker',
    'needs_material_review',
    'timeline',
    'reference_guidance',
    'usage_rule',
    'requires_final_human_approval',
    'ai_auto_publish_allowed: false',
    'admin_review_required: true',
    'source_video_urls',
    'reference_video_urls',
    'video_clip_urls'
  ];
  for (const needle of plannerNeedles) {
    if (!planner.includes(needle)) failures.push(`Render planner missing: ${needle}`);
  }

  const apiNeedles = [
    'buildSocialVideoRenderPlan',
    'generate_render_plan',
    'generate_social_video_render_plan',
    'output_json',
    'render_plan',
    'render_plan_generated_at',
    'ai_auto_publish_allowed: false',
    'admin_review_required: true'
  ];
  for (const needle of apiNeedles) {
    if (!api.includes(needle)) failures.push(`Render jobs API missing: ${needle}`);
  }

  const workerNeedles = [
    'CRON_SECRET',
    'NANOFIX_SYSTEM_WORKER_TOKEN',
    'NANOFIX_VIDEO_RENDERER_ENDPOINT',
    'NANOFIX_VIDEO_RENDERER_TOKEN',
    'render_status',
    'queued',
    'processing',
    'rendered',
    'failed',
    'missing_render_plan',
    'Worker marked this job failed instead of fake-rendering a video',
    'ai_auto_publish_allowed: false',
    'admin_review_required: true',
    'social_video_render_worker_started',
    'social_video_render_worker_failed',
    'social_video_render_worker_rendered'
  ];
  for (const needle of workerNeedles) {
    if (!worker.includes(needle)) failures.push(`Render worker missing: ${needle}`);
  }

  const workspaceNeedles = [
    'Generate Render Plan',
    'generateRenderPlan',
    'getRenderPlan',
    'warnings',
    'timeline',
    'plan_status',
    '/api/admin/social-media/render-jobs'
  ];
  for (const needle of workspaceNeedles) {
    if (!workspace.includes(needle)) failures.push(`Render jobs workspace missing: ${needle}`);
  }

  if (!previewWorkspace.includes('Create Video Render Job') || !previewWorkspace.includes('/api/admin/social-media/render-jobs')) {
    failures.push('Multi-platform preview workspace must create render jobs from selected drafts.');
  }

  for (const needle of ['social_video_render_jobs', 'material_pack', 'render_settings', 'output_json', 'admin_review_required', 'ai_auto_publish_allowed']) {
    if (!migration.includes(needle)) failures.push(`Render jobs migration missing: ${needle}`);
  }
}

if (failures.length) {
  console.error('NANOFIX social video render plan verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX social video render plan verification passed.');
console.log('Checked render plan builder, API action, internal worker, workspace controls, selected-draft handoff, queue schema and safety flags.');
