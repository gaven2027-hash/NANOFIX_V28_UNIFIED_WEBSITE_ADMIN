export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { writeStatusTransitionLog } from '@/lib/statusTransition';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const MACHINES = ['lead', 'service_request', 'inspection', 'quotation', 'job', 'invoice', 'payment', 'receipt', 'warranty'] as const;
type Machine = typeof MACHINES[number];
type ApiPayload = Record<string, unknown>;
type Row = Record<string, unknown>;

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
  { key: 'service_requests', machine: 'service_request', table: 'service_requests', idColumn: 'service_request_id', statusColumn: 'status', select: 'service_request_id,customer_id,lead_id,intake_id,contact_name,phone,whatsapp,email,address_text,issue_type,leak_location,status,binding_status,request_origin,customer_portal_request_type,related_warranty_id,portal_attachment_urls,portal_customer_notes,created_at,updated_at', limit: 12 },
  { key: 'jobs', machine: 'job', table: 'jobs', idColumn: 'job_id', statusColumn: 'status', select: 'job_id,service_request_id,quotation_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at', limit: 12 },
  { key: 'quotations', machine: 'quotation', table: 'quotations', idColumn: 'quotation_id', statusColumn: 'status', select: 'quotation_id,service_request_id,customer_id,version,total_amount,currency,status,created_at,updated_at', limit: 12 },
  { key: 'invoices', machine: 'invoice', table: 'invoices', idColumn: 'invoice_id', statusColumn: 'status', select: 'invoice_id,invoice_no,customer_id,job_id,quotation_id,total_amount,currency,status,visible_to_customer,created_at', limit: 12 },
  { key: 'payments', machine: 'payment', table: 'payments', idColumn: 'payment_id', statusColumn: 'status', select: 'payment_id,invoice_id,customer_id,amount,currency,status,reconciled_at,created_at', limit: 12 },
  { key: 'warranties', machine: 'warranty', table: 'warranties', idColumn: 'warranty_id', statusColumn: 'status', select: 'warranty_id,job_id,customer_id,invoice_id,quotation_id,status,coverage,starts_on,ends_on,visible_to_customer,public_ref,created_at', limit: 12 },
  { key: 'status_logs', machine: 'receipt', table: 'status_transition_logs', idColumn: 'transition_id', statusColumn: 'to_status', select: 'transition_id,machine,object_type,object_id,from_status,to_status,reason,actor_role,created_at', limit: 20 }
];

const writableFields: Record<Machine, string[]> = {
  lead: ['name', 'phone', 'email', 'address', 'address_text', 'issue_type', 'message', 'source_platform', 'request_origin', 'customer_portal_request_type', 'related_warranty_id', 'priority', 'status', 'binding_status'],
  service_request: ['customer_id', 'lead_id', 'intake_id', 'contact_name', 'phone', 'whatsapp', 'email', 'address_text', 'postal_code', 'leak_location', 'issue_description', 'issue_type', 'property_type', 'property_address', 'preferred_time_text', 'status', 'binding_status', 'request_origin', 'customer_portal_request_type', 'related_warranty_id', 'portal_attachment_urls', 'portal_customer_notes', 'consent', 'admin_approval_required'],
  inspection: ['status'],
  quotation: ['service_request_id', 'customer_id', 'version', 'total_amount', 'currency', 'status'],
  job: ['service_request_id', 'quotation_id', 'customer_id', 'engineer_id', 'status', 'scheduled_at', 'notes'],
  invoice: ['invoice_no', 'customer_id', 'job_id', 'quotation_id', 'total_amount', 'currency', 'status', 'visible_to_customer'],
  payment: ['invoice_id', 'customer_id', 'amount', 'currency', 'status', 'reconciled_at'],
  receipt: ['status'],
  warranty: ['job_id', 'customer_id', 'invoice_id', 'quotation_id', 'status', 'coverage', 'starts_on', 'ends_on', 'visible_to_customer', 'public_ref']
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
  if (['total_amount', 'amount'].includes(field)) return cleanNumber(value);
  if (['version'].includes(field)) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  if (['visible_to_customer', 'consent', 'admin_approval_required'].includes(field)) return cleanBoolean(value);
  if (field === 'portal_attachment_urls') return Array.isArray(value) ? value.map((item) => cleanText(item, 700)).filter(Boolean).slice(0, 12) : [];
  if (field.endsWith('_id') || ['job_id', 'invoice_id', 'customer_id', 'engineer_id', 'service_request_id', 'quotation_id', 'lead_id', 'intake_id'].includes(field)) {
    const text = cleanText(value, 120);
    return isUuid(text) ? text : null;
  }
  if (['scheduled_at', 'reconciled_at', 'starts_on', 'ends_on'].includes(field)) return cleanDateText(value);
  if (field === 'currency') return (cleanText(value, 8) ?? 'SGD').toUpperCase();
  return cleanText(value, field.includes('message') || field.includes('description') || field === 'notes' || field === 'portal_customer_notes' || field === 'coverage' ? 1000 : 240);
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
  const amount = cleanNumber(body.amount) ?? cleanNumber(body.total_amount) ?? cleanNumber(body.total) ?? 0;
  const base = sanitizePatch(machine, body);

  if (machine === 'lead') return { source_platform: 'admin', request_origin: 'admin', priority: 'P2', status: 'new', binding_status: 'pending', name: title, phone, email, message: notes, ...base };
  if (machine === 'service_request') return { contact_name: title, phone, email, issue_description: notes, issue_type: cleanText(body.issue_type, 120) ?? 'General leakage inspection', status: 'pending_review', binding_status: 'pending', request_origin: 'admin', consent: true, admin_approval_required: true, ...base };
  if (machine === 'job') return { status: 'assigned', notes, ...base };
  if (machine === 'quotation') return { version: 1, total_amount: amount, currency: cleanText(body.currency, 8)?.toUpperCase() ?? 'SGD', status: 'draft', ...base };
  if (machine === 'invoice') return { invoice_no: cleanText(body.invoice_no, 120) ?? `NF-DRAFT-${Date.now()}`, total_amount: amount, currency: cleanText(body.currency, 8)?.toUpperCase() ?? 'SGD', status: 'draft', visible_to_customer: false, ...base };
  if (machine === 'payment') return { amount, currency: cleanText(body.currency, 8)?.toUpperCase() ?? 'SGD', status: 'processing', ...base };
  if (machine === 'warranty') return { status: 'draft', coverage: notes, visible_to_customer: false, ...base };
  return base;
}

