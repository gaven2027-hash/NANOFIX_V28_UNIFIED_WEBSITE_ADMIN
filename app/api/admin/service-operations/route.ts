export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const MACHINES = ['lead', 'service_request', 'inspection', 'quotation', 'job', 'invoice', 'payment', 'receipt', 'warranty'] as const;
type Machine = typeof MACHINES[number];
type ApiPayload = Record<string, unknown>;

type QuerySpec = {
  key: string;
  machine: Machine;
  table: string;
  idColumn: string;
  select: string;
  statusColumn: string;
  order?: string;
  limit: number;
};

const READ_QUERIES: QuerySpec[] = [
  { key: 'leads', machine: 'lead', table: 'leads', idColumn: 'lead_id', statusColumn: 'status', select: 'lead_id,name,phone,email,source_platform,request_origin,customer_portal_request_type,related_warranty_id,priority,status,binding_status,created_at,updated_at', limit: 12 },
  { key: 'service_requests', machine: 'service_request', table: 'service_requests', idColumn: 'service_request_id', statusColumn: 'status', select: 'service_request_id,customer_id,contact_name,phone,whatsapp,email,address_text,issue_type,leak_location,status,binding_status,request_origin,customer_portal_request_type,related_warranty_id,portal_attachment_urls,portal_customer_notes,created_at,updated_at', limit: 12 },
  { key: 'jobs', machine: 'job', table: 'jobs', idColumn: 'job_id', statusColumn: 'status', select: 'job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at', limit: 12 },
  { key: 'quotations', machine: 'quotation', table: 'quotations', idColumn: 'quotation_id', statusColumn: 'approval_status', select: 'quotation_id,job_id,current_version,total,approval_status,created_at', limit: 12 },
  { key: 'invoices', machine: 'invoice', table: 'invoices', idColumn: 'invoice_id', statusColumn: 'status', select: 'invoice_id,invoice_no,job_id,total,status,created_at', limit: 12 },
  { key: 'payments', machine: 'payment', table: 'payments', idColumn: 'payment_id', statusColumn: 'status', select: 'payment_id,invoice_id,amount,status,fee,reconciled_at,created_at', limit: 12 },
  { key: 'warranties', machine: 'warranty', table: 'warranties', idColumn: 'warranty_id', statusColumn: 'status', select: 'warranty_id,job_id,status,coverage,starts_at,ends_at,created_at', limit: 12 },
  { key: 'status_logs', machine: 'receipt', table: 'status_transition_logs', idColumn: 'transition_id', statusColumn: 'to_status', select: 'transition_id,machine,object_id,from_status,to_status,reason,actor_role,created_at', limit: 20 }
];

const writableFields: Record<Machine, string[]> = {
  lead: ['name', 'phone', 'email', 'address', 'address_text', 'issue_type', 'message', 'source_platform', 'request_origin', 'customer_portal_request_type', 'related_warranty_id', 'priority', 'status', 'binding_status'],
  service_request: ['contact_name', 'phone', 'whatsapp', 'email', 'address_text', 'postal_code', 'leak_location', 'issue_description', 'property_type', 'property_address', 'preferred_time_text', 'status', 'binding_status', 'request_origin', 'customer_portal_request_type', 'related_warranty_id', 'portal_attachment_urls', 'portal_customer_notes', 'consent', 'admin_approval_required'],
  inspection: ['status'],
  quotation: ['job_id', 'current_version', 'total', 'approval_status'],
  job: ['service_request_id', 'customer_id', 'engineer_id', 'status', 'scheduled_at', 'notes'],
  invoice: ['invoice_no', 'job_id', 'total', 'status', 'void_reason'],
  payment: ['invoice_id', 'amount', 'status', 'fee', 'reconciled_at'],
  receipt: ['status'],
  warranty: ['job_id', 'status', 'coverage', 'starts_at', 'ends_at']
};

function clampLimit(value: string | null) {
  const parsed = Number(value ?? 12);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(Math.max(Math.floor(parsed), 1), 50);
}

