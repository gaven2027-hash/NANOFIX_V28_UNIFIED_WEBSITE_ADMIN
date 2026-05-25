import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'app/api/admin/social-media/render-jobs/route.ts',
  'components/SocialRenderedOutputReviewPanel.tsx',
  'components/SocialVideoRenderJobsWorkspace.tsx',
  'tools/verify-social-video-render-plan.mjs'
];

const forbiddenFiles = [
  'app/api/admin/social-media/publish-handoffs/route.ts',
  'supabase/migrations/20260526009200_v28_1_3_social_platform_publish_handoffs.sql'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}
for (const file of forbiddenFiles) {
  if (exists(file)) failures.push(`Forbidden post-schedule final approval file still exists: ${file}`);
}

if (!failures.length) {
  const api = read('app/api/admin/social-media/render-jobs/route.ts');
  const panel = read('components/SocialRenderedOutputReviewPanel.tsx');
  const workspace = read('components/SocialVideoRenderJobsWorkspace.tsx');
  const baseVerify = read('tools/verify-social-video-render-plan.mjs');

  const apiNeedles = [
    'create_rendered_output_schedule_snapshot',
    'hasFinalApprovedRenderedOutput',
    "row.render_status === 'approved'",
    'renderer_contract_valid === true',
    "review?.status === 'approved'",
    'review?.final_approval_completed === true',
    'output_video_url',
    'output_storage_path',
    'Only final-approved rendered outputs with a valid renderer contract and output video reference can be scheduled',
    'social_publish_versions',
    'final_approved_rendered_social_video_output',
    "status: 'scheduled'",
    'final_approval_completed_before_schedule: true',
    'publish_ready_after_schedule: true',
    'platform_api_called: false',
    'schedule_snapshot_handoff',
    'final_approve_and_schedule_social_video_render',
    'ai_auto_publish_allowed: false',
    'admin_review_required: true'
  ];
  for (const needle of apiNeedles) {
    if (!api.includes(needle)) failures.push(`Render jobs API missing final-before-schedule guard: ${needle}`);
  }

  const panelNeedles = [
    'Final Approval Before Scheduling',
    'Final Approve',
    'Final Approve & Schedule',
    'create_rendered_output_schedule_snapshot',
    'canCreateScheduleSnapshot',
    "row?.render_status === 'approved'",
    "review?.status === 'approved'",
    'review?.final_approval_completed === true',
    'final_approval_completed_before_schedule',
    'publish_ready_after_schedule',
    'renderer_contract_valid',
    'output_video_url',
    'output_storage_path',
    'Scheduling confirms the video has passed all required reviews and is publish-ready',
    'still does not auto-publish or call platform APIs'
  ];
  for (const needle of panelNeedles) {
    if (!panel.includes(needle)) failures.push(`Rendered output review panel missing pre-schedule final approval control: ${needle}`);
  }

  const forbiddenNeedles = [
    'publish_requires_separate_admin_action: true',
    'create_social_platform_publish_handoff',
    'pending_final_approval',
    'approved_for_manual_publish'
  ];
  for (const needle of forbiddenNeedles) {
    if (api.includes(needle) || panel.includes(needle)) failures.push(`Forbidden post-schedule approval concept still present: ${needle}`);
  }

  if (!workspace.includes('SocialRenderedOutputReviewPanel')) failures.push('Render jobs workspace must render SocialRenderedOutputReviewPanel.');
  if (!baseVerify.includes('Final Approval Before Scheduling')) failures.push('Base render-plan verification must check pre-schedule final approval.');
}

if (failures.length) {
  console.error('NANOFIX social final-approval-before-schedule verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX social final-approval-before-schedule verification passed.');
console.log('Checked final approval before scheduling, publish-ready scheduled snapshot, no post-schedule final approval queue, no auto-publish rule and admin review safeguards.');
