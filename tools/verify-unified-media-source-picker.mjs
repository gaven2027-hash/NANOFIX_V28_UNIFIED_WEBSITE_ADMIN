#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
function must(condition, label) { checks.push({ ok: Boolean(condition), label }); }

const migration = read('supabase/migrations/20260526010200_v28_1_3_unified_media_library.sql');
const api = read('app/api/admin/media-library/route.ts');
const picker = read('components/MediaSourcePicker.tsx');
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
must(pkg.includes('verify:media-source-picker'), 'package script includes verify:media-source-picker');
must(pkg.includes('verify:media-source-picker') && pkg.includes('validate:predeploy'), 'predeploy includes media source validation');

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
if (failed.length) {
  console.error(`\nUnified media source validation failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log('\nUnified media source picker validation passed.');
