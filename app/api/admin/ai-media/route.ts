import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const linkColumns = 'link_id,asset_id,ai_module,object_type,object_id,reference_label,usage_context,ai_readiness_status,privacy_scope,ai_prompt_hint,ai_summary,extraction_json,tags,metadata_json,status,created_by,updated_by,created_at,updated_at,media_assets(asset_id,source_type,module_key,usage_context,title,alt_text,asset_url,storage_bucket,storage_path,original_filename,mime_type,size_bytes,status,created_at)';
const aiModules = ['general_ai','ai_analysis','material_suggestion','quotation_assistant','invoice_assistant','report_generator','risk_detection','seo_aeo_ai','social_ai','web_search_ai'];
const objectTypes = ['ai_context','lead','service_request','job','inspection','quotation','invoice','material','supplier','report','website_content','social_content','other'];
const usageContexts = ['ai_attachment','analysis_input','evidence_photo','inspection_video','material_reference','price_reference','quotation_reference','invoice_reference','report_source','seo_source','social_source','training_reference'];
const readinessStatuses = ['pending_review','approved_for_ai','blocked_for_ai','used_in_ai','archived'];
const privacyScopes = ['internal_only','customer_visible','engineer_visible','public_source','sensitive_restricted'];
const statuses = ['active','review_required','approved','rejected','archived','deleted'];

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function text(value: unknown, fallback = '', max = 3000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function oneOf(value: unknown, allowed: string[], fallback: string) { const raw = text(value, fallback, 120); return allowed.includes(raw) ? raw : fallback; }
function parseTags(value: unknown) { return Array.isArray(value) ? value.map((item) => text(item, '', 60)).filter(Boolean).slice(0, 30) : text(value, '', 1000).split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30); }
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
    ai_module: oneOf(body.ai_module, aiModules, 'general_ai'),
    object_type: oneOf(body.object_type, objectTypes, 'ai_context'),
    object_id: validUuid(body.object_id) ? body.object_id : null,
    reference_label: text(body.reference_label, '', 240) || null,
    usage_context: oneOf(body.usage_context, usageContexts, 'ai_attachment'),
    ai_readiness_status: oneOf(body.ai_readiness_status, readinessStatuses, 'pending_review'),
    privacy_scope: oneOf(body.privacy_scope, privacyScopes, 'internal_only'),
    ai_prompt_hint: text(body.ai_prompt_hint, '', 3000) || null,
    ai_summary: text(body.ai_summary, '', 3000) || null,
    extraction_json: safeJson(body.extraction_json, {}),
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
  let query = supabase.from('ai_media_links').select(linkColumns).order('created_at', { ascending: false }).limit(160);
  const aiModule = url.searchParams.get('ai_module');
  const objectType = url.searchParams.get('object_type');
  const readiness = url.searchParams.get('ai_readiness_status');
  const privacy = url.searchParams.get('privacy_scope');
  const status = url.searchParams.get('status') || 'active';
  if (aiModule && aiModules.includes(aiModule)) query = query.eq('ai_module', aiModule);
  if (objectType && objectTypes.includes(objectType)) query = query.eq('object_type', objectType);
  if (readiness && readinessStatuses.includes(readiness)) query = query.eq('ai_readiness_status', readiness);
  if (privacy && privacyScopes.includes(privacy)) query = query.eq('privacy_scope', privacy);
  if (status && status !== 'all' && statuses.includes(status)) query = query.eq('status', status);
  if (q) query = query.or(`reference_label.ilike.%${q}%,ai_prompt_hint.ilike.%${q}%,ai_summary.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, links: data || [], aiModules, objectTypes, usageContexts, readinessStatuses, privacyScopes, statuses });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const next = payload(body, context?.actorId);
  if (!next.asset_id) return jsonError('A valid asset_id is required.');
  const { data, error } = await supabase.from('ai_media_links').insert({ ...next, created_by: validUuid(context?.actorId) ? context?.actorId : null }).select(linkColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_ai_media_link', object_type: 'ai_media_link', object_id: data.link_id, after_data: data });
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
  const { data: before, error: beforeError } = await supabase.from('ai_media_links').select(linkColumns).eq('link_id', id).maybeSingle();
  if (beforeError) return jsonError(beforeError.message, 500);
  if (!before) return jsonError('AI media link not found.', 404);
  const next = payload(body, context?.actorId);
  delete (next as Payload).asset_id;
  const { data, error } = await supabase.from('ai_media_links').update(next).eq('link_id', id).select(linkColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_ai_media_link', object_type: 'ai_media_link', object_id: id, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, link: data });
}
