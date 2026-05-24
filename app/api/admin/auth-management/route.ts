import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const customerColumns = 'customer_id,auth_user_id,username,name,email,phone,whatsapp,status,account_status,binding_status,preferred_login_method,email_verified,phone_verified,whatsapp_verified,auth_methods,created_at,updated_at';
const actionColumns = 'action_id,customer_id,auth_user_id,username,email,phone,whatsapp,action_type,delivery_channel,status,metadata,requested_by,completed_at,created_at';

const loginMethods = ['email', 'username', 'phone', 'whatsapp'];
const actionTypes = ['register_customer', 'direct_credential_update', 'email_recovery_link', 'whatsapp_recovery_link', 'email_verification', 'phone_verification', 'whatsapp_verification'];
const deliveryChannels = ['admin', 'email', 'phone', 'whatsapp'];
const customerStatuses = ['active', 'pending_verification', 'suspended'];
const accountStatuses = ['active', 'disabled', 'frozen', 'blacklisted', 'archived'];

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
function normalizeUsername(value: unknown) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 60) || null;
}

async function listCustomers(search: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('customers').select(customerColumns).order('updated_at', { ascending: false }).limit(120);
  const q = cleanSearch(search);
  if (q) query = query.or(`username.ilike.%${q}%,name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,whatsapp.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listActions(search: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('customer_auth_actions').select(actionColumns).order('created_at', { ascending: false }).limit(160);
  const q = cleanSearch(search);
  if (q) query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,whatsapp.ilike.%${q}%,action_type.ilike.%${q}%,delivery_channel.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

function buildCustomerPayload(body: Payload) {
  const username = normalizeUsername(body.username);
  const preferred = loginMethods.includes(String(body.preferred_login_method)) ? String(body.preferred_login_method) : 'email';
  return {
    username,
    name: cleanText(body.name, username || 'Customer'),
    email: cleanText(body.email) || null,
    phone: cleanText(body.phone) || null,
    whatsapp: cleanText(body.whatsapp) || cleanText(body.phone) || null,
    preferred_login_method: preferred,
    email_verified: Boolean(body.email_verified),
    phone_verified: Boolean(body.phone_verified),
    whatsapp_verified: Boolean(body.whatsapp_verified),
    auth_methods: safeJson(body.auth_methods, { email: Boolean(body.email), username: Boolean(username), phone: Boolean(body.phone), whatsapp: Boolean(body.whatsapp || body.phone) }),
    status: customerStatuses.includes(String(body.status)) ? String(body.status) : 'pending_verification',
    account_status: accountStatuses.includes(String(body.account_status)) ? String(body.account_status) : 'active',
    binding_status: 'linked'
  };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:customers');
  if (response) return response;
  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const [customers, actions] = await Promise.all([listCustomers(search), listActions(search)]);
  if (!customers.ok) return jsonError(customers.error, customers.status);
  if (!actions.ok) return jsonError(actions.error, actions.status);
  return NextResponse.json({ ok: true, customers: customers.data, actions: actions.data });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:customers');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'register_customer') {
    const payload = buildCustomerPayload(body);
    const { data, error } = await supabase.from('customers').insert(payload).select(customerColumns).single();
    if (error) return jsonError(error.message, 500);
    const actionRow = {
      customer_id: data.customer_id,
      auth_user_id: data.auth_user_id,
      username: data.username,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp,
      action_type: 'register_customer',
      delivery_channel: String(data.preferred_login_method || 'email') === 'whatsapp' ? 'whatsapp' : String(data.preferred_login_method || 'email') === 'phone' ? 'phone' : 'email',
      status: 'pending',
      metadata: { preferred_login_method: data.preferred_login_method, supports_email: Boolean(data.email), supports_phone: Boolean(data.phone), supports_whatsapp: Boolean(data.whatsapp) },
      requested_by: validUuid(context?.actorId) ? context?.actorId : null
    };
    await supabase.from('customer_auth_actions').insert(actionRow);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'register_customer', object_type: 'customer_auth', object_id: data.customer_id, after_data: data });
    return NextResponse.json({ ok: true, customer: data });
  }

  if (action === 'create_auth_action') {
    const actionType = actionTypes.includes(String(body.action_type)) ? String(body.action_type) : 'email_recovery_link';
    const delivery = deliveryChannels.includes(String(body.delivery_channel)) ? String(body.delivery_channel) : 'email';
    const row = {
      customer_id: validUuid(body.customer_id) ? body.customer_id : null,
      auth_user_id: validUuid(body.auth_user_id) ? body.auth_user_id : null,
      username: normalizeUsername(body.username),
      email: cleanText(body.email) || null,
      phone: cleanText(body.phone) || null,
      whatsapp: cleanText(body.whatsapp) || null,
      action_type: actionType,
      delivery_channel: delivery,
      status: delivery === 'admin' ? 'completed' : 'pending',
      metadata: safeJson(body.metadata, { created_from: 'auth_management_center' }),
      requested_by: validUuid(context?.actorId) ? context?.actorId : null,
      completed_at: delivery === 'admin' ? new Date().toISOString() : null
    };
    const { data, error } = await supabase.from('customer_auth_actions').insert(row).select(actionColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: actionType, object_type: 'customer_auth_action', object_id: data.action_id, after_data: data });
    return NextResponse.json({ ok: true, authAction: data });
  }

  return jsonError('Unsupported action.', 400);
}
