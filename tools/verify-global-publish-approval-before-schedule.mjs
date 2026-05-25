import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'docs/NANOFIX_V28_1_3_GLOBAL_PUBLISH_APPROVAL_BEFORE_SCHEDULE_MEMORY.md',
  'app/api/admin/social-media/route.ts',
  'app/api/admin/social-media/render-jobs/route.ts',
  'components/SocialRenderedOutputReviewPanel.tsx',
  'tools/verify-social-render-schedule-handoff.mjs'
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
  if (exists(file)) failures.push(`Forbidden post-schedule approval artifact exists: ${file}`);
}

if (!failures.length) {
  const memory = read('docs/NANOFIX_V28_1_3_GLOBAL_PUBLISH_APPROVAL_BEFORE_SCHEDULE_MEMORY.md');
  const socialApi = read('app/api/admin/social-media/route.ts');
  const renderApi = read('app/api/admin/social-media/render-jobs/route.ts');
  const reviewPanel = read('components/SocialRenderedOutputReviewPanel.tsx');
  const scheduleVerify = read('tools/verify-social-render-schedule-handoff.mjs');

  const memoryNeedles = [
    'Global Publishing Rule: Approval Before Scheduling',
    'draft → review/checks → final approval → schedule → wait for scheduled publishing',
    'draft → schedule → final approval → publish',
    'Scheduling is not an approval step',
    'final_approval_completed_before_schedule: true',
    'publish_ready_after_schedule: true',
    'post-schedule final approval',
    'must not be reintroduced',
    'future platform publisher',
    'must not introduce another final approval stage'
  ];
  for (const needle of memoryNeedles) {
    if (!memory.includes(needle)) failures.push(`Global publishing memory missing: ${needle}`);
  }

  const socialNeedles = [
    'requiresFinalApprovalBeforeSchedule',
    'finalApprovalReadySnapshot',
    'normalizedPublishSnapshot',
    'final_approval_completed_before_schedule',
    'publish_ready_after_schedule',
    'Scheduling/publishing requires final_approval_completed_before_schedule=true before creating the snapshot',
    'publish_snapshot_after_pre_schedule_final_approval',
    'ai_auto_publish_allowed: false',
    'admin_review_required: true'
  ];
  for (const needle of socialNeedles) {
    if (!socialApi.includes(needle)) failures.push(`Generic social publish API missing approval-before-schedule guard: ${needle}`);
  }

  const renderNeedles = [
    'hasFinalApprovedRenderedOutput',
    'final_approval_completed_before_schedule',
    'publish_ready_after_schedule',
    'final_approved_rendered_social_video_output',
    'final_approve_and_schedule_social_video_render',
    'Only final-approved rendered outputs with a valid renderer contract and output video reference can be scheduled',
    'platform_api_called: false',
    'ai_auto_publish_allowed: false',
    'admin_review_required: true'
  ];
  for (const needle of renderNeedles) {
    if (!renderApi.includes(needle)) failures.push(`Rendered video schedule API missing approval-before-schedule guard: ${needle}`);
  }

  const uiNeedles = [
    'Final Approval Before Scheduling',
    'Final Approve & Schedule',
    'Scheduling confirms the video has passed all required reviews and is publish-ready',
    'still does not auto-publish or call platform APIs',
    'final_approval_completed_before_schedule',
    'publish_ready_after_schedule'
  ];
  for (const needle of uiNeedles) {
    if (!reviewPanel.includes(needle)) failures.push(`Rendered output review UI missing global publishing rule text/control: ${needle}`);
  }

  const verifyNeedles = [
    'Forbidden post-schedule final approval file still exists',
    'final approval before scheduling',
    'publish-ready scheduled snapshot',
    'no post-schedule final approval queue'
  ];
  for (const needle of verifyNeedles) {
    if (!scheduleVerify.includes(needle)) failures.push(`Schedule handoff verification missing global rule check: ${needle}`);
  }

  const forbiddenNeedles = [
    'create_social_platform_publish_handoff',
    'pending_final_approval',
    'approved_for_manual_publish',
    'social_platform_publish_handoffs'
  ];
  for (const needle of forbiddenNeedles) {
    if (socialApi.includes(needle) || renderApi.includes(needle) || reviewPanel.includes(needle)) {
      failures.push(`Forbidden post-schedule approval concept found in active code: ${needle}`);
    }
  }
}

if (failures.length) {
  console.error('NANOFIX global approval-before-scheduling verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX global approval-before-scheduling verification passed.');
console.log('Checked global rule memory, social snapshots, rendered video scheduling, UI copy, forbidden post-schedule approval artifacts and no auto-publish safeguards.');
