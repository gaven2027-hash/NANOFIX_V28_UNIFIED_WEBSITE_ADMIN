import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'lib/nanofix/socialVideoRendererProviders.ts',
  'app/api/admin/social-media/render-jobs/route.ts',
  'app/api/system/social-video-render-worker/route.ts',
  'components/SocialVideoRenderJobsWorkspace.tsx',
  'supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const registry = read('lib/nanofix/socialVideoRendererProviders.ts');
  const api = read('app/api/admin/social-media/render-jobs/route.ts');
  const worker = read('app/api/system/social-video-render-worker/route.ts');
  const workspace = read('components/SocialVideoRenderJobsWorkspace.tsx');
  const migration = read('supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql');

  const providers = [
    'nanofix_internal_remotion_ffmpeg',
    'creatomate_api',
    'runway_api',
    'custom_webhook_renderer',
    'manual_final_video_upload'
  ];
  for (const provider of providers) {
    if (!registry.includes(provider)) failures.push(`Renderer provider registry missing provider: ${provider}`);
    if (!migration.includes(provider)) failures.push(`Render job migration missing provider check: ${provider}`);
  }

  const registryNeedles = [
    'SOCIAL_VIDEO_RENDERER_PROVIDERS',
    'DEFAULT_SOCIAL_VIDEO_RENDERER_PROVIDER',
    'rendererProviderOptionsForClient',
    'getRendererEndpointForProvider',
    'display_label',
    'display_label_zh',
    'short_note',
    'short_note_zh',
    '适合自动化品牌视频生成',
    '适合模板化批量视频和广告',
    '适合 AI 创意片段和视觉延展',
    '适合自定义自动化接口或第三方封装',
    '适合自己用剪映/Canva/外包剪辑后上传',
    'NANOFIX_INTERNAL_VIDEO_RENDERER_ENDPOINT',
    'NANOFIX_CREATOMATE_RENDERER_ENDPOINT',
    'NANOFIX_RUNWAY_RENDERER_ENDPOINT',
    'NANOFIX_CUSTOM_VIDEO_RENDERER_ENDPOINT'
  ];
  for (const needle of registryNeedles) {
    if (!registry.includes(needle)) failures.push(`Renderer provider registry missing: ${needle}`);
  }

  const migrationNeedles = [
    'renderer_provider',
    'renderer_template_id',
    'renderer_model',
    'renderer_endpoint_key',
    'renderer_cost_estimate',
    'social_video_render_jobs_renderer_provider_check',
    'social_video_render_jobs_renderer_provider_idx'
  ];
  for (const needle of migrationNeedles) {
    if (!migration.includes(needle)) failures.push(`Render job migration missing renderer provider field/index: ${needle}`);
  }

  const apiNeedles = [
    'getSocialVideoRendererProvider',
    'normaliseRendererProvider',
    'rendererProviderOptionsForClient',
    'renderer_provider',
    'renderer_template_id',
    'renderer_model',
    'renderer_endpoint_key',
    'renderer_cost_estimate',
    'renderer_provider_note',
    'renderer_provider_note_zh',
    'rendererProviders',
    'providerSummary',
    'render_settings',
    'schedule_snapshot_handoff'
  ];
  for (const needle of apiNeedles) {
    if (!api.includes(needle)) failures.push(`Render jobs API missing renderer provider support: ${needle}`);
  }

  const workerNeedles = [
    'getRendererEndpointForProvider',
    'renderer_provider',
    'renderer_provider_note',
    'renderer_provider_note_zh',
    'manual_final_video_upload',
    'Worker must not call an external renderer',
    'NANOFIX_INTERNAL_VIDEO_RENDERER_ENDPOINT',
    'NANOFIX_CREATOMATE_RENDERER_ENDPOINT',
    'NANOFIX_RUNWAY_RENDERER_ENDPOINT',
    'NANOFIX_CUSTOM_VIDEO_RENDERER_ENDPOINT',
    'fake-rendering a video'
  ];
  for (const needle of workerNeedles) {
    if (!worker.includes(needle)) failures.push(`Render worker missing provider routing support: ${needle}`);
  }

  const uiNeedles = [
    'rendererProviderOptionsForClient',
    'Video Editor / Renderer Platform',
    '视频编辑平台',
    'display_label_zh',
    'short_note_zh',
    '适合自动化品牌视频生成',
    'renderer_template_id',
    'renderer_model',
    'renderer_endpoint_key',
    'renderer_cost_estimate',
    'Manual Final Video Upload is for self-editing',
    '人工上传最终视频适合自己用剪映、Canva 或外包剪辑',
    "provider.key === 'manual_final_video_upload'"
  ];
  for (const needle of uiNeedles) {
    if (!workspace.includes(needle)) failures.push(`Render jobs UI missing provider selection support: ${needle}`);
  }
}

if (failures.length) {
  console.error('NANOFIX social video renderer provider selection verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX social video renderer provider selection verification passed.');
console.log('Checked provider registry, ordered provider notes, database fields, render API persistence, worker routing, manual upload guard and admin UI selection.');
