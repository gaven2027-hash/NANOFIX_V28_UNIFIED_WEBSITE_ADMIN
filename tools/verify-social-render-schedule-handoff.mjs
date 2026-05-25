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

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const api = read('app/api/admin/social-media/render-jobs/route.ts');
  const panel = read('components/SocialRenderedOutputReviewPanel.tsx');
  const workspace = read('components/SocialVideoRenderJobsWorkspace.tsx');
  const baseVerify = read('tools/verify-social-video-render-plan.mjs');

  const apiNeedles = [
    'create_rendered_output_schedule_snapshot',
    'hasApprovedRenderedOutput',
    "row.render_status === 'approved'",
    'renderer_contract_valid === true',
    "review?.status === 'approved'",
    'output_video_url',
    'output_storage_path',
    'Only approved rendered outputs with a valid renderer contract and output video reference can create schedule snapshots',
    'social_publish_versions',
    'approved_rendered_social_video_output',
    "status: 'scheduled'",
    'publish_requires_separate_admin_action: true',
    'schedule_snapshot_handoff',
    'create_social_video_render_schedule_snapshot',
    'ai_auto_publish_allowed: false',
    'admin_review_required: true'
  ];
  for (const needle of apiNeedles) {
    if (!api.includes(needle)) failures.push(`Render jobs API missing handoff guard: ${needle}`);
  }

  const panelNeedles = [
    'Create Schedule Snapshot',
    'create_rendered_output_schedule_snapshot',
    'canCreateScheduleSnapshot',
    "row?.render_status === 'approved'",
    'review?.status === \'approved\'',
    'renderer_contract_valid',
    'output_video_url',
    'output_storage_path',
    'schedule_snapshot_handoff',
    'This creates a scheduled snapshot only. It does not publish or call platform APIs.',
    'only after approved rendered output with valid renderer contract'
  ];
  for (const needle of panelNeedles) {
    if (!panel.includes(needle)) failures.push(`Rendered output review panel missing handoff control: ${needle}`);
  }

  if (!workspace.includes('SocialRenderedOutputReviewPanel')) failures.push('Render jobs workspace must render SocialRenderedOutputReviewPanel.');
  if (!baseVerify.includes('SocialRenderedOutputReviewPanel')) failures.push('Base render-plan verification must still check rendered output review panel.');
}

if (failures.length) {
  console.error('NANOFIX social rendered output schedule handoff verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX social rendered output schedule handoff verification passed.');
console.log('Checked approved-only rendered output schedule snapshot handoff, no auto-publish rule and admin review safeguards.');
