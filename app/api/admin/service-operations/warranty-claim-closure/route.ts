export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support'] as const;
const CLOSURE_STATUSES = ['completed', 'closed', 'cancelled', 'reopened'] as const;
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanClosureStatus(value: unknown) {
  const text = cleanText(value, 80) ?? 'completed';
  return CLOSURE_STATUSES.includes(text as typeof CLOSURE_STATUSES[number]) ? text : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const serviceRequestId = cleanText(request.nextUrl.searchParams.get('service_request_id'), 120);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 60), 1), 120);
  const supabase = createAdminClient();

  let query = supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,email,status,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_next_action,warranty_claim_routing_status,warranty_claim_routed_job_id,warranty_claim_routed_quotation_id,warranty_claim_completed_at,warranty_claim_closed_at,warranty_claim_closure_status,warranty_claim_completion_summary,warranty_claim_closure_notes,created_at,updated_at')
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (serviceRequestId && isUuid(serviceRequestId)) query = query.eq('service_request_id', serviceRequestId);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_closure_read',
    objectType: 'service_request',
    after: { count: data?.length ?? 0, service_request_id: serviceRequestId || null },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, warranty_claims: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const serviceRequestId = cleanText(body.service_request_id ?? body.serviceRequestId, 120);
  const closureStatus = cleanClosureStatus(body.closure_status ?? body.closureStatus);
  const completionSummary = cleanText(body.completion_summary ?? body.completionSummary, 2000);
  const closureNotes = cleanText(body.closure_notes ?? body.closureNotes, 2000);

  if (!isUuid(serviceRequestId)) return jsonError('Valid service_request_id is required.', 400);
  if (!closureStatus) return jsonError('Valid closure_status is required.', 400);

  const supabase = createAdminClient();
  const { data: rpcResult, error } = await supabase.rpc('close_warranty_claim_tx', {
    p_service_request_id: serviceRequestId,
    p_actor_profile_id: auth.actor.profileId,
    p_actor_role: auth.role,
    p_closure_status: closureStatus,
    p_completion_summary: completionSummary,
    p_closure_notes: closureNotes
  });
  if (error) return jsonError(error.message, 400);

  const { data: task } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'service_operations',
      source_table: 'service_requests',
      source_id: serviceRequestId,
      title: `Warranty claim ${closureStatus}`,
      description: completionSummary || closureNotes || `Warranty claim marked as ${closureStatus}.`,
      priority: 'P3',
      assignee_role: 'operations_admin',
      status: 'completed',
      created_by: auth.actor.profileId,
      metadata_json: { source: 'warranty_claim_completion_closure', service_request_id: serviceRequestId, closure_status: closureStatus }
    })
    .select('task_id,title,status,priority,assignee_role,created_at')
    .single();

  if (task?.task_id) {
    await supabase.from('task_events').insert({
      task_id: task.task_id,
      actor_id: auth.actor.profileId,
      action: 'warranty_claim_closure_recorded',
      before_json: null,
      after_json: { service_request_id: serviceRequestId, closure_status: closureStatus, rpc_result: rpcResult }
    }).throwOnError();
  }

  const serviceRequest = (rpcResult as Record<string, unknown> | null)?.service_request as Record<string, unknown> | undefined;
  const customerId = typeof serviceRequest?.customer_id === 'string' ? serviceRequest.customer_id : null;

  await supabase.from('internal_inbox_messages').insert({
    recipient_role: 'operations_admin',
    sender_profile_id: auth.actor.profileId,
    subject: `Warranty claim ${closureStatus}`,
    body: completionSummary || closureNotes || `Warranty claim ${serviceRequestId} marked as ${closureStatus}.`,
    category: 'warranty_claim_closure',
    priority: 'P3',
    related_object_type: 'service_request',
    related_object_id: serviceRequestId,
    task_id: task?.task_id ?? null
  }).throwOnError();

  await supabase.from('notification_outbox').insert({
    channel: 'internal',
    recipient_customer_id: customerId,
    subject: closureStatus === 'reopened' ? 'NANOFIX reopened your warranty claim' : 'NANOFIX updated your warranty claim status',
    body: completionSummary || closureNotes || `Your warranty claim status is ${closureStatus}.`,
    payload_json: { source: 'warranty_claim_completion_closure', service_request_id: serviceRequestId, closure_status: closureStatus },
    delivery_status: 'queued',
    related_object_type: 'service_request',
    related_object_id: serviceRequestId
  }).throwOnError();

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_closure_submit',
    objectType: 'service_request',
    objectId: serviceRequestId,
    after: { rpc_result: rpcResult, task },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, result: rpcResult, task });
}
