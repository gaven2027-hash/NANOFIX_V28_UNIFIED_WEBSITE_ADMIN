import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const columns = 'registration_request_id,auth_user_id,profile_id,email,full_name,phone,requested_role,approved_role,source,status,reviewer_notes,metadata_json,reviewed_by,reviewed_at,created_at,updated_at';
const allowedRequestedRoles = ['customer', 'engineer', 'admin'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanText(value: unknown, fallback = '', max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function cleanEmail(value: unknown) {
  return cleanText(value, '', 320).toLowerCase();
}

function normalizeRequestedRole(value: unknown) {
  const role = cleanText(value, 'customer').toLowerCase();
  return allowedRequestedRoles.includes(role) ? role : 'customer';
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const email = cleanEmail(body.email);
  const requestedRole = normalizeRequestedRole(body.requested_role || body.role);
  if (!email || !email.includes('@')) return jsonError('A valid email is required.');

  const now = new Date().toISOString();
  const payload = {
    auth_user_id: validUuid(body.auth_user_id) ? String(body.auth_user_id) : null,
    profile_id: validUuid(body.profile_id) ? String(body.profile_id) : null,
    email,
    full_name: cleanText(body.full_name || body.name, '', 160) || null,
    phone: cleanText(body.phone, '', 80) || null,
    requested_role: requestedRole,
    source: cleanText(body.source, 'portal_register', 120) || 'portal_register',
    status: 'pending_review',
    metadata_json: {
      user_agent: request.headers.get('user-agent') || null,
      submitted_at: now,
      role_label: requestedRole,
      registration_source: body.registration_source || 'nanofix_portal_register'
    },
    updated_at: now
  };

  const { data: existing } = await supabase
    .from('portal_registration_requests')
    .select(columns)
    .eq('email', email)
    .eq('requested_role', requestedRole)
    .in('status', ['pending_review', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('portal_registration_requests')
      .update({ ...payload, updated_at: now })
      .eq('registration_request_id', existing.registration_request_id)
      .select(columns)
      .single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, row: data, existing: true });
  }

  const { data, error } = await supabase.from('portal_registration_requests').insert(payload).select(columns).single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, row: data, existing: false });
}
