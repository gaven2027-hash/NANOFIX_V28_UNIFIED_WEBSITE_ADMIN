import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const linkColumns = 'link_id,asset_id,object_type,object_id,reference_label,module_key,usage_context,upload_stage,visibility,description,tags,metadata_json,status,created_by,updated_by,created_at,updated_at,media_assets(asset_id,source_type,module_key,usage_context,title,alt_text,asset_url,storage_bucket,storage_path,original_filename,mime_type,size_bytes,status,created_at)';
const objectTypes = ['customer','lead','service_request','job','engineer_inspection','quotation','invoice','payment','warranty','material','supplier','other'];
const uploadStages = ['customer_before_submit','intake_review','engineer_before','engineer_during','engineer_after','quotation_support','invoice_support','warranty_proof','payment_proof','general'];
const visibilities = ['admin_internal','customer_visible','engineer_visible','public_approved'];
const statuses = ['active','review_required','approved','rejected','archived','deleted'];

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function text(value: unknown, fallback = '', max = 2000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function oneOf(value: unknown, allowed: string[], fallback: string) { const raw = text(value, fallback, 120); return allowed.includes(raw) ? raw : fallback; }
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
function cleanSearch(value: string | null) { return (value || '').replace(/[,%()]/g, ' ').trim().slice(0, 120); }
function payload(body: Payload, actorId?: string) {
  return {
    asset_id: validUuid(body.asset_id) ? body.asset_id : null,
    object_type: oneOf(body.object_type, objectTypes, 'other'),
    object_id: validUuid(body.object_id) ? body.object_id : null,
    reference_label: text(body.reference_label, '', 240) || null,
    module_key: text(body.module_key, 'field_operations', 120),
    usage_context: text(body.usage_context, 'field_attachment', 120),
    upload_stage: oneOf(body.upload_stage, uploadStages, 'general'),
    visibility: oneOf(body.visibility, visibilities, 'admin_internal'),
    description: text(body.description, '', 2000) || null,
    tags: parseTags(body.tags),
    metadata_json: safeJson(body.metadata_json, {}),
    status: oneOf(body.status, statuses, 'active'),
    updated_by: validUuid(actorId) ? actorId : null
  };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const url = new URL(request.url);
  const q = cleanSearch(url.searchParams.get('search'));
  const objectType = url.searchParams.get('object_type');
  const objectId = url.searchParams.get('object_id');
  const uploadStage = url.searchParams.get('upload_stage');
  const visibility = url.searchParams.get('visibility');
  const status = url.searchParams.get('status') || 'active';
  let query = supabase.from('field_media_links').select(linkColumns).order('created_at', { ascending: false }).limit(160);
  if (objectType && objectTypes.includes(objectType)) query = query.eq('object_type', objectType);
  if (validUuid(objectId)) query = query.eq('object_id', objectId);
  if (uploadStage && uploadStages.includes(uploadStage)) query = query.eq('upload_stage', uploadStage);
  if (visibility && visibilities.includes(visibility)) query = query.eq('visibility', visibility);
  if (status && status !== 'all' && statuses.includes(status)) query = query.eq('status', status);
  if (q) query = query.or(`reference_label.ilike.%${q}%,description.ilike.%${q}%,module_key.ilike.%${q}%,usage_context.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, links: data || [], objectTypes, uploadStages, visibilities, statuses });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const next = payload(body, context?.actorId);
  if (!next.asset_id) return jsonError('A valid asset_id is required.');
  const { data, error } = await supabase.from('field_media_links').insert({ ...next, created_by: validUuid(context?.actorId) ? context?.actorId : null }).select(linkColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_field_media_link', object_type: 'field_media_link', object_id: data.link_id, after_data: data });
  return NextResponse.json({ ok: true, link: data });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const id = String(body.link_id || '');
  if (!validUuid(id)) return jsonError('A valid link_id is required.');
  const { data: before, error: beforeError } = await supabase.from('field_media_links').select(linkColumns).eq('link_id', id).maybeSingle();
  if (beforeError) return jsonError(beforeError.message, 500);
  if (!before) return jsonError('Field media link not found.', 404);
  const next = payload(body, context?.actorId);
  delete (next as Payload).asset_id;
  const { data, error } = await supabase.from('field_media_links').update(next).eq('link_id', id).select(linkColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_field_media_link', object_type: 'field_media_link', object_id: id, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, link: data });
}
