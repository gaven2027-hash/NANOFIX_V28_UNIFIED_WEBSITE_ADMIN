export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support'] as const;
const ROUTE_ACTIONS = ['create_warranty_job', 'create_payable_quote', 'close_rejected_claim', 'continue_existing_flow'] as const;
type RouteAction = typeof ROUTE_ACTIONS[number];
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanRouteAction(value: unknown): RouteAction | null {
  const text = cleanText(value, 100);
  return ROUTE_ACTIONS.includes(text as RouteAction) ? text as RouteAction : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 40), 1), 100);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,email,address_text,issue_type,leak_location,issue_description,status,priority,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_next_action,warranty_claim_decision_notes,warranty_claim_reviewed_at,warranty_claim_routing_status,warranty_claim_routed_job_id,warranty_claim_routed_quotation_id,warranty_claim_routed_at,warranty_claim_routing_notes,created_at,updated_at')
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .not('warranty_claim_decision', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_routing_read',
    objectType: 'service_requests',
    after: { count: data?.length ?? 0 },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, warranty_claim_routes: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const serviceRequestId = cleanText(body.service_request_id ?? body.serviceRequestId, 120);
  const routeAction = cleanRouteAction(body.route_action ?? body.routeAction);
  const notes = cleanText(body.notes ?? body.routing_notes ?? body.reason, 1200) ?? '';

  if (!isUuid(serviceRequestId)) return jsonError('Valid service_request_id is required.', 400);
  if (!routeAction) return jsonError('Valid warranty claim route_action is required.', 400);

  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from('service_requests')
    .select('service_request_id,status,customer_id,warranty_claim_decision,warranty_claim_next_action,warranty_claim_routing_status,warranty_claim_routed_job_id,warranty_claim_routed_quotation_id')
    .eq('service_request_id', serviceRequestId)
    .maybeSingle();

  const { data: routing, error } = await supabase.rpc('route_warranty_claim_tx', {
    p_service_request_id: serviceRequestId,
    p_route_action: routeAction,
    p_notes: notes,
    p_actor_id: auth.actor.profileId,
    p_actor_role: auth.role,
    p_ip: getClientIp(request) ?? ''
  });

  if (error) return jsonError(error.message, 400);

  const { data: updated, error: updatedError } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,email,status,priority,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_next_action,warranty_claim_routing_status,warranty_claim_routed_job_id,warranty_claim_routed_quotation_id,warranty_claim_routed_at,warranty_claim_routing_notes,created_at,updated_at')
    .eq('service_request_id', serviceRequestId)
    .single();
  if (updatedError) return jsonError(updatedError.message, 500);

  const taskTitle = routeAction === 'create_warranty_job'
    ? 'Warranty repair job created from claim'
    : routeAction === 'create_payable_quote'
      ? 'Payable quotation draft created from warranty claim'
      : routeAction === 'close_rejected_claim'
        ? 'Rejected warranty claim closed'
        : 'Warranty claim continued in original job flow';

  const { data: task } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'service_operations',
      source_table: 'service_requests',
      source_id: serviceRequestId,
      title: taskTitle,
      description: `Warranty claim routed: ${routeAction}. ${notes}`,
      priority: routeAction === 'create_warranty_job' ? 'P1' : 'P2',
      assignee_role: 'operations_admin',
      status: routeAction === 'close_rejected_claim' ? 'completed' : 'open',
      created_by: auth.actor.profileId,
      metadata_json: { source: 'warranty_claim_job_quotation_routing', service_request_id: serviceRequestId, route_action: routeAction, routing }
    })
    .select('task_id,title,status,priority,assignee_role,created_at')
    .single();

  if (task?.task_id) {
    await supabase.from('task_events').insert({
      task_id: task.task_id,
      actor_id: auth.actor.profileId,
      action: 'warranty_claim_routed_to_job_or_quotation',
      before_json: before ?? null,
      after_json: { updated, routing }
    }).throwOnError();

    await supabase.from('internal_inbox_messages').insert({
      recipient_role: 'operations_admin',
      sender_profile_id: auth.actor.profileId,
      subject: taskTitle,
      body: `Route action: ${routeAction}. Job: ${updated.warranty_claim_routed_job_id ?? '—'}. Quotation: ${updated.warranty_claim_routed_quotation_id ?? '—'}. ${notes}`,
      category: 'warranty_claim_routing',
      priority: routeAction === 'create_warranty_job' ? 'P1' : 'P2',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId,
      task_id: task.task_id
    }).throwOnError();
  }

  if (updated.customer_id) {
    await supabase.from('notification_outbox').insert({
      channel: 'internal',
      recipient_customer_id: updated.customer_id,
      subject: 'NANOFIX warranty claim next step arranged',
      body: routeAction === 'create_warranty_job'
        ? 'Your warranty repair has been routed for service arrangement.'
        : routeAction === 'create_payable_quote'
          ? 'Your warranty claim requires a payable quotation. NANOFIX will prepare the quotation for your review.'
          : routeAction === 'close_rejected_claim'
            ? 'Your warranty claim has been closed after review.'
            : 'Your warranty claim has been routed into the original service workflow.',
      payload_json: { source: 'warranty_claim_job_quotation_routing', service_request_id: serviceRequestId, route_action: routeAction, routing },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId
    }).throwOnError();
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_route_submit',
    objectType: 'service_request',
    objectId: serviceRequestId,
    before: before as Record<string, unknown> | null,
    after: { updated, routing, task },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, warranty_claim_route: updated, routing, task });
}
