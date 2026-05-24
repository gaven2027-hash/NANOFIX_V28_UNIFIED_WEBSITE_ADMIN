import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { getCustomerCenterSection } from '@/lib/nanofix/customerCenterConfig';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const customerColumns = 'customer_id,auth_user_id,profile_id,name,email,phone,whatsapp,status,account_status,binding_status,address_json,tags,risk_tags,vip_tags,created_at,updated_at';
const recordColumns = 'record_id,section_key,category,customer_id,title,body,config_json,status,created_by,updated_by,created_at,updated_at';
const bindingColumns = 'suggestion_id,service_request_id,customer_id,match_score,match_reasons,status,reviewed_by,created_at,updated_at';
const pdpaColumns = 'request_id,customer_id,request_type,status,details,owner_id,created_at';
const versionColumns = 'version_id,record_id,customer_id,section_key,version_no,status,snapshot_json,published_by,published_at,created_at';

const recordStatuses = ['draft', 'active', 'pending_review', 'approved', 'archived', 'disabled', 'blacklisted', 'frozen'];
const customerStatuses = ['active', 'pending_verification', 'suspended'];
const accountStatuses = ['active', 'disabled', 'frozen', 'blacklisted', 'archived'];
const bindingStatuses = ['pending', 'linked', 'unlinked'];
const versionStatuses = ['draft', 'approved', 'published', 'archived', 'cancelled'];
const pdpaStatuses = ['open', 'verifying', 'completed', 'rejected'];

const linkedTables: Record<string, { table: string; columns: string; customerField: string; orderField: string }> = {
  leads: { table: 'leads', columns: 'lead_id,customer_id,name,phone,email,address,source_platform,status,priority,created_at,updated_at', customerField: 'customer_id', orderField: 'created_at' },
  service_requests: { table: 'service_requests', columns: 'service_request_id,customer_id,contact_name,phone,email,issue_type,address_text,status,priority,created_at,updated_at', customerField: 'customer_id', orderField: 'created_at' },
  jobs: { table: 'jobs', columns: 'job_id,service_request_id,quotation_id,engineer_id,scheduled_at,status,completion_notes,created_at,updated_at', customerField: 'service_request_id', orderField: 'created_at' },
  quotations: { table: 'quotations', columns: 'quotation_id,customer_id,service_request_id,version,total_amount,currency,valid_until,status,created_at,updated_at', customerField: 'customer_id', orderField: 'created_at' },
  invoices: { table: 'invoices', columns: 'invoice_id,invoice_no,customer_id,job_id,total_amount,currency,due_date,status,created_at', customerField: 'customer_id', orderField: 'created_at' },
  payments: { table: 'payments', columns: 'payment_id,invoice_id,customer_id,gateway,transaction_id,amount,currency,status,reconciled_at,created_at', customerField: 'customer_id', orderField: 'created_at' },
  receipts: { table: 'receipts', columns: 'receipt_id,receipt_no,payment_id,invoice_id,status,issued_at,created_at', customerField: 'invoice_id', orderField: 'created_at' },
  warranties: { table: 'warranties', columns: 'warranty_id,job_id,customer_id,coverage,starts_on,ends_on,status,created_at', customerField: 'customer_id', orderField: 'created_at' }
};

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

function toArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
}

function buildCustomerPayload(body: Payload) {
  const payload: Payload = {
    name: cleanText(body.name, 'Unnamed Customer'),
    email: cleanText(body.email) || null,
    phone: cleanText(body.phone) || null,
    whatsapp: cleanText(body.whatsapp) || null,
    status: customerStatuses.includes(String(body.status)) ? String(body.status) : 'active',
    account_status: accountStatuses.includes(String(body.account_status)) ? String(body.account_status) : 'active',
    binding_status: bindingStatuses.includes(String(body.binding_status)) ? String(body.binding_status) : 'linked',
    address_json: safeJson(body.address_json, {})
  };
  if ('tags' in body) payload.tags = toArray(body.tags);
  if ('risk_tags' in body) payload.risk_tags = toArray(body.risk_tags);
  if ('vip_tags' in body) payload.vip_tags = toArray(body.vip_tags);
  return payload;
}

