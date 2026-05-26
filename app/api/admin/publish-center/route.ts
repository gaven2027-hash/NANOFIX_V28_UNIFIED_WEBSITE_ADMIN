import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const columns = 'publish_item_id,module,source_type,source_id,title,platform,route_path,content_url,thumbnail_url,caption,final_asset_url,final_asset_storage_path,status,approval_status,final_publish_gate,snapshot_json,media_assets_json,media_source_summary,publish_package_json,scheduled_at,published_at,published_by,created_by,updated_by,error_message,ai_auto_publish_allowed,final_approval_completed_before_schedule,publish_ready_after_schedule,platform_api_called,created_at,updated_at';
const modules = ['website', 'social'];
const statuses = ['ready_to_publish','scheduled','publishing','published','failed','pushed_back_to_review','cancelled'];
const sourceTypes = ['ai_generated','manual_upload','external_editor','canva','capcut','premiere','mobile_upload','website_cms','social_rendered_video','media_library_package'];

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function cleanText(value: unknown, fallback = '', max = 4000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function safeJson(value: unknown, fallback: Payload = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value as Payload;
  if (typeof value === 'string') { try { return JSON.parse(value) as Payload; } catch { return fallback; } }
  return fallback;
}
function safeJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
  return [];
}
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function buildGate(body: Payload) {
  const gate = safeJson(body.final_publish_gate, {});
  const module = modules.includes(String(body.module)) ? String(body.module) : 'website';
  const base = module === 'website'
    ? { seo_ok: false, mobile_ok: false, cta_ok: false, alt_ok: false, broken_image_ok: false, cls_ok: false, media_package_ok: false }
    : { ratio_ok: false, thumbnail_ok: false, caption_ok: false, hashtag_ok: false, video_rendered_ok: false, account_connected_ok: false, media_package_ok: false };
  return { ...base, ...gate, ai_auto_publish_allowed: false, final_approval_required_before_schedule: true };
}
function gatePassed(gate: Payload) {
  const bools = Object.entries(gate).filter(([key, value]) => key.endsWith('_ok') && typeof value === 'boolean');
  return bools.length > 0 && bools.every(([, value]) => value === true);
}
function mediaSummary(mediaAssets: unknown[]) {
  if (!mediaAssets.length) return '';
  return mediaAssets.map((asset) => {
    const item = asset && typeof asset === 'object' ? asset as Payload : {};
    return cleanText(item.title || item.asset_url || item.storage_path || item.asset_id, 'media', 140);
  }).join(' | ').slice(0, 1500);
}
function buildPayload(body: Payload, actorId?: string) {
  const module = modules.includes(String(body.module)) ? String(body.module) : 'website';
  const status = statuses.includes(String(body.status)) ? String(body.status) : 'ready_to_publish';
  const sourceType = sourceTypes.includes(String(body.source_type)) ? String(body.source_type) : 'manual_upload';
  const mediaAssets = safeJsonArray(body.media_assets_json);
  const gate = buildGate({ ...body, module });
  const snapshot = safeJson(body.snapshot_json, {});
  const publishPackage = safeJson(body.publish_package_json, {});
  return {
    module,
    source_type: sourceType,
    source_id: validUuid(body.source_id) ? body.source_id : null,
    title: cleanText(body.title, 'NANOFIX publish item', 500),
    platform: cleanText(body.platform, module === 'website' ? 'website' : 'facebook', 120).toLowerCase().replace(/\s+/g, '_'),
    route_path: cleanText(body.route_path, '', 300) || null,
    content_url: cleanText(body.content_url, '', 2000) || null,
    thumbnail_url: cleanText(body.thumbnail_url, '', 2000) || null,
    caption: cleanText(body.caption, '', 5000) || null,
    final_asset_url: cleanText(body.final_asset_url, '', 2000) || null,
    final_asset_storage_path: cleanText(body.final_asset_storage_path, '', 2000) || null,
    status,
    approval_status: status === 'pushed_back_to_review' ? 'needs_review' : 'approved',
    final_publish_gate: gate,
    snapshot_json: { ...snapshot, media_assets_json: mediaAssets, media_assets_count: mediaAssets.length, media_source_summary: mediaSummary(mediaAssets), final_publish_gate_passed: gatePassed(gate), ai_auto_publish_allowed: false, final_approval_completed_before_schedule: true },
    media_assets_json: mediaAssets,
    media_source_summary: mediaSummary(mediaAssets),
    publish_package_json: { ...publishPackage, media_assets_json: mediaAssets, media_assets_count: mediaAssets.length, media_source_summary: mediaSummary(mediaAssets), media_source_picker_required: true, ai_auto_publish_allowed: false, admin_review_required: true },
    scheduled_at: cleanText(body.scheduled_at, '', 80) || null,
    published_at: cleanText(body.published_at, '', 80) || null,
    published_by: validUuid(body.published_by) ? body.published_by : null,
    created_by: validUuid(body.created_by) ? body.created_by : validUuid(actorId) ? actorId : null,
    updated_by: validUuid(actorId) ? actorId : null,
    error_message: cleanText(body.error_message, '', 2000) || null,
    ai_auto_publish_allowed: false,
    final_approval_completed_before_schedule: true,
    publish_ready_after_schedule: ['scheduled','published'].includes(status),
    platform_api_called: false
  };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content'); if (response) return response;
  const supabase = createSupabaseAdminClient(); if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const url = new URL(request.url);
  let query = supabase.from('publish_center_items').select(columns).order('updated_at', { ascending: false }).limit(120);
  const module = url.searchParams.get('module'); const status = url.searchParams.get('status');
  if (module && modules.includes(module)) query = query.eq('module', module);
  if (status && statuses.includes(status)) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, rows: data || [], modules, statuses, sourceTypes });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content'); if (response) return response;
  const supabase = createSupabaseAdminClient(); if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const body = await request.json().catch(() => ({})) as Payload;
  const payload = buildPayload(body, context?.actorId);
  const { data, error } = await supabase.from('publish_center_items').insert(payload).select(columns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_publish_center_item', object_type: 'publish_center_item', object_id: data.publish_item_id, after_data: data });
  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content'); if (response) return response;
  const supabase = createSupabaseAdminClient(); if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const body = await request.json().catch(() => ({})) as Payload;
  const id = cleanText(body.publish_item_id || body.id, '', 80);
  if (!validUuid(id)) return jsonError('A valid publish_item_id is required.');
  const { data: before, error: beforeError } = await supabase.from('publish_center_items').select(columns).eq('publish_item_id', id).maybeSingle();
  if (beforeError) return jsonError(beforeError.message, 500);
  if (!before) return jsonError('Publish item not found.', 404);
  const action = cleanText(body.action, 'update', 80);
  let patch: Payload = {};
  if (action === 'publish_now') {
    const gate = safeJson(before.final_publish_gate, {});
    if (!gatePassed(gate)) return jsonError('Final Publish Gate is not passed. Complete all required checks before publishing.', 409);
    patch = { status: 'published', published_at: new Date().toISOString(), published_by: validUuid(context?.actorId) ? context?.actorId : null, publish_ready_after_schedule: true, platform_api_called: false, ai_auto_publish_allowed: false };
  } else if (action === 'schedule_publish') {
    const scheduledAt = cleanText(body.scheduled_at, '', 80);
    if (!scheduledAt) return jsonError('scheduled_at is required.');
    const gate = safeJson(before.final_publish_gate, {});
    if (!gatePassed(gate)) return jsonError('Final Publish Gate is not passed. Complete all required checks before scheduling.', 409);
    patch = { status: 'scheduled', scheduled_at: scheduledAt, publish_ready_after_schedule: true, ai_auto_publish_allowed: false };
  } else if (action === 'push_back_to_review') {
    patch = { status: 'pushed_back_to_review', approval_status: 'needs_review', error_message: cleanText(body.reason, 'Pushed back to review.', 1000), publish_ready_after_schedule: false, ai_auto_publish_allowed: false };
  } else {
    patch = buildPayload({ ...before, ...body }, context?.actorId);
  }
  patch.updated_by = validUuid(context?.actorId) ? context?.actorId : null;
  const { data, error } = await supabase.from('publish_center_items').update(patch).eq('publish_item_id', id).select(columns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: `publish_center_${action}`, object_type: 'publish_center_item', object_id: id, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, row: data });
}
