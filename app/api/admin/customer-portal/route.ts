import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { getCustomerPortalSection } from '@/lib/nanofix/customerPortalConfig';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const customerColumns = 'customer_id,name,email,phone,whatsapp,status,account_status,binding_status,created_at,updated_at';
const requestColumns = 'service_request_id,intake_id,lead_id,customer_id,contact_name,phone,whatsapp,email,issue_type,issue_description,leak_location,property_address,address_text,postal_code,property_type,preferred_time_text,source_platform,status,binding_status,priority,consent,created_at,updated_at';
const quoteColumns = 'quotation_id,customer_id,service_request_id,version,total_amount,currency,valid_until,status,created_at,updated_at';
const invoiceColumns = 'invoice_id,invoice_no,customer_id,job_id,total_amount,currency,due_date,status,created_at';
const paymentColumns = 'payment_id,invoice_id,customer_id,gateway,transaction_id,amount,currency,status,reconciled_at,created_at';
const receiptColumns = 'receipt_id,receipt_no,payment_id,invoice_id,status,issued_at,created_at';
const warrantyColumns = 'warranty_id,job_id,customer_id,coverage,starts_on,ends_on,status,created_at';
const versionColumns = 'version_id,customer_id,section_key,entity_type,entity_id,version_no,status,snapshot_json,published_by,published_at,created_at';

const versionStatuses = ['draft', 'approved', 'published', 'archived', 'cancelled'];
const requestStatuses = ['pending_review', 'scheduled', 'inspected', 'quoted', 'approved', 'cancelled'];
const priorities = ['P0', 'P1', 'P2', 'P3'];

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

