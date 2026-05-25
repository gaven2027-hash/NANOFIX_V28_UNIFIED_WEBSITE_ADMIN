import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin, type AdminRole } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const requestColumns = 'registration_request_id,auth_user_id,profile_id,email,full_name,phone,requested_role,approved_role,source,status,reviewer_notes,metadata_json,reviewed_by,reviewed_at,created_at,updated_at';
const profileColumns = 'profile_id,auth_user_id,email,full_name,username,mobile_phone,whatsapp_phone,role,requested_role,approved_role,registration_source,is_active,profile_status,review_status,password_status,email_verified,created_at,updated_at';
const allowedStatuses = ['pending_review', 'approved', 'rejected', 'cancelled'];
const allowedApprovedRoles = ['customer', 'engineer', 'content_admin', 'operations_admin', 'support', 'finance', 'super_admin'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanText(value: unknown, fallback = '', max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function cleanEmail(value: unknown) {
  return cleanText(value, '', 320).toLowerCase();
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function normalizeStatus(value: unknown) {
  const status = cleanText(value, 'pending_review').toLowerCase();
  return allowedStatuses.includes(status) ? status : 'pending_review';
}

function defaultApprovedRole(requestedRole: unknown) {
  const requested = cleanText(requestedRole, 'customer').toLowerCase();
  if (requested === 'engineer') return 'engineer';
  if (requested === 'admin') return 'content_admin';
  return 'customer';
}

function normalizeApprovedRole(value: unknown, requestedRole: unknown, actorRole?: AdminRole) {
  const candidate = cleanText(value, defaultApprovedRole(requestedRole)).toLowerCase();
  if (!allowedApprovedRoles.includes(candidate)) return defaultApprovedRole(requestedRole);
  if (candidate === 'super_admin' && actorRole !== 'super_admin') return 'content_admin';
  return candidate;
}

async function findProfile(supabase: ReturnType<typeof createSupabaseAdminClient>, requestRow: Payload) {
  if (!supabase) return null;
  if (validUuid(requestRow.profile_id)) {
    const { data } = await supabase.from('profiles').select(profileColumns).eq('profile_id', requestRow.profile_id).maybeSingle();
    if (data) return data;
  }
  if (validUuid(requestRow.auth_user_id)) {
    const { data } = await supabase.from('profiles').select(profileColumns).eq('auth_user_id', requestRow.auth_user_id).maybeSingle();
    if (data) return data;
  }
  const email = cleanEmail(requestRow.email);
  if (email) {
    const { data } = await supabase.from('profiles').select(profileColumns).eq('email', email).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:customers');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const status = url.searchParams.get('status');
  const role = url.searchParams.get('role');
  const search = cleanText(url.searchParams.get('search'), '', 160);

  let query = supabase.from('portal_registration_requests').select(requestColumns).order('created_at', { ascending: false }).limit(100);
  if (validUuid(id)) query = query.eq('registration_request_id', id);
  if (status) query = query.eq('status', normalizeStatus(status));
  if (role) query = query.eq('requested_role', cleanText(role, 'customer'));
  if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%,reviewer_notes.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, rows: data || [] });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:customers');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const id = String(body.registration_request_id || body.id || '');
  const action = cleanText(body.action).toLowerCase();
  if (!validUuid(id)) return jsonError('A valid registration_request_id is required.');
  if (!['approve', 'reject'].includes(action)) return jsonError('Action must be approve or reject.');

  const { data: before, error: beforeError } = await supabase.from('portal_registration_requests').select(requestColumns).eq('registration_request_id', id).maybeSingle();
  if (beforeError) return jsonError(beforeError.message, 500);
  if (!before) return jsonError('Registration request not found.', 404);

  const now = new Date().toISOString();
  const reviewerNotes = cleanText(body.reviewer_notes, '', 4000) || null;
  const profileBefore = await findProfile(supabase, before as Payload);

  if (action === 'reject') {
    const { data: rejected, error } = await supabase.from('portal_registration_requests').update({
      status: 'rejected',
      reviewer_notes: reviewerNotes,
      reviewed_by: context?.actorId,
      reviewed_at: now,
      updated_at: now
    }).eq('registration_request_id', id).select(requestColumns).single();
    if (error) return jsonError(error.message, 500);

    if (profileBefore?.profile_id) {
      await supabase.from('profiles').update({ is_active: false, profile_status: 'rejected', review_status: 'rejected', updated_at: now }).eq('profile_id', profileBefore.profile_id);
    }

    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'reject_portal_registration_request', object_type: 'portal_registration_request', object_id: id, before_data: { request: before, profile: profileBefore }, after_data: { request: rejected } });
    return NextResponse.json({ ok: true, row: rejected, action: 'reject' });
  }

  const approvedRole = normalizeApprovedRole(body.approved_role, before.requested_role, context?.role);
  let profileAfter: Payload | null = null;

  if (profileBefore?.profile_id) {
    const { data, error } = await supabase.from('profiles').update({
      role: approvedRole,
      requested_role: before.requested_role || approvedRole,
      approved_role: approvedRole,
      registration_source: before.source || 'portal_register',
      is_active: true,
      profile_status: 'active',
      review_status: 'approved',
      full_name: profileBefore.full_name || before.full_name || null,
      mobile_phone: profileBefore.mobile_phone || before.phone || null,
      whatsapp_phone: profileBefore.whatsapp_phone || before.phone || null,
      updated_at: now
    }).eq('profile_id', profileBefore.profile_id).select(profileColumns).single();
    if (error) return jsonError(error.message, 500);
    profileAfter = data as Payload;
  } else {
    const { data, error } = await supabase.from('profiles').insert({
      auth_user_id: validUuid(before.auth_user_id) ? before.auth_user_id : null,
      email: before.email,
      full_name: before.full_name || before.email,
      mobile_phone: before.phone || null,
      whatsapp_phone: before.phone || null,
      role: approvedRole,
      requested_role: before.requested_role || approvedRole,
      approved_role: approvedRole,
      registration_source: before.source || 'portal_register',
      is_active: true,
      profile_status: 'active',
      review_status: 'approved',
      password_status: 'set',
      email_verified: false,
      created_at: now,
      updated_at: now
    }).select(profileColumns).single();
    if (error) return jsonError(error.message, 500);
    profileAfter = data as Payload;
  }

  const { data: approved, error: approveError } = await supabase.from('portal_registration_requests').update({
    profile_id: profileAfter?.profile_id || before.profile_id || null,
    approved_role: approvedRole,
    status: 'approved',
    reviewer_notes: reviewerNotes,
    reviewed_by: context?.actorId,
    reviewed_at: now,
    updated_at: now
  }).eq('registration_request_id', id).select(requestColumns).single();
  if (approveError) return jsonError(approveError.message, 500);

  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'approve_portal_registration_request', object_type: 'portal_registration_request', object_id: id, before_data: { request: before, profile: profileBefore }, after_data: { request: approved, profile: profileAfter } });
  return NextResponse.json({ ok: true, row: approved, profile: profileAfter, action: 'approve' });
}