function isMachine(value: string | null): value is Machine {
  return Boolean(value && MACHINES.includes(value as Machine));
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function specForMachine(machine: Machine) {
  return READ_QUERIES.find((spec) => spec.machine === machine && spec.key !== 'status_logs') ?? null;
}

function cleanNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function cleanDateText(value: unknown) {
  const text = cleanText(value, 80);
  return text || null;
}

function sanitizeField(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (['total', 'amount', 'fee'].includes(field)) return cleanNumber(value);
  if (['current_version'].includes(field)) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  if (['consent', 'admin_approval_required'].includes(field)) return cleanBoolean(value);
  if (field === 'portal_attachment_urls') return Array.isArray(value) ? value.map((item) => cleanText(item, 700)).filter(Boolean).slice(0, 12) : [];
  if (field.endsWith('_id') || field === 'job_id' || field === 'invoice_id' || field === 'customer_id' || field === 'engineer_id' || field === 'service_request_id') {
    const text = cleanText(value, 120);
    return isUuid(text) ? text : null;
  }
  if (['scheduled_at', 'reconciled_at', 'starts_at', 'ends_at'].includes(field)) return cleanDateText(value);
  return cleanText(value, field.includes('message') || field.includes('description') || field === 'notes' || field === 'portal_customer_notes' ? 1000 : 240);
}

function sanitizePatch(machine: Machine, payload: Record<string, unknown>) {
  const allowed = writableFields[machine] ?? [];
  const patch: Record<string, unknown> = {};
  for (const field of allowed) {
    if (!(field in payload)) continue;
    const value = sanitizeField(field, payload[field]);
    if (value !== undefined) patch[field] = value;
  }
  return patch;
}

function creationPayload(machine: Machine, body: ApiPayload) {
  const title = cleanText(body.title, 180) ?? cleanText(body.name, 180) ?? 'Admin created record';
  const phone = cleanText(body.phone, 80);
  const email = cleanText(body.email, 160);
  const notes = cleanText(body.notes, 1000) ?? cleanText(body.description, 1000) ?? 'Created from Service Operations live core.';
  const amount = cleanNumber(body.amount) ?? cleanNumber(body.total) ?? 0;
  const base = sanitizePatch(machine, body);

  if (machine === 'lead') return { source_platform: 'admin', request_origin: 'admin', priority: 'P2', status: 'new', binding_status: 'pending', name: title, phone, email, message: notes, ...base };
  if (machine === 'service_request') return { contact_name: title, phone, email, issue_description: notes, issue_type: cleanText(body.issue_type, 120) ?? 'General leakage inspection', status: 'pending_review', binding_status: 'pending', request_origin: 'admin', consent: true, admin_approval_required: true, ...base };
  if (machine === 'job') return { status: 'assigned', notes, ...base };
  if (machine === 'quotation') return { current_version: 1, total: amount, approval_status: 'draft', ...base };
  if (machine === 'invoice') return { invoice_no: cleanText(body.invoice_no, 120) ?? `NF-DRAFT-${Date.now()}`, total: amount, status: 'draft', ...base };
  if (machine === 'payment') return { amount, fee: cleanNumber(body.fee) ?? 0, status: 'processing', ...base };
  if (machine === 'warranty') return { status: 'draft', coverage: notes, ...base };
  return base;
}

async function safeList(supabase: ReturnType<typeof createAdminClient>, spec: QuerySpec, limit: number) {
  const { data, error } = await supabase
    .from(spec.table)
    .select(spec.select)
    .order(spec.order ?? 'created_at', { ascending: false })
    .limit(Math.min(limit, spec.limit));
  return { key: spec.key, data: data ?? [], error: error?.message ?? null };
}

function countRows(payload: Record<string, unknown[]>) {
  return Object.fromEntries(Object.entries(payload).map(([key, rows]) => [key, rows.length]));
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const machineParam = cleanText(request.nextUrl.searchParams.get('machine'), 80);
  const objectId = cleanText(request.nextUrl.searchParams.get('object_id'), 120);
  const supabase = createAdminClient();

  if (isMachine(machineParam) && isUuid(objectId)) {
    const spec = specForMachine(machineParam);
    if (!spec) return jsonError('Unsupported detail machine.', 400);
    const { data, error } = await supabase.from(spec.table).select(spec.select).eq(spec.idColumn, objectId).maybeSingle();
    if (error) return jsonError(error.message, 500);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_live_core_detail_read', objectType: machineParam, objectId, after: { found: Boolean(data) }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, machine: machineParam, record: data ?? null });
  }

  const limit = clampLimit(request.nextUrl.searchParams.get('limit'));
  const settled = await Promise.all(READ_QUERIES.map((spec) => safeList(supabase, spec, limit)));
  const payload: Record<string, unknown[]> = {};
  const errors: string[] = [];

  for (const result of settled) {
    payload[result.key] = result.data as unknown[];
    if (result.error) errors.push(`${result.key}: ${result.error}`);
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_live_core_read',
    objectType: 'service_operations',
    after: { limit, ok: errors.length === 0, counts: countRows(payload) },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: errors.length === 0, degraded: errors.length > 0, errors, ...payload }, { status: errors.length ? 207 : 200 });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const machine = cleanText(body.machine, 80);
  if (!isMachine(machine)) return jsonError('Unsupported machine for Service Operations create.', 400);
  if (machine === 'inspection' || machine === 'receipt') return jsonError('Create for this machine is not enabled in Phase A.2.', 400);

  const spec = specForMachine(machine);
  if (!spec) return jsonError('Unsupported create machine.', 400);
  const payload = creationPayload(machine, body);
  if (!Object.keys(payload).length) return jsonError('No supported fields to create record.', 400);

  const supabase = createAdminClient();
  const { data, error } = await supabase.from(spec.table).insert(payload).select(spec.select).single();
  if (error) return jsonError(error.message, 400);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_live_core_record_create',
    objectType: machine,
    objectId: typeof data?.[spec.idColumn] === 'string' ? data[spec.idColumn] : undefined,
    after: data as Record<string, unknown>,
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, machine, record: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 80) ?? 'transition';
  const machine = cleanText(body.machine, 80);
  const objectId = cleanText(body.object_id, 120);
  if (!isMachine(machine)) return jsonError('Unsupported machine for Service Operations update.', 400);
  if (!isUuid(objectId)) return jsonError('Valid object_id UUID is required.', 400);

  if (action === 'update') {
    const spec = specForMachine(machine);
    if (!spec) return jsonError('Unsupported update machine.', 400);
    const dataPayload = typeof body.data === 'object' && body.data && !Array.isArray(body.data) ? body.data as Record<string, unknown> : body;
    const patch = sanitizePatch(machine, dataPayload);
    delete patch[spec.idColumn];
    if (!Object.keys(patch).length) return jsonError('No supported fields to update.', 400);

    const supabase = createAdminClient();
    const { data: before } = await supabase.from(spec.table).select(spec.select).eq(spec.idColumn, objectId).maybeSingle();
    const { data, error } = await supabase.from(spec.table).update(patch).eq(spec.idColumn, objectId).select(spec.select).single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({
      actorId: auth.actor.profileId,
      role: auth.role,
      action: 'service_operations_live_core_record_update',
      objectType: machine,
      objectId,
      before: before as Record<string, unknown> | null,
      after: data as Record<string, unknown>,
      ip: getClientIp(request)
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, machine, record: data });
  }

  const toStatus = cleanText(body.to_status, 80);
  const reason = cleanText(body.reason, 500) ?? 'Service Operations live core status update';
  if (!toStatus) return jsonError('to_status is required.', 400);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('transition_status_tx', {
    p_machine: machine,
    p_object_id: objectId,
    p_to_status: toStatus,
    p_reason: reason,
    p_actor_id: auth.actor.profileId,
    p_actor_role: auth.role,
    p_ip: getClientIp(request) ?? ''
  });

  if (error) return jsonError(error.message, 400);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_live_core_status_patch',
    objectType: machine,
    objectId,
    after: { transition: data, reason },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, transition: data });
}
