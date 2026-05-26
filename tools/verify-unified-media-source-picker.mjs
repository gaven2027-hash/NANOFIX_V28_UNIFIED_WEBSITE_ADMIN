#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
function must(condition, label) { checks.push({ ok: Boolean(condition), label }); }

const migration = read('supabase/migrations/20260526010200_v28_1_3_unified_media_library.sql');
const api = read('app/api/admin/media-library/route.ts');
const picker = read('components/MediaSourcePicker.tsx');
const website = read('components/WebsiteManagementWorkspace.tsx');
const social = read('components/SocialMediaManagementWorkspace.tsx');
const messages = read('components/SocialMessagesWorkspace.tsx');
const replyWorker = read('app/api/system/social-message-reply-dispatch-worker/route.ts');
const pkg = read('package.json');

must(migration.includes('create table if not exists public.media_assets'), 'media_assets table exists');
must(migration.includes('nanofix-media-library'), 'Supabase storage bucket is declared');
must(migration.includes("source_type in ('local_upload','url_import','library_selected','system_generated')"), 'source types cover local, URL, library, system');
must(migration.includes('media_assets_admin_all'), 'admin RLS policy exists for media assets');
must(api.includes("requireAdmin(request, 'write:content')"), 'media API requires admin write permission');
must(api.includes('multipart/form-data') && api.includes('supabase.storage.from(bucket).upload'), 'local computer upload route exists');
must(api.includes('create_url_asset') && api.includes('asset_url'), 'URL import route exists');
must(api.includes('select_library_asset'), 'media library selection route exists');
must(api.includes('auditLog'), 'media API writes audit logs');
must(picker.includes('Local Computer / 本地上传'), 'picker has local upload tab');
must(picker.includes('URL Link / 链接导入'), 'picker has URL import tab');
must(picker.includes('Media Library / 素材库'), 'picker has backend library tab');
must(picker.includes('Upload & Use / 上传并使用'), 'picker can upload and apply local files');
must(picker.includes('Import URL & Use / 导入链接并使用'), 'picker can import and apply URL assets');
must(picker.includes('selectLibrary'), 'picker can select backend library assets');
must(website.includes("import { MediaSourcePicker } from './MediaSourcePicker'"), 'website management imports media picker');
must(website.includes('Page SEO Media Source / 页面 SEO 素材来源'), 'website page SEO editor has media source picker');
must(website.includes('Block Visual Media Source / 区块视觉素材来源'), 'website block visual editor has media source picker');
must(website.includes('visual_output_url') && website.includes('visual_output_storage_path') && website.includes('same-position preview'), 'website media selection updates visual output and preview metadata');
must(social.includes("import { MediaSourcePicker } from './MediaSourcePicker'"), 'social media management imports media picker');
must(social.includes('Record Media Source / 记录素材来源'), 'social records/settings editor has media source picker');
must(social.includes('AI Draft Material Source / AI 草稿素材来源'), 'social AI draft editor has media source picker');
must(social.includes('selected_media_assets') && social.includes('source_references'), 'social media selection updates config JSON and source references');
must(messages.includes("import { MediaSourcePicker } from './MediaSourcePicker'"), 'messages inbox imports media picker');
must(messages.includes('Reply Attachment Source / 回复附件素材来源'), 'messages inbox reply editor has attachment picker');
must(messages.includes('reply_media_assets') && messages.includes('reply_has_media_assets'), 'messages inbox saves selected reply media assets');
must(messages.includes('Selected Reply Media / 已选择回复素材') && messages.includes('Remove'), 'messages inbox can display/remove selected reply media');
must(replyWorker.includes('reply_media_assets') && replyWorker.includes('reply_has_media_assets'), 'reply dispatch worker forwards media attachments');
must(replyWorker.includes('contract_version: \'v28.1.3-social-message-reply-dispatch-2\''), 'reply dispatch contract version includes attachment support');
must(pkg.includes('verify:media-source-picker'), 'package script includes verify:media-source-picker');
must(pkg.includes('verify:media-source-picker') && pkg.includes('validate:predeploy'), 'predeploy includes media source validation');

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
if (failed.length) {
  console.error(`\nUnified media source validation failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log('\nUnified media source picker validation passed.');
