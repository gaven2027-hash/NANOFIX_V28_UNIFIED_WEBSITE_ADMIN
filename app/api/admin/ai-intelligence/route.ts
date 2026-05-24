import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { getAiIntelligenceSection } from '@/lib/nanofix/aiIntelligenceConfig';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const recordColumns = 'record_id,section_key,category,title,body,config_json,status,created_by,updated_by,created_at,updated_at';
const draftColumns = 'draft_id,module,record_id,task,input_text,output_text,ai_confidence,ai_risk_level,human_review_status,created_by,reviewed_by,reviewed_at,published_at,sent_at,created_at';
const logColumns = 'ai_log_id,module,record_id,prompt_type,risk_level,confidence,decision,metadata,created_at';
const searchColumns = 'search_log_id,actor_id,query,filters,result_count,created_at';
const versionColumns = 'version_id,record_id,draft_id,section_key,version_no,status,snapshot_json,published_by,published_at,created_at';

const recordStatuses = ['draft', 'active', 'pending_review', 'approved', 'scheduled', 'published', 'archived', 'disabled'];
const draftStatuses = ['pending_review', 'approved', 'rejected', 'published', 'scheduled'];
const versionStatuses = ['draft', 'approved', 'scheduled', 'published', 'cancelled', 'failed'];
const riskLevels = ['low', 'normal', 'medium', 'high', 'blocked'];

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

function normalizeCategory(value: unknown, fallback = 'general') {
  return cleanText(value, fallback).toLowerCase().replace(/[^a-z0-9_ -]/g, '').replace(/\s+/g, '_').slice(0, 80) || fallback;
}

function buildRecordPayload(body: Payload, actorId?: string) {
  const section = getAiIntelligenceSection(cleanText(body.section_key));
  const status = recordStatuses.includes(String(body.status)) ? String(body.status) : 'draft';
  const payload: Payload = {
    section_key: section?.key || cleanText(body.section_key, 'ai-rules'),
    category: normalizeCategory(body.category, section?.category || 'general'),
    title: cleanText(body.title, section?.title || 'AI Management Record'),
    body: cleanText(body.body),
    config_json: safeJson(body.config_json, {}),
    status
  };
  if (validUuid(actorId)) payload.updated_by = actorId;
  return payload;
}

function buildDraftPayload(body: Payload) {
  const section = getAiIntelligenceSection(cleanText(body.section_key));
  const status = draftStatuses.includes(String(body.human_review_status)) ? String(body.human_review_status) : 'pending_review';
  const confidence = Number(body.ai_confidence ?? 0);
  return {
    module: normalizeCategory(body.module, section?.category || 'ai'),
    record_id: cleanText(body.record_ref || body.record_id),
    task: cleanText(body.task, section?.title || 'AI Task'),
    input_text: cleanText(body.input_text),
    output_text: cleanText(body.output_text),
    ai_confidence: Number.isFinite(confidence) ? confidence : 0,
    ai_risk_level: riskLevels.includes(String(body.ai_risk_level)) ? String(body.ai_risk_level) : 'normal',
    human_review_status: status,
    created_by: cleanText(body.created_by, 'admin')
  };
}

