import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { getSocialMediaSection } from '@/lib/nanofix/socialMediaConfig';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const recordColumns = 'record_id,section_key,platform,title,body,config_json,status,created_by,updated_by,created_at,updated_at';
const messageColumns = 'message_id,lead_id,customer_id,channel,external_message_id,direction,body,risk_level,created_at';
const draftColumns = 'content_id,module,platform,title,body,prompt_version,model,source_references,approval_status,reviewer_id,created_at';
const versionColumns = 'version_id,content_id,record_id,platform,version_no,status,snapshot_json,scheduled_at,published_at,published_by,created_at';

const recordStatuses = ['draft', 'active', 'pending_review', 'approved', 'scheduled', 'published', 'archived', 'disabled'];
const draftStatuses = ['draft', 'pending_review', 'approved', 'rejected', 'published', 'scheduled'];
const versionStatuses = ['approved', 'scheduled', 'published', 'cancelled', 'failed'];
const messageDirections = ['inbound', 'outbound', 'internal_note'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 8000) : fallback;
}

function cleanSearch(value: string | null) {
  return (value || '').replace(/[,%()]/g, ' ').trim().slice(0, 120);
}

function safeJson(value: unknown, fallback: Payload | unknown[] = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function nullableUuid(value: unknown) {
  return validUuid(value) ? value : null;
}

function normalizePlatform(value: unknown, fallback = 'general') {
  return cleanText(value, fallback).toLowerCase().replace(/[^a-z0-9_ -]/g, '').replace(/\s+/g, '_').slice(0, 80) || fallback;
}

function buildRecordPayload(body: Payload, actorId?: string) {
  const section = getSocialMediaSection(cleanText(body.section_key));
  const status = recordStatuses.includes(String(body.status)) ? String(body.status) : 'draft';
  const payload: Payload = {
    section_key: section?.key || cleanText(body.section_key, 'social-accounts'),
    platform: normalizePlatform(body.platform, section?.platform || 'general'),
    title: cleanText(body.title, section?.title || 'Social Media Record'),
    body: cleanText(body.body),
    config_json: safeJson(body.config_json, {}),
    status
  };
  if (validUuid(actorId)) payload.updated_by = actorId;
  return payload;
}

function buildMessagePayload(body: Payload) {
  const direction = messageDirections.includes(String(body.direction)) ? String(body.direction) : 'inbound';
  return {
    lead_id: nullableUuid(body.lead_id),
    customer_id: nullableUuid(body.customer_id),
    channel: normalizePlatform(body.channel || body.platform, 'manual'),
    external_message_id: cleanText(body.external_message_id),
    direction,
    body: cleanText(body.body),
    risk_level: cleanText(body.risk_level, 'normal')
  };
}

function buildDraftPayload(body: Payload, actorId?: string) {
  const section = getSocialMediaSection(cleanText(body.section_key));
  const approvalStatus = draftStatuses.includes(String(body.approval_status)) ? String(body.approval_status) : 'draft';
  const payload: Payload = {
    module: 'social',
    platform: normalizePlatform(body.platform, section?.platform || 'all'),
    title: cleanText(body.title, section?.title || 'Social Draft'),
    body: cleanText(body.body),
    prompt_version: cleanText(body.prompt_version, section?.key || 'manual'),
    model: cleanText(body.model, 'manual'),
    source_references: safeJson(body.source_references, []),
    approval_status: approvalStatus
  };
  if (validUuid(actorId)) payload.reviewer_id = actorId;
  return payload;
}

async function listRecords(search: string | null, status: string | null, sectionKey: string | null, platform: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('social_management_records').select(recordColumns).order('updated_at', { ascending: false }).limit(120);
  if (sectionKey) query = query.eq('section_key', sectionKey);
  if (platform && platform !== 'all') query = query.eq('platform', platform);
  if (status && recordStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%,section_key.ilike.%${q}%,platform.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listMessages(search: string | null, sectionKey: string | null, platform: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  const section = getSocialMediaSection(sectionKey || undefined);
  let query = supabase.from('social_messages').select(messageColumns).order('created_at', { ascending: false }).limit(120);
  const channel = platform && platform !== 'all' ? platform : section?.platform && section.platform !== 'all' ? section.platform : '';
  if (channel) query = query.eq('channel', channel);
  const q = cleanSearch(search);
  if (q) query = query.or(`channel.ilike.%${q}%,body.ilike.%${q}%,risk_level.ilike.%${q}%,direction.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listDrafts(search: string | null, status: string | null, sectionKey: string | null, platform: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  const section = getSocialMediaSection(sectionKey || undefined);
  let query = supabase.from('content_drafts').select(draftColumns).eq('module', 'social').order('created_at', { ascending: false }).limit(120);
  const draftPlatform = platform && platform !== 'all' ? platform : section?.platform && section.platform !== 'all' ? section.platform : '';
  if (draftPlatform) query = query.eq('platform', draftPlatform);
  if (status && draftStatuses.includes(status)) query = query.eq('approval_status', status);
  const q = cleanSearch(search || sectionKey);
  if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%,platform.ilike.%${q}%,prompt_version.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listVersions(search: string | null, status: string | null, platform: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('social_publish_versions').select(versionColumns).order('created_at', { ascending: false }).limit(80);
  if (platform && platform !== 'all') query = query.eq('platform', platform);
  if (status && versionStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`platform.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content');
  if (response) return response;
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'all';
  const sectionKey = url.searchParams.get('section_key');
  const platform = url.searchParams.get('platform');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  if (mode === 'records') {
    const records = await listRecords(search, status, sectionKey, platform);
    if (!records.ok) return jsonError(records.error, records.status);
    return NextResponse.json({ ok: true, records: records.data });
  }
  if (mode === 'messages') {
    const messages = await listMessages(search, sectionKey, platform);
    if (!messages.ok) return jsonError(messages.error, messages.status);
    return NextResponse.json({ ok: true, messages: messages.data });
  }
  if (mode === 'drafts') {
    const drafts = await listDrafts(search, status, sectionKey, platform);
    if (!drafts.ok) return jsonError(drafts.error, drafts.status);
    return NextResponse.json({ ok: true, drafts: drafts.data });
  }
  if (mode === 'versions') {
    const versions = await listVersions(search, status, platform);
    if (!versions.ok) return jsonError(versions.error, versions.status);
    return NextResponse.json({ ok: true, versions: versions.data });
  }

  const [records, messages, drafts, versions] = await Promise.all([
    listRecords(search, null, sectionKey, platform),
    listMessages(search, sectionKey, platform),
    listDrafts(search, null, sectionKey, platform),
    listVersions(search, null, platform)
  ]);
  if (!records.ok) return jsonError(records.error, records.status);
  if (!messages.ok) return jsonError(messages.error, messages.status);
  if (!drafts.ok) return jsonError(drafts.error, drafts.status);
  if (!versions.ok) return jsonError(versions.error, versions.status);
  return NextResponse.json({ ok: true, records: records.data, messages: messages.data, drafts: drafts.data, versions: versions.data, recordStatuses, draftStatuses, versionStatuses });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'create_record') {
    const payload = buildRecordPayload(body, context?.actorId);
    if (validUuid(context?.actorId)) payload.created_by = context?.actorId;
    const { data, error } = await supabase.from('social_management_records').insert(payload).select(recordColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'social_management_record', object_id: data.record_id, after_data: data });
    return NextResponse.json({ ok: true, record: data });
  }

  if (action === 'create_message') {
    const payload = buildMessagePayload(body);
    const { data, error } = await supabase.from('social_messages').insert(payload).select(messageColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'social_message', object_id: data.message_id, after_data: data });
    return NextResponse.json({ ok: true, message: data });
  }

  if (action === 'create_draft') {
    const payload = buildDraftPayload(body, context?.actorId);
    const { data, error } = await supabase.from('content_drafts').insert(payload).select(draftColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'social_content_draft', object_id: data.content_id, after_data: data });
    return NextResponse.json({ ok: true, draft: data });
  }

  return jsonError('Unsupported action.', 400);
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'update_record') {
    const recordId = String(body.record_id || '');
    if (!validUuid(recordId)) return jsonError('A valid record_id is required.');
    const payload = buildRecordPayload(body, context?.actorId);
    const { data: before } = await supabase.from('social_management_records').select(recordColumns).eq('record_id', recordId).maybeSingle();
    const { data, error } = await supabase.from('social_management_records').update(payload).eq('record_id', recordId).select(recordColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'social_management_record', object_id: recordId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, record: data });
  }

  if (action === 'update_draft') {
    const contentId = String(body.content_id || '');
    if (!validUuid(contentId)) return jsonError('A valid content_id is required.');
    const payload = buildDraftPayload(body, context?.actorId);
    const { data: before } = await supabase.from('content_drafts').select(draftColumns).eq('content_id', contentId).maybeSingle();
    const { data, error } = await supabase.from('content_drafts').update(payload).eq('content_id', contentId).select(draftColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'social_content_draft', object_id: contentId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, draft: data });
  }

  if (action === 'publish_snapshot') {
    const contentId = String(body.content_id || '');
    const recordId = String(body.record_id || '');
    const platform = normalizePlatform(body.platform, 'all');
    const status = versionStatuses.includes(String(body.status)) ? String(body.status) : 'scheduled';
    const { data: existing, error: versionError } = await supabase.from('social_publish_versions').select('version_no').eq('platform', platform).order('version_no', { ascending: false }).limit(1);
    if (versionError) return jsonError(versionError.message, 500);
    const versionNo = Number(existing?.[0]?.version_no || 0) + 1;
    const snapshot = safeJson(body.snapshot_json, { platform, status, source: 'manual social admin publish snapshot', created_at: new Date().toISOString() });
    const { data, error } = await supabase
      .from('social_publish_versions')
      .insert({ content_id: validUuid(contentId) ? contentId : null, record_id: validUuid(recordId) ? recordId : null, platform, version_no: versionNo, status, snapshot_json: snapshot, scheduled_at: body.scheduled_at || null, published_by: validUuid(context?.actorId) ? context?.actorId : null })
      .select(versionColumns)
      .single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'publish_snapshot', object_type: 'social_publish_version', object_id: data.version_id, after_data: data });
    return NextResponse.json({ ok: true, version: data });
  }

  return jsonError('Unsupported action.', 400);
}
