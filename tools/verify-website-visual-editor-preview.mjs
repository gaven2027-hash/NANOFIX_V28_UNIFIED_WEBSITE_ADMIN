import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'lib/nanofix/websiteVisualEditorProviders.ts',
  'supabase/migrations/20260526009300_v28_1_3_website_visual_editor_fields.sql',
  'app/api/admin/website-management/route.ts',
  'components/WebsiteManagementWorkspace.tsx',
  'components/WebsiteSamePositionPreviewPanel.tsx'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const registry = read('lib/nanofix/websiteVisualEditorProviders.ts');
  const migration = read('supabase/migrations/20260526009300_v28_1_3_website_visual_editor_fields.sql');
  const api = read('app/api/admin/website-management/route.ts');
  const workspace = read('components/WebsiteManagementWorkspace.tsx');
  const preview = read('components/WebsiteSamePositionPreviewPanel.tsx');

  const providers = [
    'nanofix_internal_visual_gif_editor',
    'canva_brand_template_editor',
    'adobe_firefly_express',
    'creatomate_visual_gif_api',
    'runway_image_gif_assist',
    'custom_visual_webhook_editor',
    'manual_final_asset_upload'
  ];

  for (const provider of providers) {
    if (!registry.includes(provider)) failures.push(`Visual editor registry missing provider: ${provider}`);
    if (!migration.includes(provider)) failures.push(`Visual editor migration missing provider constraint: ${provider}`);
  }

  const registryNeedles = [
    'WEBSITE_VISUAL_EDITOR_PROVIDERS',
    'DEFAULT_WEBSITE_VISUAL_EDITOR_PROVIDER',
    'websiteVisualEditorOptionsForClient',
    'display_label_zh',
    'short_note_zh',
    '适合自动化官网图文和 GIF 生成',
    '适合自己编辑、品牌模板和排版优化',
    '适合高质量 AI 图片和商业安全视觉风格',
    '适合模板化批量图文和 GIF',
    '适合 AI 动图创意和视觉延展',
    '适合自定义自动化接口或第三方封装',
    '适合自己编辑好图片/GIF 后上传',
    'NANOFIX_INTERNAL_WEBSITE_VISUAL_EDITOR_ENDPOINT',
    'NANOFIX_ADOBE_WEBSITE_VISUAL_EDITOR_ENDPOINT',
    'NANOFIX_CREATOMATE_WEBSITE_VISUAL_EDITOR_ENDPOINT',
    'NANOFIX_RUNWAY_WEBSITE_VISUAL_EDITOR_ENDPOINT',
    'NANOFIX_CUSTOM_WEBSITE_VISUAL_EDITOR_ENDPOINT'
  ];
  for (const needle of registryNeedles) {
    if (!registry.includes(needle)) failures.push(`Visual editor registry missing: ${needle}`);
  }

  const migrationNeedles = [
    'visual_editor_provider',
    'visual_asset_type',
    'visual_editor_status',
    'visual_prompt',
    'visual_template_id',
    'visual_model',
    'visual_output_url',
    'visual_output_storage_path',
    'visual_alt_text',
    'visual_preview_json',
    'visual_cost_estimate',
    'website_content_blocks_visual_editor_provider_check',
    'website_content_blocks_visual_editor_provider_idx',
    'website_content_blocks_visual_editor_status_idx',
    'website_content_blocks_visual_asset_type_idx'
  ];
  for (const needle of migrationNeedles) {
    if (!migration.includes(needle)) failures.push(`Visual editor migration missing field/index/check: ${needle}`);
  }

  const apiNeedles = [
    'websiteVisualEditorOptionsForClient',
    'getWebsiteVisualEditorProvider',
    'normaliseWebsiteVisualEditorProvider',
    'visualProviderSummary',
    'buildSamePositionPreview',
    'visual_editor_provider',
    'visual_asset_type',
    'visual_editor_status',
    'visual_prompt',
    'visual_template_id',
    'visual_model',
    'visual_output_url',
    'visual_output_storage_path',
    'visual_alt_text',
    'visual_preview_json',
    'same_position_preview_required',
    'website_same_position_previews',
    'final_approval_completed_before_schedule',
    'publish_ready_after_schedule',
    'ai_auto_publish_allowed: false',
    'publish_after_pre_publish_review'
  ];
  for (const needle of apiNeedles) {
    if (!api.includes(needle)) failures.push(`Website management API missing visual editor/preview support: ${needle}`);
  }

  const uiNeedles = [
    'WebsiteSamePositionPreviewPanel',
    'websiteVisualEditorOptionsForClient',
    'AI Image/GIF Editor / AI图文/GIF编辑平台',
    'display_label_zh',
    'Visual Asset Type / 素材类型',
    'Visual Editor Status / 编辑状态',
    'Visual Prompt / AI 图文/GIF 指令',
    'Visual Output URL / 输出图片/GIF URL',
    'Same-Position Preview JSON / 同位置预览 JSON',
    '人工上传最终图片/GIF 适合自己编辑好后上传',
    'visual_output_url',
    'visual_output_storage_path',
    'visual_preview_json'
  ];
  for (const needle of uiNeedles) {
    if (!workspace.includes(needle)) failures.push(`Website management UI missing visual editor/preview support: ${needle}`);
  }

  const previewNeedles = [
    'WebsiteSamePositionPreviewPanel',
    'Same-position preview',
    'DeviceMode',
    "'desktop' | 'tablet' | 'mobile'",
    'DeviceSwitcher',
    'Desktop /',
    'Tablet /',
    'Mobile /',
    '1440px website width simulation',
    '768px tablet simulation',
    '390px mobile simulation',
    'max-w-[390px]',
    'max-w-3xl',
    'Card Grid',
    'CTA',
    'Hero',
    'Visual / GIF preview placeholder',
    'Preview before publish / 发布前预览',
    'object-cover',
    'Get a Free Quote'
  ];
  for (const needle of previewNeedles) {
    if (!preview.includes(needle)) failures.push(`Same-position responsive preview panel missing expected behavior: ${needle}`);
  }
}

if (failures.length) {
  console.error('NANOFIX website visual editor preview verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX website visual editor preview verification passed.');
console.log('Checked provider registry, CMS database fields, API persistence, publish snapshots, admin UI selector and responsive Desktop/Tablet/Mobile same-position preview panel.');
