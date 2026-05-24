import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { getSystemSettingsSection } from '@/lib/nanofix/systemSettingsConfig';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const recordColumns = 'record_id,section_key,category,title,body,config_json,status,is_sensitive,created_by,updated_by,created_at,updated_at';
const versionColumns = 'version_id,record_id,section_key,version_no,status,snapshot_json,published_by,published_at,created_at';
const auditColumns = 'audit_id,actor_id,actor_role,action,object_type,object_id,after_data,created_at';
const backupJobColumns = 'backup_id,module,schedule_cron,encrypted_file_path,signed_url_expires_at,status,created_by,created_at';
const backupScheduleColumns = 'module,frequency,exact_run_time,timezone,weekdays,day_of_month,custom_cron,retention_days,enabled,next_run_at,updated_by,updated_at';
const healthColumns = 'health_event_id,module_key,check_name,status,message,latency_ms,metadata,created_at';
const moduleColumns = 'module_key,name,category,owner_role,criticality,health_status,enabled,metadata,updated_at';
const profileColumns = 'profile_id,auth_user_id,email,full_name,role,requested_role,approved_role,registration_source,invited_by,invited_at,is_active,password_status,username,mobile_phone,whatsapp_phone,username_verified,mobile_verified,whatsapp_verified,email_verified,password_reset_required,profile_status,review_status,reviewed_by,reviewed_at,account_admin_note,last_admin_password_reset_at,last_password_changed_at,created_at,updated_at';

const recordStatuses = ['draft', 'active', 'pending_review', 'approved', 'archived', 'disabled', 'failed', 'healthy', 'degraded'];
const versionStatuses = ['draft', 'approved', 'published', 'archived', 'cancelled'];
const profileStatuses = ['active', 'disabled', 'frozen', 'blacklisted', 'archived'];
const reviewStatuses = ['pending_review', 'approved', 'rejected'];
const roles = ['super_admin', 'admin', 'engineer', 'customer'];
const creatableRoles = ['admin', 'engineer', 'customer'];

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function cleanText(value: unknown, fallback = '') { return typeof value === 'string' ? value.trim().slice(0, 8000) : fallback; }
function cleanSearch(value: string | null) { return (value || '').replace(/[,%()]/g, ' ').trim().slice(0, 120); }
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function safeJson(value: unknown, fallback: Payload | unknown[] = {}) { if (!value) return fallback; if (typeof value === 'object') return value; if (typeof value === 'string') { try { return JSON.parse(value); } catch { return fallback; } } return fallback; }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function buildRecordPayload(body: Payload, actorId?: string) {
  const section = getSystemSettingsSection(cleanText(body.section_key));
  const status = recordStatuses.includes(String(body.status)) ? String(body.status) : 'draft';
  const payload: Payload = { section_key: section?.key || cleanText(body.section_key, 'company-settings'), category: cleanText(body.category, section?.category || 'general'), title: cleanText(body.title, section?.title || 'System Setting Record'), body: cleanText(body.body), config_json: safeJson(body.config_json, {}), status, is_sensitive: Boolean(body.is_sensitive ?? section?.sensitive ?? false) };
  if (validUuid(actorId)) payload.updated_by = actorId;
  return payload;
}
function buildProfilePatch(body: Payload, actorId?: string) {
  const review = reviewStatuses.includes(String(body.review_status)) ? String(body.review_status) : undefined;
  const profileStatus = profileStatuses.includes(String(body.profile_status)) ? String(body.profile_status) : undefined;
  const role = roles.includes(String(body.role)) ? String(body.role) : undefined;
  const patch: Payload = { updated_at: new Date().toISOString() };
  if (review) { patch.review_status = review; patch.reviewed_by = validUuid(actorId) ? actorId : null; patch.reviewed_at = new Date().toISOString(); }
  if (profileStatus) { patch.profile_status = profileStatus; patch.is_active = profileStatus === 'active'; }
  if (role) { patch.role = role; patch.approved_role = role; }
  if ('requested_role' in body && creatableRoles.includes(String(body.requested_role))) patch.requested_role = String(body.requested_role);
  if ('account_admin_note' in body) patch.account_admin_note = cleanText(body.account_admin_note);
  if ('username' in body) patch.username = cleanText(body.username) || null;
  if ('mobile_phone' in body) patch.mobile_phone = cleanText(body.mobile_phone) || null;
  if ('whatsapp_phone' in body) patch.whatsapp_phone = cleanText(body.whatsapp_phone) || null;
  if ('username_verified' in body) patch.username_verified = Boolean(body.username_verified);
  if ('email_verified' in body) patch.email_verified = Boolean(body.email_verified);
  if ('mobile_verified' in body) patch.mobile_verified = Boolean(body.mobile_verified);
  if ('whatsapp_verified' in body) patch.whatsapp_verified = Boolean(body.whatsapp_verified);
  if ('password_reset_required' in body) patch.password_reset_required = Boolean(body.password_reset_required);
  return patch;
}
function buildProfileCreatePayload(body: Payload, actorId?: string) {
  const email = cleanText(body.email).toLowerCase();
  const role = creatableRoles.includes(String(body.role)) ? String(body.role) : 'customer';
  const review = reviewStatuses.includes(String(body.review_status)) ? String(body.review_status) : 'approved';
  const status = profileStatuses.includes(String(body.profile_status)) ? String(body.profile_status) : 'active';
  const active = status === 'active' && review === 'approved';
  return {
    email,
    full_name: cleanText(body.full_name, email.split('@')[0]),
    username: cleanText(body.username) || null,
    mobile_phone: cleanText(body.mobile_phone) || null,
    whatsapp_phone: cleanText(body.whatsapp_phone) || null,
    role,
    requested_role: role,
    approved_role: review === 'approved' ? role : null,
    registration_source: Boolean(body.send_invite) ? 'admin_invited' : 'admin_created',
    invited_by: validUuid(actorId) ? actorId : null,
    invited_at: Boolean(body.send_invite) ? new Date().toISOString() : null,
    is_active: active,
    profile_status: active ? 'active' : status,
    review_status: review,
    reviewed_by: review === 'approved' && validUuid(actorId) ? actorId : null,
    reviewed_at: review === 'approved' ? new Date().toISOString() : null,
    password_status: 'not_set',
    email_verified: false,
    username_verified: Boolean(body.username_verified),
    mobile_verified: Boolean(body.mobile_verified),
    whatsapp_verified: Boolean(body.whatsapp_verified),
    password_reset_required: true,
    account_admin_note: cleanText(body.account_admin_note)
  };
}

