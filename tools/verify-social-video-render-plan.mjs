import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'lib/nanofix/socialVideoRenderPlan.ts',
  'lib/nanofix/socialVideoRendererContract.ts',
  'app/api/admin/social-media/render-jobs/route.ts',
  'app/api/system/social-video-render-worker/route.ts',
  'components/SocialVideoRenderJobsWorkspace.tsx',
  'components/SocialRenderedOutputReviewPanel.tsx',
  'components/SocialMultiPlatformPreviewWorkspace.tsx',
  'docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_RENDERER_CONTRACT.md',
  'supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const planner = read('lib/nanofix/socialVideoRenderPlan.ts');
  const contract = read('lib/nanofix/socialVideoRendererContract.ts');
  const contractDoc = read('docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_RENDERER_CONTRACT.md');
  const api = read('app/api/admin/social-media/render-jobs/route.ts');
  const worker = read('app/api/system/social-video-render-worker/route.ts');
  const workspace = read('components/SocialVideoRenderJobsWorkspace.tsx');
  const reviewPanel = read('components/SocialRenderedOutputReviewPanel.tsx');
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

  const contractNeedles = [
    'validateSocialVideoRendererResult',
    'SocialVideoRendererResult',
    'renderer_name',
    'render_job_id',
    'output_video_url',
    'output_storage_path',
    'output_mime_type',
    'video/',
    'rendered_at',
    'admin_review_required: true',
    'ai_auto_publish_allowed: false',
    'renderer result failed',
    'socialVideoRendererContractExample'
  ];
  for (const needle of contractNeedles) {
    if (!contract.includes(needle)) failures.push(`Renderer contract missing: ${needle}`);
  }

  const contractDocNeedles = [
    'NANOFIX V28.1.3 Social Video Renderer Contract',
    'Required renderer success response',
    'output_video_url',
    'output_storage_path',
    'admin_review_required',
    'ai_auto_publish_allowed',
    'validation fails',
    'not marked as rendered'
  ];
  for (const needle of contractDocNeedles) {
    if (!contractDoc.includes(needle)) failures.push(`Renderer contract document missing: ${needle}`);
  }

  const apiNeedles = [
    'buildSocialVideoRenderPlan',
    'generate_render_plan',
    'generate_social_video_render_plan',
    'approve_rendered_output',
    'request_render_revision',
    'final_approve_social_video_rendered_output_before_schedule',
    'request_social_video_render_revision_before_schedule',
    'hasRenderableOutput',
    'hasFinalApprovedRenderedOutput',
    'renderer_contract_valid === true',
    'final_approval_completed_before_schedule',
    'publish_ready_after_schedule',
    'Only rendered jobs with a valid renderer contract and output video reference can be final-approved before scheduling',
    'Only final-approved rendered outputs with a valid renderer contract and output video reference can be scheduled',
    'final_approved_rendered_social_video_output',
    'final_approve_and_schedule_social_video_render',
    'platform_api_called: false',
    'output_json',
    'render_plan',
    'render_plan_generated_at',
    'rendered_output_review',
    'ai_auto_publish_allowed: false',
    'admin_review_required: true'
  ];
  for (const needle of apiNeedles) {
    if (!api.includes(needle)) failures.push(`Render jobs API missing: ${needle}`);
  }

  const workerNeedles = [
    'validateSocialVideoRendererResult',
    'v28.1.3-renderer-contract-1',
    'required_result_fields',
    'required_output_reference',
    'renderer_contract_valid',
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
    'SocialRenderedOutputReviewPanel',
    'Generate Render Plan',
    'generateRenderPlan',
    'getRenderPlan',
    'getRendererContractStatus',
    'warnings',
    'timeline',
    'plan_status',
    '/api/admin/social-media/render-jobs'
  ];
  for (const needle of workspaceNeedles) {
    if (!workspace.includes(needle)) failures.push(`Render jobs workspace missing: ${needle}`);
  }

  const reviewNeedles = [
    'Final Approval Before Scheduling',
    'Final Approve',
    'Final Approve & Schedule',
    'Request Revision',
    'approve_rendered_output',
    'request_render_revision',
    'create_rendered_output_schedule_snapshot',
    'final_approval_completed_before_schedule',
    'publish_ready_after_schedule',
    'renderer_contract_valid',
    'output_video_url',
    'output_storage_path',
    'Scheduling confirms the video has passed all required reviews and is publish-ready',
    'still does not auto-publish or call platform APIs'
  ];
  for (const needle of reviewNeedles) {
    if (!reviewPanel.includes(needle)) failures.push(`Rendered output review panel missing: ${needle}`);
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
console.log('Checked render plan builder, renderer contract, API action, pre-schedule final approval, publish-ready scheduling, internal worker, workspace controls, selected-draft handoff, queue schema and safety flags.');
