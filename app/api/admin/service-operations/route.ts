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
  table: string;
  select: string;
  order?: string;
  limit: number;
};

const READ_QUERIES: QuerySpec[] = [
  { key: 'leads', table: 'leads', select: 'lead_id,name,phone,email,source_platform,priority,status,binding_status,created_at,updated_at', limit: 12 },
  { key: 'service_requests', table: 'service_requests', select: 'service_request_id,contact_name,phone,whatsapp,email,address_text,issue_type,leak_location,status,binding_status,created_at,updated_at', limit: 12 },
  { key: 'jobs', table: 'jobs', select: 'job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at', limit: 12 },
  { key: 'quotations', table: 'quotations', select: 'quotation_id,job_id,current_version,total,approval_status,created_at', limit: 12 },
  { key: 'invoices', table: 'invoices', select: 'invoice_id,invoice_no,job_id,total,status,created_at', limit: 12 },
  { key: 'payments', table: 'payments', select: 'payment_id,invoice_id,amount,status,fee,reconciled_at,created_at', limit: 12 },
  { key: 'warranties', table: 'warranties', select: 'warranty_id,job_id,status,coverage,starts_at,ends_at,created_at', limit: 12 },
  { key: 'status_logs', table: 'status_transition_logs', select: 'transition_id,machine,object_id,from_status,to_status,reason,actor_role,created_at', limit: 20 }
];

function clampLimit(value: string | null) {
  const parsed = Number(value ?? 12);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(Math.max(Math.floor(parsed), 1), 50);
}

function isMachine(value: string | null): value is Machine {
  return Boolean(value && MACHINES.includes(value as Machine));
}

function isUuid(value: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
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

  const limit = clampLimit(request.nextUrl.searchParams.get('limit'));
  const supabase = createAdminClient();
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

  return NextResponse.json({
    ok: errors.length === 0,
    degraded: errors.length > 0,
    errors,
    ...payload
  }, { status: errors.length ? 207 : 200 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const machine = cleanText(body.machine, 80);
  const objectId = cleanText(body.object_id, 120);
  const toStatus = cleanText(body.to_status, 80);
  const reason = cleanText(body.reason, 500) ?? 'Service Operations live core status update';

  if (!isMachine(machine)) return jsonError('Unsupported machine for Service Operations status transition.', 400);
  if (!isUuid(objectId)) return jsonError('Valid object_id UUID is required.', 400);
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