async function listRecords(search: string | null, status: string | null, sectionKey: string | null, category: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('ai_management_records').select(recordColumns).order('updated_at', { ascending: false }).limit(120);
  if (sectionKey) query = query.eq('section_key', sectionKey);
  if (category && category !== 'all') query = query.eq('category', category);
  if (status && recordStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%,section_key.ilike.%${q}%,category.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listDrafts(search: string | null, status: string | null, sectionKey: string | null, category: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  const section = getAiIntelligenceSection(sectionKey || undefined);
  let query = supabase.from('ai_drafts').select(draftColumns).order('created_at', { ascending: false }).limit(120);
  const moduleKey = category && category !== 'all' ? category : section?.category;
  if (moduleKey) query = query.eq('module', moduleKey);
  if (status && draftStatuses.includes(status)) query = query.eq('human_review_status', status);
  const q = cleanSearch(search || sectionKey);
  if (q) query = query.or(`task.ilike.%${q}%,input_text.ilike.%${q}%,output_text.ilike.%${q}%,module.ilike.%${q}%,ai_risk_level.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listLogs(search: string | null, category: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('ai_logs').select(logColumns).order('created_at', { ascending: false }).limit(120);
  if (category && category !== 'all') query = query.eq('module', category);
  const q = cleanSearch(search);
  if (q) query = query.or(`module.ilike.%${q}%,prompt_type.ilike.%${q}%,risk_level.ilike.%${q}%,decision.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listSearchLogs(search: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('search_logs').select(searchColumns).order('created_at', { ascending: false }).limit(120);
  const q = cleanSearch(search);
  if (q) query = query.or(`query.ilike.%${q}%,actor_id.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listVersions(search: string | null, status: string | null, sectionKey: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('ai_operation_versions').select(versionColumns).order('created_at', { ascending: false }).limit(100);
  if (sectionKey) query = query.eq('section_key', sectionKey);
  if (status && versionStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`section_key.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:ai');
  if (response) return response;
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'all';
  const sectionKey = url.searchParams.get('section_key');
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  if (mode === 'records') {
    const records = await listRecords(search, status, sectionKey, category);
    if (!records.ok) return jsonError(records.error, records.status);
    return NextResponse.json({ ok: true, records: records.data });
  }
  if (mode === 'drafts') {
    const drafts = await listDrafts(search, status, sectionKey, category);
    if (!drafts.ok) return jsonError(drafts.error, drafts.status);
    return NextResponse.json({ ok: true, drafts: drafts.data });
  }
  if (mode === 'logs') {
    const logs = await listLogs(search, category);
    if (!logs.ok) return jsonError(logs.error, logs.status);
    return NextResponse.json({ ok: true, logs: logs.data });
  }
  if (mode === 'search') {
    const searchLogs = await listSearchLogs(search);
    if (!searchLogs.ok) return jsonError(searchLogs.error, searchLogs.status);
    return NextResponse.json({ ok: true, searchLogs: searchLogs.data });
  }
  if (mode === 'versions') {
    const versions = await listVersions(search, status, sectionKey);
    if (!versions.ok) return jsonError(versions.error, versions.status);
    return NextResponse.json({ ok: true, versions: versions.data });
  }

  const [records, drafts, logs, searchLogs, versions] = await Promise.all([
    listRecords(search, null, sectionKey, category),
    listDrafts(search, null, sectionKey, category),
    listLogs(search, category),
    listSearchLogs(search),
    listVersions(search, null, sectionKey)
  ]);
  if (!records.ok) return jsonError(records.error, records.status);
  if (!drafts.ok) return jsonError(drafts.error, drafts.status);
  if (!logs.ok) return jsonError(logs.error, logs.status);
  if (!searchLogs.ok) return jsonError(searchLogs.error, searchLogs.status);
  if (!versions.ok) return jsonError(versions.error, versions.status);
  return NextResponse.json({ ok: true, records: records.data, drafts: drafts.data, logs: logs.data, searchLogs: searchLogs.data, versions: versions.data, recordStatuses, draftStatuses, versionStatuses });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:ai');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'create_record') {
    const payload = buildRecordPayload(body, context?.actorId);
    if (validUuid(context?.actorId)) payload.created_by = context?.actorId;
    const { data, error } = await supabase.from('ai_management_records').insert(payload).select(recordColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'ai_management_record', object_id: data.record_id, after_data: data });
    return NextResponse.json({ ok: true, record: data });
  }

  if (action === 'create_draft') {
    const payload = buildDraftPayload(body);
    const { data, error } = await supabase.from('ai_drafts').insert(payload).select(draftColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'ai_draft', object_id: data.draft_id, after_data: data });
    return NextResponse.json({ ok: true, draft: data });
  }

  return jsonError('Unsupported action.', 400);
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:ai');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'update_record') {
    const recordId = String(body.record_id || '');
    if (!validUuid(recordId)) return jsonError('A valid record_id is required.');
    const payload = buildRecordPayload(body, context?.actorId);
    const { data: before } = await supabase.from('ai_management_records').select(recordColumns).eq('record_id', recordId).maybeSingle();
    const { data, error } = await supabase.from('ai_management_records').update(payload).eq('record_id', recordId).select(recordColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'ai_management_record', object_id: recordId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, record: data });
  }

  if (action === 'update_draft') {
    const draftId = String(body.draft_id || '');
    if (!validUuid(draftId)) return jsonError('A valid draft_id is required.');
    const payload = buildDraftPayload(body);
    const { data: before } = await supabase.from('ai_drafts').select(draftColumns).eq('draft_id', draftId).maybeSingle();
    const { data, error } = await supabase.from('ai_drafts').update(payload).eq('draft_id', draftId).select(draftColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'ai_draft', object_id: draftId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, draft: data });
  }

  if (action === 'save_version') {
    const recordId = String(body.record_id || '');
    const draftId = String(body.draft_id || '');
    const sectionKey = cleanText(body.section_key, 'general');
    const status = versionStatuses.includes(String(body.status)) ? String(body.status) : 'approved';
    const { data: existing, error: versionError } = await supabase.from('ai_operation_versions').select('version_no').eq('section_key', sectionKey).order('version_no', { ascending: false }).limit(1);
    if (versionError) return jsonError(versionError.message, 500);
    const versionNo = Number(existing?.[0]?.version_no || 0) + 1;
    const snapshot = safeJson(body.snapshot_json, { section_key: sectionKey, status, created_at: new Date().toISOString(), ai_auto_publish_allowed: false, ai_auto_approve_allowed: false });
    const { data, error } = await supabase
      .from('ai_operation_versions')
      .insert({ record_id: validUuid(recordId) ? recordId : null, draft_id: validUuid(draftId) ? draftId : null, section_key: sectionKey, version_no: versionNo, status, snapshot_json: snapshot, published_by: validUuid(context?.actorId) ? context?.actorId : null })
      .select(versionColumns)
      .single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'save_version', object_type: 'ai_operation_version', object_id: data.version_id, after_data: data });
    return NextResponse.json({ ok: true, version: data });
  }

  return jsonError('Unsupported action.', 400);
}