function buildRecordPayload(body: Payload, actorId?: string) {
  const section = getCustomerCenterSection(cleanText(body.section_key));
  const status = recordStatuses.includes(String(body.status)) ? String(body.status) : 'draft';
  const payload: Payload = {
    section_key: section?.key || cleanText(body.section_key, 'customers'),
    category: cleanText(body.category, section?.category || 'general'),
    customer_id: validUuid(body.customer_id) ? body.customer_id : null,
    title: cleanText(body.title, section?.title || 'Customer Center Record'),
    body: cleanText(body.body),
    config_json: safeJson(body.config_json, {}),
    status
  };
  if (validUuid(actorId)) payload.updated_by = actorId;
  return payload;
}

async function listCustomers(search: string | null, status: string | null, accountStatus: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('customers').select(customerColumns).order('updated_at', { ascending: false }).limit(120);
  if (status && customerStatuses.includes(status)) query = query.eq('status', status);
  if (accountStatus && accountStatuses.includes(accountStatus)) query = query.eq('account_status', accountStatus);
  const q = cleanSearch(search);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,whatsapp.ilike.%${q}%,binding_status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listRecords(search: string | null, status: string | null, sectionKey: string | null, category: string | null, customerId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('customer_center_records').select(recordColumns).order('updated_at', { ascending: false }).limit(120);
  if (sectionKey) query = query.eq('section_key', sectionKey);
  if (category && category !== 'all') query = query.eq('category', category);
  if (validUuid(customerId)) query = query.eq('customer_id', customerId);
  if (status && recordStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%,section_key.ilike.%${q}%,category.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listBinding(search: string | null, status: string | null, customerId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('customer_binding_suggestions').select(bindingColumns).order('updated_at', { ascending: false }).limit(120);
  if (validUuid(customerId)) query = query.eq('customer_id', customerId);
  if (status && ['suggested', 'approved', 'rejected'].includes(status)) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listPdpa(search: string | null, status: string | null, customerId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('pdpa_requests').select(pdpaColumns).order('created_at', { ascending: false }).limit(120);
  if (validUuid(customerId)) query = query.eq('customer_id', customerId);
  if (status && pdpaStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`request_type.ilike.%${q}%,details.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function listLinked(category: string | null, customerId: string | null, search: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  const safeCategory = category && linkedTables[category] ? category : 'leads';
  const config = linkedTables[safeCategory];
  let query = supabase.from(config.table).select(config.columns).order(config.orderField, { ascending: false }).limit(120);
  if (validUuid(customerId) && ['leads', 'service_requests', 'quotations', 'invoices', 'payments', 'warranties'].includes(safeCategory)) query = query.eq('customer_id', customerId);
  const q = cleanSearch(search);
  if (q && ['leads', 'service_requests'].includes(safeCategory)) query = query.or(`name.ilike.%${q}%,contact_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,issue_type.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [], category: safeCategory };
}

async function listVersions(search: string | null, status: string | null, sectionKey: string | null, customerId: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('customer_center_versions').select(versionColumns).order('created_at', { ascending: false }).limit(100);
  if (sectionKey) query = query.eq('section_key', sectionKey);
  if (validUuid(customerId)) query = query.eq('customer_id', customerId);
  if (status && versionStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search);
  if (q) query = query.or(`section_key.ilike.%${q}%,status.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:customers');
  if (response) return response;
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'all';
  const sectionKey = url.searchParams.get('section_key');
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const accountStatus = url.searchParams.get('account_status');
  const customerId = url.searchParams.get('customer_id');
  const search = url.searchParams.get('search');

  const loaders = {
    customers: () => listCustomers(search, status, accountStatus),
    records: () => listRecords(search, status, sectionKey, category, customerId),
    binding: () => listBinding(search, status, customerId),
    pdpa: () => listPdpa(search, status, customerId),
    linked: () => listLinked(category, customerId, search),
    versions: () => listVersions(search, status, sectionKey, customerId)
  } as const;

  if (mode in loaders) {
    const result = await loaders[mode as keyof typeof loaders]();
    if (!result.ok) return jsonError(result.error, result.status);
    return NextResponse.json({ ok: true, [mode]: result.data, category: 'category' in result ? result.category : category });
  }

  const [customers, records, binding, pdpa, linked, versions] = await Promise.all([
    listCustomers(search, null, accountStatus),
    listRecords(search, null, sectionKey, category, customerId),
    listBinding(search, null, customerId),
    listPdpa(search, null, customerId),
    listLinked(category, customerId, search),
    listVersions(search, null, sectionKey, customerId)
  ]);
  if (!customers.ok) return jsonError(customers.error, customers.status);
  if (!records.ok) return jsonError(records.error, records.status);
  if (!binding.ok) return jsonError(binding.error, binding.status);
  if (!pdpa.ok) return jsonError(pdpa.error, pdpa.status);
  if (!linked.ok) return jsonError(linked.error, linked.status);
  if (!versions.ok) return jsonError(versions.error, versions.status);

  return NextResponse.json({ ok: true, customers: customers.data, records: records.data, binding: binding.data, pdpa: pdpa.data, linked: linked.data, linkedCategory: linked.category, versions: versions.data });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:customers');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'create_customer') {
    const payload = buildCustomerPayload(body);
    const { data, error } = await supabase.from('customers').insert(payload).select(customerColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'customer', object_id: data.customer_id, after_data: data });
    return NextResponse.json({ ok: true, customer: data });
  }

  if (action === 'create_record') {
    const payload = buildRecordPayload(body, context?.actorId);
    if (validUuid(context?.actorId)) payload.created_by = context?.actorId;
    const { data, error } = await supabase.from('customer_center_records').insert(payload).select(recordColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'customer_center_record', object_id: data.record_id, after_data: data });
    return NextResponse.json({ ok: true, record: data });
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

  if (action === 'update_customer') {
    const customerId = String(body.customer_id || '');
    if (!validUuid(customerId)) return jsonError('A valid customer_id is required.');
    const payload = buildCustomerPayload(body);
    const { data: before } = await supabase.from('customers').select(customerColumns).eq('customer_id', customerId).maybeSingle();
    const { data, error } = await supabase.from('customers').update(payload).eq('customer_id', customerId).select(customerColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'customer', object_id: customerId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, customer: data });
  }

  if (action === 'update_record') {
    const recordId = String(body.record_id || '');
    if (!validUuid(recordId)) return jsonError('A valid record_id is required.');
    const payload = buildRecordPayload(body, context?.actorId);
    const { data: before } = await supabase.from('customer_center_records').select(recordColumns).eq('record_id', recordId).maybeSingle();
    const { data, error } = await supabase.from('customer_center_records').update(payload).eq('record_id', recordId).select(recordColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'customer_center_record', object_id: recordId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, record: data });
  }

  if (action === 'review_binding') {
    const suggestionId = String(body.suggestion_id || '');
    const status = ['approved', 'rejected', 'suggested'].includes(String(body.status)) ? String(body.status) : 'suggested';
    if (!validUuid(suggestionId)) return jsonError('A valid suggestion_id is required.');
    const { data: before } = await supabase.from('customer_binding_suggestions').select(bindingColumns).eq('suggestion_id', suggestionId).maybeSingle();
    const { data, error } = await supabase.from('customer_binding_suggestions').update({ status, reviewed_by: context?.actorId || null, updated_at: new Date().toISOString() }).eq('suggestion_id', suggestionId).select(bindingColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'review_binding', object_type: 'customer_binding_suggestion', object_id: suggestionId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, binding: data });
  }

  if (action === 'save_version') {
    const recordId = String(body.record_id || '');
    const customerId = String(body.customer_id || '');
    const sectionKey = cleanText(body.section_key, 'general');
    const status = versionStatuses.includes(String(body.status)) ? String(body.status) : 'approved';
    const { data: existing, error: versionError } = await supabase.from('customer_center_versions').select('version_no').eq('section_key', sectionKey).order('version_no', { ascending: false }).limit(1);
    if (versionError) return jsonError(versionError.message, 500);
    const versionNo = Number(existing?.[0]?.version_no || 0) + 1;
    const snapshot = safeJson(body.snapshot_json, { section_key: sectionKey, status, created_at: new Date().toISOString() });
    const { data, error } = await supabase.from('customer_center_versions').insert({ record_id: validUuid(recordId) ? recordId : null, customer_id: validUuid(customerId) ? customerId : null, section_key: sectionKey, version_no: versionNo, status, snapshot_json: snapshot, published_by: validUuid(context?.actorId) ? context?.actorId : null }).select(versionColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'save_version', object_type: 'customer_center_version', object_id: data.version_id, after_data: data });
    return NextResponse.json({ ok: true, version: data });
  }

  return jsonError('Unsupported action.', 400);
}