async function listCustomers(search: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('customers').select(customerColumns).order('updated_at', { ascending: false }).limit(80);
  const q = cleanSearch(search);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,whatsapp.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listRequests(search: string | null, status: string | null, customerId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('service_requests').select(requestColumns).order('created_at', { ascending: false }).limit(120);
  if (validUuid(customerId)) query = query.eq('customer_id', customerId);
  if (status && requestStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`contact_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,issue_type.ilike.%${q}%,issue_description.ilike.%${q}%,property_address.ilike.%${q}%,address_text.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listTable(table: 'quotations' | 'invoices' | 'payments' | 'receipts' | 'warranties', columns: string, search: string | null, status: string | null, customerId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from(table).select(columns).order('created_at', { ascending: false }).limit(120);
  if (validUuid(customerId) && table !== 'receipts') query = query.eq('customer_id', customerId);
  if (status) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q && table === 'invoices') query = query.or(`invoice_no.ilike.%${q}%,status.ilike.%${q}%`);
  if (q && table === 'payments') query = query.or(`gateway.ilike.%${q}%,transaction_id.ilike.%${q}%,status.ilike.%${q}%`);
  if (q && table === 'receipts') query = query.or(`receipt_no.ilike.%${q}%,status.ilike.%${q}%`);
  if (q && table === 'warranties') query = query.or(`coverage.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listVersions(search: string | null, status: string | null, sectionKey: string | null, customerId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('customer_portal_versions').select(versionColumns).order('created_at', { ascending: false }).limit(100);
  if (sectionKey) query = query.eq('section_key', sectionKey);
  if (validUuid(customerId)) query = query.eq('customer_id', customerId);
  if (status && versionStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`section_key.ilike.%${q}%,entity_type.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

function buildRequestPayload(body: Payload) {
  const issueType = cleanText(body.issue_type, 'water_leak');
  return {
    customer_id: validUuid(body.customer_id) ? body.customer_id : null,
    contact_name: cleanText(body.contact_name || body.name, 'Customer Portal Request'),
    phone: cleanText(body.phone),
    whatsapp: cleanText(body.whatsapp),
    email: cleanText(body.email),
    issue_type: issueType,
    issue_description: cleanText(body.issue_description || body.message),
    leak_location: cleanText(body.leak_location),
    property_address: cleanText(body.property_address || body.address_text),
    address_text: cleanText(body.address_text || body.property_address),
    postal_code: cleanText(body.postal_code),
    property_type: cleanText(body.property_type),
    preferred_time_text: cleanText(body.preferred_time_text),
    source_platform: cleanText(body.source_platform, 'manual'),
    status: requestStatuses.includes(String(body.status)) ? String(body.status) : 'pending_review',
    binding_status: validUuid(body.customer_id) ? 'linked' : 'pending',
    priority: priorities.includes(String(body.priority)) ? String(body.priority) : 'P2',
    consent: body.consent !== false,
    admin_approval_required: true,
    address_json: safeJson(body.address_json, {})
  };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:customers');
  if (response) return response;
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'all';
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');
  const customerId = url.searchParams.get('customer_id');
  const sectionKey = url.searchParams.get('section_key');

  if (mode === 'customers') {
    const customers = await listCustomers(search);
    if (!customers.ok) return jsonError(customers.error, customers.status);
    return NextResponse.json({ ok: true, customers: customers.data });
  }
  if (mode === 'requests') {
    const requests = await listRequests(search, status, customerId);
    if (!requests.ok) return jsonError(requests.error, requests.status);
    return NextResponse.json({ ok: true, requests: requests.data });
  }
  if (mode === 'quotes') {
    const quotes = await listTable('quotations', quoteColumns, search, status, customerId);
    if (!quotes.ok) return jsonError(quotes.error, quotes.status);
    return NextResponse.json({ ok: true, quotes: quotes.data });
  }
  if (mode === 'invoices') {
    const invoices = await listTable('invoices', invoiceColumns, search, status, customerId);
    if (!invoices.ok) return jsonError(invoices.error, invoices.status);
    return NextResponse.json({ ok: true, invoices: invoices.data });
  }
  if (mode === 'payments') {
    const [payments, receipts] = await Promise.all([listTable('payments', paymentColumns, search, status, customerId), listTable('receipts', receiptColumns, search, status, customerId)]);
    if (!payments.ok) return jsonError(payments.error, payments.status);
    if (!receipts.ok) return jsonError(receipts.error, receipts.status);
    return NextResponse.json({ ok: true, payments: payments.data, receipts: receipts.data });
  }
  if (mode === 'warranties') {
    const warranties = await listTable('warranties', warrantyColumns, search, status, customerId);
    if (!warranties.ok) return jsonError(warranties.error, warranties.status);
    return NextResponse.json({ ok: true, warranties: warranties.data });
  }
  if (mode === 'versions') {
    const versions = await listVersions(search, status, sectionKey, customerId);
    if (!versions.ok) return jsonError(versions.error, versions.status);
    return NextResponse.json({ ok: true, versions: versions.data });
  }

  const [customers, requests, quotes, invoices, payments, receipts, warranties, versions] = await Promise.all([
    listCustomers(search),
    listRequests(search, null, customerId),
    listTable('quotations', quoteColumns, search, null, customerId),
    listTable('invoices', invoiceColumns, search, null, customerId),
    listTable('payments', paymentColumns, search, null, customerId),
    listTable('receipts', receiptColumns, search, null, customerId),
    listTable('warranties', warrantyColumns, search, null, customerId),
    listVersions(search, null, sectionKey, customerId)
  ]);
  for (const result of [customers, requests, quotes, invoices, payments, receipts, warranties, versions]) if (!result.ok) return jsonError(result.error, result.status);
  return NextResponse.json({ ok: true, customers: customers.data, requests: requests.data, quotes: quotes.data, invoices: invoices.data, payments: payments.data, receipts: receipts.data, warranties: warranties.data, versions: versions.data });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:customers');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'create_request') {
    const payload = buildRequestPayload(body);
    const { data, error } = await supabase.from('service_requests').insert(payload).select(requestColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'customer_portal_service_request', object_id: data.service_request_id, after_data: data });
    return NextResponse.json({ ok: true, request: data });
  }
  return jsonError('Unsupported action.', 400);
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:customers');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'save_version') {
    const section = getCustomerPortalSection(cleanText(body.section_key));
    const sectionKey = section?.key || cleanText(body.section_key, 'general');
    const status = versionStatuses.includes(String(body.status)) ? String(body.status) : 'approved';
    const entityId = validUuid(body.entity_id) ? String(body.entity_id) : null;
    const customerId = validUuid(body.customer_id) ? String(body.customer_id) : null;
    const { data: existing, error: versionError } = await supabase.from('customer_portal_versions').select('version_no').eq('section_key', sectionKey).order('version_no', { ascending: false }).limit(1);
    if (versionError) return jsonError(versionError.message, 500);
    const versionNo = Number(existing?.[0]?.version_no || 0) + 1;
    const snapshot = safeJson(body.snapshot_json, { section_key: sectionKey, created_at: new Date().toISOString() });
    const { data, error } = await supabase.from('customer_portal_versions').insert({ customer_id: customerId, section_key: sectionKey, entity_type: cleanText(body.entity_type, 'portal_record'), entity_id: entityId, version_no: versionNo, status, snapshot_json: snapshot, published_by: validUuid(context?.actorId) ? context?.actorId : null }).select(versionColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'save_version', object_type: 'customer_portal_version', object_id: data.version_id, after_data: data });
    return NextResponse.json({ ok: true, version: data });
  }
  return jsonError('Unsupported action.', 400);
}
