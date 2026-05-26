import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const bucket = 'nanofix-media-library';
const assetColumns = 'asset_id,source_type,module_key,usage_context,title,alt_text,description,asset_url,storage_bucket,storage_path,original_filename,mime_type,size_bytes,width,height,duration_seconds,checksum,tags,metadata_json,status,created_by,updated_by,created_at,updated_at';
const allowedSourceTypes = ['local_upload','url_import','library_selected','system_generated'];
const allowedStatuses = ['draft','active','archived','blocked','deleted'];
const allowedMimePrefixes = ['image/','video/','application/pdf'];
const maxUploadBytes = 50 * 1024 * 1024;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function text(value: unknown, fallback = '', max = 2000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function cleanKey(value: unknown, fallback = 'general') { return text(value, fallback, 120).toLowerCase().replace(/[^a-z0-9_/-]/g, '_').replace(/_+/g, '_') || fallback; }
function safeSourceType(value: unknown) { const source = text(value, 'url_import', 40); return allowedSourceTypes.includes(source) ? source : 'url_import'; }
function safeStatus(value: unknown) { const status = text(value, 'active', 40); return allowedStatuses.includes(status) ? status : 'active'; }
function safeUrl(value: unknown) { const url = text(value, '', 2000); if (!url) return ''; return /^https?:\/\//i.test(url) ? url : ''; }
function parseTags(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item, '', 60)).filter(Boolean).slice(0, 30);
  return text(value, '', 1000).split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30);
}
function safeJson(value: unknown, fallback: Payload = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value as Payload;
  if (typeof value === 'string') { try { return JSON.parse(value) as Payload; } catch { return fallback; } }
  return fallback;
}
function guessExtension(filename: string, mime: string) {
  const fromName = filename.includes('.') ? filename.split('.').pop() || '' : '';
  if (fromName) return fromName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/webm') return 'webm';
  if (mime === 'application/pdf') return 'pdf';
  return 'bin';
}
function validMime(mime: string) { return allowedMimePrefixes.some((prefix) => mime.startsWith(prefix)); }

function baseAssetPayload(body: Payload, actorId?: string) {
  return {
    source_type: safeSourceType(body.source_type),
    module_key: cleanKey(body.module_key, 'general'),
    usage_context: cleanKey(body.usage_context, 'content_editor'),
    title: text(body.title, '', 240) || null,
    alt_text: text(body.alt_text, '', 500) || null,
    description: text(body.description, '', 2000) || null,
    tags: parseTags(body.tags),
    metadata_json: safeJson(body.metadata_json, {}),
    status: safeStatus(body.status),
    updated_by: validUuid(actorId) ? actorId : null,
    updated_at: new Date().toISOString()
  };
}

