import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { getEngineerPortalSection } from '@/lib/nanofix/engineerPortalConfig';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const jobColumns = 'job_id,service_request_id,quotation_id,engineer_id,scheduled_at,status,completion_notes,notes,eta_json,created_at,updated_at';
const inspectionColumns = 'inspection_id,service_request_id,engineer_id,scheduled_at,checklist_json,photo_paths,status,created_at';
const checklistColumns = 'checklist_id,job_id,engineer_id,checklist_json,status,submitted_at,created_at';
const photoColumns = 'photo_id,job_id,engineer_id,photo_type,file_path,caption,metadata,status,created_at';
const signatureColumns = 'signature_id,job_id,customer_id,engineer_id,signature_path,signed_name,status,signed_at,created_at';
const warrantyColumns = 'warranty_id,job_id,customer_id,coverage,starts_on,ends_on,status,created_at';
const profileColumns = 'profile_id,email,full_name,role,is_active,password_status,created_at,updated_at';
const versionColumns = 'version_id,engineer_id,job_id,section_key,entity_type,entity_id,version_no,status,snapshot_json,published_by,published_at,created_at';

const jobStatuses = ['assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'rework_required', 'cancelled'];
const inspectionStatuses = ['scheduled', 'assigned', 'in_progress', 'completed', 'rescheduled', 'cancelled'];
const versionStatuses = ['draft', 'approved', 'published', 'archived', 'cancelled'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 8000) : fallback;
}
function cleanSearch(value: string | null) {
  return (value || '').replace(/[,%()]/g, ' ').trim().slice(0, 120);
}
function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}
function safeJson(value: unknown, fallback: Payload | unknown[] = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return fallback;
}

