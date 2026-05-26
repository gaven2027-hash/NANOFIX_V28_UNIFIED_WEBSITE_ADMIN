import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin, type AdminContext } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;
type FieldMediaRow = Payload & {
  object_type?: string;
  allowed_view_roles?: string[];
  allowed_use_roles?: string[];
  allowed_view_actor_ids?: string[];
  denied_view_actor_ids?: string[];
  allowed_use_actor_ids?: string[];
  denied_use_actor_ids?: string[];
  created_by?: string | null;
};

const linkColumns = 'link_id,asset_id,object_type,object_id,reference_label,module_key,usage_context,upload_stage,visibility,allowed_view_roles,allowed_use_roles,allowed_view_actor_ids,denied_view_actor_ids,allowed_use_actor_ids,denied_use_actor_ids,access_policy_json,description,tags,metadata_json,status,created_by,updated_by,created_at,updated_at,media_assets(asset_id,source_type,module_key,usage_context,title,alt_text,asset_url,storage_bucket,storage_path,original_filename,mime_type,size_bytes,status,created_at)';
const objectTypes = ['customer','lead','service_request','job','engineer_inspection','quotation','invoice','payment','warranty','material','supplier','other'];
const uploadStages = ['customer_before_submit','intake_review','engineer_before','engineer_during','engineer_after','quotation_support','invoice_support','warranty_proof','payment_proof','general'];
const visibilities = ['admin_internal','customer_visible','engineer_visible','public_approved'];
const statuses = ['active','review_required','approved','rejected','archived','deleted'];
const roleOptions = ['super_admin','operations_admin','finance','content_admin','support','engineer'];

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function text(value: unknown, fallback = '', max = 2000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function oneOf(value: unknown, allowed: string[], fallback: string) { const raw = text(value, fallback, 120); return allowed.includes(raw) ? raw : fallback; }
function roleList(value: unknown) {
  const raw = Array.isArray(value) ? value : text(value, '', 1000).split(',');
  return raw.map((item) => text(item, '', 60)).filter((item) => roleOptions.includes(item));
}
function uuidList(value: unknown) {
  const raw = Array.isArray(value) ? value : text(value, '', 2000).split(',');
  return raw.map((item) => text(item, '', 80)).filter(validUuid).slice(0, 200);
}
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

function defaultViewRoles(objectType: string) {
  if (['quotation','invoice','payment'].includes(objectType)) return ['super_admin','operations_admin','finance'];
  if (['customer','lead','service_request'].includes(objectType)) return ['super_admin','operations_admin','support'];
  if (['job','engineer_inspection','warranty'].includes(objectType)) return ['super_admin','operations_admin','support'];
  if (['material','supplier'].includes(objectType)) return ['super_admin','operations_admin','finance','content_admin'];
  return ['super_admin','operations_admin'];
}
function defaultUseRoles(objectType: string) {
  if (['quotation','invoice','payment'].includes(objectType)) return ['super_admin','operations_admin','finance'];
  if (['customer','lead','service_request'].includes(objectType)) return ['super_admin','operations_admin','support'];
  if (['job','engineer_inspection','warranty'].includes(objectType)) return ['super_admin','operations_admin'];
  if (['material','supplier'].includes(objectType)) return ['super_admin','operations_admin','finance','content_admin'];
  return ['super_admin','operations_admin'];
}
function canView(row: FieldMediaRow, context: AdminContext) {
  if (context.role === 'super_admin') return true;
  const ids = [context.actorId, context.authUserId].filter(Boolean) as string[];
  const denied = row.denied_view_actor_ids || [];
  if (ids.some((id) => denied.includes(id))) return false;
  const allowedPeople = row.allowed_view_actor_ids || [];
  if (ids.some((id) => allowedPeople.includes(id))) return true;
  const allowedRoles = (row.allowed_view_roles?.length ? row.allowed_view_roles : defaultViewRoles(String(row.object_type || 'other')));
  return allowedRoles.includes(context.role);
}
async function loadPeople(supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>) {
  const { data } = await supabase.from('profiles').select('auth_user_id,role,is_active,display_name,email').eq('is_active', true).in('role', roleOptions).order('role', { ascending: true }).limit(500);
  return (data || []).map((p: Payload) => ({
    actor_id: p.auth_user_id,
    role: p.role,
    label: p.display_name || p.email || p.auth_user_id,
    email: p.email || null,
    group_label: `${p.role} option / ${p.role} 选项`
  }));
}
function payload(body: Payload, actorId?: string) {
  const objectType = oneOf(body.object_type, objectTypes, 'other');
  const viewRoles = roleList(body.allowed_view_roles);
  const useRoles = roleList(body.allowed_use_roles);
  return {
    asset_id: validUuid(body.asset_id) ? body.asset_id : null,
    object_type: objectType,
    object_id: validUuid(body.object_id) ? body.object_id : null,
    reference_label: text(body.reference_label, '', 240) || null,
    module_key: text(body.module_key, 'field_operations', 120),
    usage_context: text(body.usage_context, 'field_attachment', 120),
    upload_stage: oneOf(body.upload_stage, uploadStages, 'general'),
    visibility: oneOf(body.visibility, visibilities, 'admin_internal'),
    allowed_view_roles: viewRoles.length ? viewRoles : defaultViewRoles(objectType),
    allowed_use_roles: useRoles.length ? useRoles : defaultUseRoles(objectType),
    allowed_view_actor_ids: uuidList(body.allowed_view_actor_ids),
    denied_view_actor_ids: uuidList(body.denied_view_actor_ids),
    allowed_use_actor_ids: uuidList(body.allowed_use_actor_ids),
    denied_use_actor_ids: uuidList(body.denied_use_actor_ids),
    access_policy_json: safeJson(body.access_policy_json, { role_and_person_acl: true }),
    description: text(body.description, '', 2000) || null,
    tags: parseTags(body.tags),
    metadata_json: safeJson(body.metadata_json, {}),
    status: oneOf(body.status, statuses, 'active'),
    updated_by: validUuid(actorId) ? actorId : null
  };
}

export async function GET(request: Request) {
  const { context, response } = requireAdmin(request, 'read:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase || !context) return jsonError('Supabase server client is not configured.', 503);
  const url = new URL(request.url);
  const q = cleanSearch(url.searchParams.get('search'));
  const objectType = url.searchParams.get('object_type');
  const objectId = url.searchParams.get('object_id');
  const uploadStage = url.searchParams.get('upload_stage');
  const visibility = url.searchParams.get('visibility');
  const status = url.searchParams.get('status') || 'active';
  let query = supabase.from('field_media_links').select(linkColumns).order('created_at', { ascending: false }).limit(240);
  if (objectType && objectTypes.includes(objectType)) query = query.eq('object_type', objectType);
  if (validUuid(objectId)) query = query.eq('object_id', objectId);
  if (uploadStage && uploadStages.includes(uploadStage)) query = query.eq('upload_stage', uploadStage);
  if (visibility && visibilities.includes(visibility)) query = query.eq('visibility', visibility);
  if (status && status !== 'all' && statuses.includes(status)) query = query.eq('status', status);
  if (q) query = query.or(`reference_label.ilike.%${q}%,description.ilike.%${q}%,module_key.ilike.%${q}%,usage_context.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  const people = await loadPeople(supabase);
  const links = ((data || []) as FieldMediaRow[]).filter((row) => canView(row, context)).slice(0, 160);
  return NextResponse.json({ ok: true, links, people, roleOptions, objectTypes, uploadStages, visibilities, statuses, accessFiltering: { role: context.role, actor_id: context.actorId, auth_user_id: context.authUserId || null, enforced: true } });
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
  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_field_media_link_access_control', object_type: 'field_media_link', object_id: id, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, link: data });
}