async function listAssets(request: Request) {
  const { response } = requireAdmin(request, 'read:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const url = new URL(request.url);
  const search = text(url.searchParams.get('search'), '', 120).replace(/[,%()]/g, ' ');
  const moduleKey = text(url.searchParams.get('module_key'), '', 120);
  const usage = text(url.searchParams.get('usage_context'), '', 120);
  const status = text(url.searchParams.get('status'), 'active', 40);
  let query = supabase.from('media_assets').select(assetColumns).order('created_at', { ascending: false }).limit(120);
  if (moduleKey) query = query.eq('module_key', cleanKey(moduleKey));
  if (usage) query = query.eq('usage_context', cleanKey(usage));
  if (status && status !== 'all') query = query.eq('status', safeStatus(status));
  if (search) query = query.or(`title.ilike.%${search}%,alt_text.ilike.%${search}%,description.ilike.%${search}%,asset_url.ilike.%${search}%,storage_path.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, assets: data || [] });
}

async function createUrlAsset(body: Payload, actorId?: string, actorRole?: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const assetUrl = safeUrl(body.asset_url || body.url);
  if (!assetUrl) return jsonError('A valid http(s) asset URL is required.');
  const payload = { ...baseAssetPayload({ ...body, source_type: 'url_import' }, actorId), asset_url: assetUrl, storage_bucket: bucket, storage_path: null, original_filename: text(body.original_filename, '', 240) || null, mime_type: text(body.mime_type, '', 120) || null, size_bytes: Number(body.size_bytes || 0) || null, created_by: validUuid(actorId) ? actorId : null, created_at: new Date().toISOString() };
  const { data, error } = await supabase.from('media_assets').insert(payload).select(assetColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: actorId, actor_role: actorRole, action: 'create_media_asset_url', object_type: 'media_asset', object_id: data.asset_id, after_data: data });
  return NextResponse.json({ ok: true, asset: data });
}

async function createLibrarySelection(body: Payload, actorId?: string, actorRole?: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const assetId = String(body.asset_id || body.selected_asset_id || '');
  if (!validUuid(assetId)) return jsonError('A valid selected asset_id is required.');
  const { data: source, error: sourceError } = await supabase.from('media_assets').select(assetColumns).eq('asset_id', assetId).maybeSingle();
  if (sourceError) return jsonError(sourceError.message, 500);
  if (!source) return jsonError('Selected media asset not found.', 404);
  const payload = { ...source, ...baseAssetPayload({ ...body, source_type: 'library_selected' }, actorId), asset_id: undefined, source_type: 'library_selected', metadata_json: { ...(safeJson(source.metadata_json, {})), ...(safeJson(body.metadata_json, {})), selected_from_asset_id: assetId }, created_by: validUuid(actorId) ? actorId : null, created_at: new Date().toISOString() };
  delete (payload as Payload).asset_id;
  const { data, error } = await supabase.from('media_assets').insert(payload).select(assetColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: actorId, actor_role: actorRole, action: 'select_media_asset_from_library', object_type: 'media_asset', object_id: data.asset_id, after_data: data });
  return NextResponse.json({ ok: true, asset: data });
}

async function createLocalUpload(request: Request, actorId?: string, actorRole?: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return jsonError('A file is required.');
  if (file.size > maxUploadBytes) return jsonError('File exceeds 50MB upload limit.', 413);
  if (!validMime(file.type)) return jsonError('Unsupported file type. Allowed: images, GIF, MP4/WebM video, PDF.', 415);
  const moduleKey = cleanKey(form.get('module_key'), 'general');
  const usage = cleanKey(form.get('usage_context'), 'content_editor');
  const extension = guessExtension(file.name, file.type);
  const storagePath = `${moduleKey}/${usage}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return jsonError(uploadError.message, 500);
  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const body: Payload = {
    source_type: 'local_upload',
    module_key: moduleKey,
    usage_context: usage,
    title: text(form.get('title'), file.name, 240),
    alt_text: text(form.get('alt_text'), '', 500),
    description: text(form.get('description'), '', 2000),
    tags: text(form.get('tags'), '', 1000),
    metadata_json: safeJson(text(form.get('metadata_json'), '{}', 8000), {}),
    status: 'active'
  };
  const payload = { ...baseAssetPayload(body, actorId), asset_url: publicUrlData.publicUrl, storage_bucket: bucket, storage_path: storagePath, original_filename: file.name, mime_type: file.type, size_bytes: file.size, created_by: validUuid(actorId) ? actorId : null, created_at: new Date().toISOString() };
  const { data, error } = await supabase.from('media_assets').insert(payload).select(assetColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: actorId, actor_role: actorRole, action: 'upload_media_asset_local', object_type: 'media_asset', object_id: data.asset_id, after_data: { ...data, file_size: file.size, mime_type: file.type } });
  return NextResponse.json({ ok: true, asset: data });
}

export async function GET(request: Request) { return listAssets(request); }

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) return createLocalUpload(request, context?.actorId, context?.role);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || 'create_url_asset');
  if (action === 'create_url_asset') return createUrlAsset(body, context?.actorId, context?.role);
  if (action === 'select_library_asset') return createLibrarySelection(body, context?.actorId, context?.role);
  return jsonError('Unsupported media library action.', 400);
}