async function listJobs(search: string | null, status: string | null, engineerId: string | null, jobId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('jobs').select(jobColumns).order('updated_at', { ascending: false }).limit(150);
  if (validUuid(engineerId)) query = query.eq('engineer_id', engineerId);
  if (validUuid(jobId)) query = query.eq('job_id', jobId);
  if (status && jobStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`status.ilike.%${q}%,completion_notes.ilike.%${q}%,notes.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listInspections(search: string | null, status: string | null, engineerId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('inspections').select(inspectionColumns).order('created_at', { ascending: false }).limit(120);
  if (validUuid(engineerId)) query = query.eq('engineer_id', engineerId);
  if (status && inspectionStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listFieldTable(table: 'job_checklists' | 'job_photos' | 'customer_signatures', columns: string, search: string | null, status: string | null, engineerId: string | null, jobId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from(table).select(columns).order('created_at', { ascending: false }).limit(150);
  if (validUuid(engineerId)) query = query.eq('engineer_id', engineerId);
  if (validUuid(jobId)) query = query.eq('job_id', jobId);
  if (status) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q && table === 'job_photos') query = query.or(`photo_type.ilike.%${q}%,caption.ilike.%${q}%,status.ilike.%${q}%`);
  if (q && table === 'customer_signatures') query = query.or(`signed_name.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listWarranties(search: string | null, status: string | null, jobId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('warranties').select(warrantyColumns).order('created_at', { ascending: false }).limit(120);
  if (validUuid(jobId)) query = query.eq('job_id', jobId);
  if (status) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`coverage.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listEngineers(search: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('profiles').select(profileColumns).in('role', ['engineer', 'admin', 'super_admin']).order('updated_at', { ascending: false }).limit(80);
  const q = cleanSearch(search);
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,role.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listVersions(search: string | null, status: string | null, sectionKey: string | null, engineerId: string | null, jobId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('engineer_portal_versions').select(versionColumns).order('created_at', { ascending: false }).limit(100);
  if (sectionKey) query = query.eq('section_key', sectionKey);
  if (validUuid(engineerId)) query = query.eq('engineer_id', engineerId);
  if (validUuid(jobId)) query = query.eq('job_id', jobId);
  if (status && versionStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`section_key.ilike.%${q}%,entity_type.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

function buildJobPatch(body: Payload) {
  const patch: Payload = {};
  if (jobStatuses.includes(String(body.status))) patch.status = String(body.status);
  if ('completion_notes' in body) patch.completion_notes = cleanText(body.completion_notes);
  if ('notes' in body) patch.notes = cleanText(body.notes);
  if ('scheduled_at' in body) patch.scheduled_at = body.scheduled_at || null;
  if ('eta_json' in body) patch.eta_json = safeJson(body.eta_json, {});
  return patch;
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:operations');
  if (response) return response;
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'all';
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');
  const engineerId = url.searchParams.get('engineer_id');
  const jobId = url.searchParams.get('job_id');
  const sectionKey = url.searchParams.get('section_key');

  if (mode === 'jobs') {
    const jobs = await listJobs(search, status, engineerId, jobId);
    if (!jobs.ok) return jsonError(jobs.error, jobs.status);
    return NextResponse.json({ ok: true, jobs: jobs.data });
  }
  if (mode === 'inspections') {
    const inspections = await listInspections(search, status, engineerId);
    if (!inspections.ok) return jsonError(inspections.error, inspections.status);
    return NextResponse.json({ ok: true, inspections: inspections.data });
  }
  if (mode === 'checklists') {
    const checklists = await listFieldTable('job_checklists', checklistColumns, search, status, engineerId, jobId);
    if (!checklists.ok) return jsonError(checklists.error, checklists.status);
    return NextResponse.json({ ok: true, checklists: checklists.data });
  }
  if (mode === 'photos') {
    const photos = await listFieldTable('job_photos', photoColumns, search, status, engineerId, jobId);
    if (!photos.ok) return jsonError(photos.error, photos.status);
    return NextResponse.json({ ok: true, photos: photos.data });
  }
  if (mode === 'signatures') {
    const signatures = await listFieldTable('customer_signatures', signatureColumns, search, status, engineerId, jobId);
    if (!signatures.ok) return jsonError(signatures.error, signatures.status);
    return NextResponse.json({ ok: true, signatures: signatures.data });
  }
  if (mode === 'access') {
    const engineers = await listEngineers(search);
    if (!engineers.ok) return jsonError(engineers.error, engineers.status);
    return NextResponse.json({ ok: true, engineers: engineers.data });
  }
  if (mode === 'versions') {
    const versions = await listVersions(search, status, sectionKey, engineerId, jobId);
    if (!versions.ok) return jsonError(versions.error, versions.status);
    return NextResponse.json({ ok: true, versions: versions.data });
  }

  const [jobs, inspections, checklists, photos, signatures, warranties, engineers, versions] = await Promise.all([
    listJobs(search, null, engineerId, jobId),
    listInspections(search, null, engineerId),
    listFieldTable('job_checklists', checklistColumns, search, null, engineerId, jobId),
    listFieldTable('job_photos', photoColumns, search, null, engineerId, jobId),
    listFieldTable('customer_signatures', signatureColumns, search, null, engineerId, jobId),
    listWarranties(search, null, jobId),
    listEngineers(search),
    listVersions(search, null, sectionKey, engineerId, jobId)
  ]);
  for (const result of [jobs, inspections, checklists, photos, signatures, warranties, engineers, versions]) if (!result.ok) return jsonError(result.error, result.status);
  return NextResponse.json({ ok: true, jobs: jobs.data, inspections: inspections.data, checklists: checklists.data, photos: photos.data, signatures: signatures.data, warranties: warranties.data, engineers: engineers.data, versions: versions.data });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:operations');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'update_job') {
    const jobId = String(body.job_id || '');
    if (!validUuid(jobId)) return jsonError('A valid job_id is required.');
    const patch = buildJobPatch(body);
    const { data: before } = await supabase.from('jobs').select(jobColumns).eq('job_id', jobId).maybeSingle();
    const { data, error } = await supabase.from('jobs').update(patch).eq('job_id', jobId).select(jobColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'engineer_portal_job', object_id: jobId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, job: data });
  }

  if (action === 'save_version') {
    const section = getEngineerPortalSection(cleanText(body.section_key));
    const sectionKey = section?.key || cleanText(body.section_key, 'general');
    const status = versionStatuses.includes(String(body.status)) ? String(body.status) : 'approved';
    const entityId = validUuid(body.entity_id) ? String(body.entity_id) : null;
    const engineerId = validUuid(body.engineer_id) ? String(body.engineer_id) : null;
    const jobId = validUuid(body.job_id) ? String(body.job_id) : null;
    const { data: existing, error: versionError } = await supabase.from('engineer_portal_versions').select('version_no').eq('section_key', sectionKey).order('version_no', { ascending: false }).limit(1);
    if (versionError) return jsonError(versionError.message, 500);
    const versionNo = Number(existing?.[0]?.version_no || 0) + 1;
    const snapshot = safeJson(body.snapshot_json, { section_key: sectionKey, created_at: new Date().toISOString() });
    const { data, error } = await supabase.from('engineer_portal_versions').insert({ engineer_id: engineerId, job_id: jobId, section_key: sectionKey, entity_type: cleanText(body.entity_type, 'engineer_portal_record'), entity_id: entityId, version_no: versionNo, status, snapshot_json: snapshot, published_by: validUuid(context?.actorId) ? context?.actorId : null }).select(versionColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'save_version', object_type: 'engineer_portal_version', object_id: data.version_id, after_data: data });
    return NextResponse.json({ ok: true, version: data });
  }

  return jsonError('Unsupported action.', 400);
}