async function listRecords(search: string | null, status: string | null, sectionKey: string | null, category: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('system_setting_records').select(recordColumns).order('updated_at', { ascending: false }).limit(120);
  if (sectionKey) query = query.eq('section_key', sectionKey); if (category && category !== 'all') query = query.eq('category', category); if (status && recordStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search); if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%,section_key.ilike.%${q}%,category.ilike.%${q}%`);
  const { data, error } = await query; if (error) return { ok: false as const, status: 500, error: error.message }; return { ok: true as const, data: data ?? [] };
}
async function listAudit(search: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('audit_logs').select(auditColumns).order('created_at', { ascending: false }).limit(150);
  const q = cleanSearch(search); if (q) query = query.or(`actor_role.ilike.%${q}%,action.ilike.%${q}%,object_type.ilike.%${q}%`);
  const { data, error } = await query; if (error) return { ok: false as const, status: 500, error: error.message }; return { ok: true as const, data: data ?? [] };
}
async function listBackup(search: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  const q = cleanSearch(search); let jobsQuery = supabase.from('backup_jobs').select(backupJobColumns).order('created_at', { ascending: false }).limit(80); let schedulesQuery = supabase.from('backup_schedules').select(backupScheduleColumns).order('updated_at', { ascending: false }).limit(80);
  if (q) { jobsQuery = jobsQuery.or(`module.ilike.%${q}%,status.ilike.%${q}%`); schedulesQuery = schedulesQuery.or(`module.ilike.%${q}%,frequency.ilike.%${q}%,timezone.ilike.%${q}%`); }
  const [{ data: jobs, error: jobsError }, { data: schedules, error: schedulesError }] = await Promise.all([jobsQuery, schedulesQuery]); if (jobsError) return { ok: false as const, status: 500, error: jobsError.message }; if (schedulesError) return { ok: false as const, status: 500, error: schedulesError.message }; return { ok: true as const, data: { jobs: jobs ?? [], schedules: schedules ?? [] } };
}
async function listHealth(search: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  const q = cleanSearch(search); let modulesQuery = supabase.from('app_modules').select(moduleColumns).order('updated_at', { ascending: false }).limit(100); let eventsQuery = supabase.from('module_health_events').select(healthColumns).order('created_at', { ascending: false }).limit(100);
  if (q) { modulesQuery = modulesQuery.or(`module_key.ilike.%${q}%,name.ilike.%${q}%,health_status.ilike.%${q}%`); eventsQuery = eventsQuery.or(`module_key.ilike.%${q}%,check_name.ilike.%${q}%,status.ilike.%${q}%,message.ilike.%${q}%`); }
  const [{ data: modules, error: modulesError }, { data: events, error: eventsError }] = await Promise.all([modulesQuery, eventsQuery]); if (modulesError) return { ok: false as const, status: 500, error: modulesError.message }; if (eventsError) return { ok: false as const, status: 500, error: eventsError.message }; return { ok: true as const, data: { modules: modules ?? [], events: events ?? [] } };
}
async function listRbac(search: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('profiles').select(profileColumns).order('updated_at', { ascending: false }).limit(180);
  const q = cleanSearch(search); if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,username.ilike.%${q}%,mobile_phone.ilike.%${q}%,whatsapp_phone.ilike.%${q}%,role.ilike.%${q}%,requested_role.ilike.%${q}%,profile_status.ilike.%${q}%,review_status.ilike.%${q}%`);
  const { data, error } = await query; if (error) return { ok: false as const, status: 500, error: error.message }; return { ok: true as const, data: data ?? [] };
}
async function listVersions(search: string | null, status: string | null, sectionKey: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('system_setting_versions').select(versionColumns).order('created_at', { ascending: false }).limit(100); if (sectionKey) query = query.eq('section_key', sectionKey); if (status && versionStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search); if (q) query = query.or(`section_key.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query; if (error) return { ok: false as const, status: 500, error: error.message }; return { ok: true as const, data: data ?? [] };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:*'); if (response) return response;
  const url = new URL(request.url); const mode = url.searchParams.get('mode') || 'all'; const sectionKey = url.searchParams.get('section_key'); const category = url.searchParams.get('category'); const status = url.searchParams.get('status'); const search = url.searchParams.get('search');
  if (mode === 'records') { const records = await listRecords(search, status, sectionKey, category); if (!records.ok) return jsonError(records.error, records.status); return NextResponse.json({ ok: true, records: records.data }); }
  if (mode === 'audit') { const audit = await listAudit(search); if (!audit.ok) return jsonError(audit.error, audit.status); return NextResponse.json({ ok: true, audit: audit.data }); }
  if (mode === 'backup') { const backup = await listBackup(search); if (!backup.ok) return jsonError(backup.error, backup.status); return NextResponse.json({ ok: true, backup: backup.data }); }
  if (mode === 'health') { const health = await listHealth(search); if (!health.ok) return jsonError(health.error, health.status); return NextResponse.json({ ok: true, health: health.data }); }
  if (mode === 'rbac') { const rbac = await listRbac(search); if (!rbac.ok) return jsonError(rbac.error, rbac.status); return NextResponse.json({ ok: true, rbac: rbac.data }); }
  if (mode === 'versions') { const versions = await listVersions(search, status, sectionKey); if (!versions.ok) return jsonError(versions.error, versions.status); return NextResponse.json({ ok: true, versions: versions.data }); }
  const [records, audit, backup, health, rbac, versions] = await Promise.all([listRecords(search, null, sectionKey, category), listAudit(search), listBackup(search), listHealth(search), listRbac(search), listVersions(search, null, sectionKey)]);
  for (const result of [records, audit, backup, health, rbac, versions]) if (!result.ok) return jsonError(result.error, result.status);
  return NextResponse.json({ ok: true, records: records.data, audit: audit.data, backup: backup.data, health: health.data, rbac: rbac.data, versions: versions.data });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload; const action = String(body.action || ''); const { context, response } = requireAdmin(request, 'write:settings'); if (response) return response; const supabase = createSupabaseAdminClient(); if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  if (action === 'create_profile') { const payload = buildProfileCreatePayload(body, context?.actorId); if (!validEmail(payload.email)) return jsonError('A valid email is required. / 必须填写有效邮箱。'); const { data: duplicate } = await supabase.from('profiles').select('profile_id,email').ilike('email', payload.email).limit(1).maybeSingle(); if (duplicate) return jsonError('This email already has a profile. / 该邮箱已存在账号档案。', 409); const { data, error } = await supabase.from('profiles').insert(payload).select(profileColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_profile', object_type: 'profile', object_id: data.profile_id, after_data: { profile_id: data.profile_id, email: data.email, role: data.role, review_status: data.review_status, profile_status: data.profile_status } }); return NextResponse.json({ ok: true, profile: data }); }
  if (action === 'create_record') { const payload = buildRecordPayload(body, context?.actorId); if (validUuid(context?.actorId)) payload.created_by = context?.actorId; const { data, error } = await supabase.from('system_setting_records').insert(payload).select(recordColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'system_setting_record', object_id: data.record_id, after_data: data }); return NextResponse.json({ ok: true, record: data }); }
  return jsonError('Unsupported action.', 400);
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload; const action = String(body.action || ''); const { context, response } = requireAdmin(request, 'write:settings'); if (response) return response; const supabase = createSupabaseAdminClient(); if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  if (action === 'update_profile_status') { const profileId = String(body.profile_id || ''); if (!validUuid(profileId)) return jsonError('A valid profile_id is required.'); const patch = buildProfilePatch(body, context?.actorId); const { data: before } = await supabase.from('profiles').select(profileColumns).eq('profile_id', profileId).maybeSingle(); const { data, error } = await supabase.from('profiles').update(patch).eq('profile_id', profileId).select(profileColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_profile_status', object_type: 'profile', object_id: profileId, before_data: before ?? {}, after_data: data }); return NextResponse.json({ ok: true, profile: data }); }
  if (action === 'update_record') { const recordId = String(body.record_id || ''); if (!validUuid(recordId)) return jsonError('A valid record_id is required.'); const payload = buildRecordPayload(body, context?.actorId); const { data: before } = await supabase.from('system_setting_records').select(recordColumns).eq('record_id', recordId).maybeSingle(); const { data, error } = await supabase.from('system_setting_records').update(payload).eq('record_id', recordId).select(recordColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'system_setting_record', object_id: recordId, before_data: before ?? {}, after_data: data }); return NextResponse.json({ ok: true, record: data }); }
  if (action === 'save_version') { const recordId = String(body.record_id || ''); const sectionKey = cleanText(body.section_key, 'general'); const status = versionStatuses.includes(String(body.status)) ? String(body.status) : 'approved'; const { data: existing, error: versionError } = await supabase.from('system_setting_versions').select('version_no').eq('section_key', sectionKey).order('version_no', { ascending: false }).limit(1); if (versionError) return jsonError(versionError.message, 500); const versionNo = Number(existing?.[0]?.version_no || 0) + 1; const snapshot = safeJson(body.snapshot_json, { section_key: sectionKey, status, created_at: new Date().toISOString(), secrets_stored_here: false }); const { data, error } = await supabase.from('system_setting_versions').insert({ record_id: validUuid(recordId) ? recordId : null, section_key: sectionKey, version_no: versionNo, status, snapshot_json: snapshot, published_by: validUuid(context?.actorId) ? context?.actorId : null }).select(versionColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'save_version', object_type: 'system_setting_version', object_id: data.version_id, after_data: data }); return NextResponse.json({ ok: true, version: data }); }
  return jsonError('Unsupported action.', 400);
}