function rowString(row: unknown, field: string) {
  if (!row || typeof row !== 'object') return null;
  const value = (row as Row)[field];
  return typeof value === 'string' && value ? value : null;
}

function statusOf(row: unknown, column: string) {
  return rowString(row, column);
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

async function logCreateTransition(input: {
  supabase: ReturnType<typeof createAdminClient>;
  machine: Machine;
  objectId: string | null;
  toStatus: string | null;
  actorId: string;
  actorRole: string;
  ip: string | null;
}) {
  if (!input.objectId || !input.toStatus || input.machine === 'receipt') return false;
  await writeStatusTransitionLog({
    supabase: input.supabase,
    machine: `${input.machine}_lifecycle`,
    objectType: input.machine,
    objectId: input.objectId,
    fromStatus: null,
    toStatus: input.toStatus,
    reason: 'service_operations_live_core_record_create',
    actorId: input.actorId,
    actorRole: input.actorRole,
    ip: input.ip
  });
  return true;
}

async function logUpdateTransition(input: {
  supabase: ReturnType<typeof createAdminClient>;
  machine: Machine;
  objectId: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorId: string;
  actorRole: string;
  ip: string | null;
}) {
  if (!input.toStatus || input.toStatus === input.fromStatus || input.machine === 'receipt') return false;
  await writeStatusTransitionLog({
    supabase: input.supabase,
    machine: `${input.machine}_lifecycle`,
    objectType: input.machine,
    objectId: input.objectId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    reason: 'service_operations_live_core_record_update',
    actorId: input.actorId,
    actorRole: input.actorRole,
    ip: input.ip
  });
  return true;
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
  if (machine === 'inspection' || machine === 'receipt') return jsonError('Create for this machine is not enabled in V28.6 Batch A.', 400);

  const spec = specForMachine(machine);
  if (!spec) return jsonError('Unsupported create machine.', 400);
  const payload = creationPayload(machine, body);
  if (!Object.keys(payload).length) return jsonError('No supported fields to create record.', 400);

  const supabase = createAdminClient();
  const { data, error } = await supabase.from(spec.table).insert(payload).select(spec.select).single();
  if (error) return jsonError(error.message, 400);

  const objectId = rowString(data, spec.idColumn);
  let statusTransitionLogged = false;
  await logCreateTransition({
    supabase,
    machine,
    objectId,
    toStatus: statusOf(data, spec.statusColumn),
    actorId: auth.actor.profileId,
    actorRole: auth.role,
    ip: getClientIp(request)
  }).then((logged) => { statusTransitionLogged = logged; }).catch(() => undefined);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_live_core_record_create',
    objectType: machine,
    objectId,
    after: { ...(data as unknown as Row), status_transition_logged: statusTransitionLogged },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, machine, record: data, statusTransitionLogged }, { status: 201 });
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
    const fromStatus = statusOf(before, spec.statusColumn);
    const { data, error } = await supabase.from(spec.table).update(patch).eq(spec.idColumn, objectId).select(spec.select).single();
    if (error) return jsonError(error.message, 400);

    let statusTransitionLogged = false;
    if (Object.prototype.hasOwnProperty.call(patch, spec.statusColumn)) {
      await logUpdateTransition({
        supabase,
        machine,
        objectId,
        fromStatus,
        toStatus: statusOf(data, spec.statusColumn),
        actorId: auth.actor.profileId,
        actorRole: auth.role,
        ip: getClientIp(request)
      }).then((logged) => { statusTransitionLogged = logged; }).catch(() => undefined);
    }

    await writeAuditLog({
      actorId: auth.actor.profileId,
      role: auth.role,
      action: 'service_operations_live_core_record_update',
      objectType: machine,
      objectId,
      before: before as Record<string, unknown> | null,
      after: { ...(data as unknown as Row), status_transition_logged: statusTransitionLogged },
      ip: getClientIp(request)
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, machine, record: data, statusTransitionLogged });
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
