export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support'] as const;
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const serviceRequestId = cleanText(request.nextUrl.searchParams.get('service_request_id'), 120);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 80), 1), 150);
  const supabase = createAdminClient();

  let claimQuery = supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,email,status,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_routing_status,created_at,updated_at')
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (serviceRequestId && isUuid(serviceRequestId)) claimQuery = claimQuery.eq('service_request_id', serviceRequestId);

  const { data: claims, error: claimError } = await claimQuery;
  if (claimError) return jsonError(claimError.message, 500);

  let messageQuery = supabase
    .from('warranty_claim_messages')
    .select('message_id,service_request_id,customer_id,sender_profile_id,sender_type,sender_role,message_body,visible_to_customer,internal_only,read_by_customer_at,read_by_internal_at,created_at,updated_at')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (serviceRequestId && isUuid(serviceRequestId)) messageQuery = messageQuery.eq('service_request_id', serviceRequestId);
  else if (claims?.length) messageQuery = messageQuery.in('service_request_id', claims.map((claim) => claim.service_request_id));

  const { data: messages, error: messageError } = await messageQuery;
  if (messageError) return jsonError(messageError.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_messages_read',
    objectType: 'warranty_claim_messages',
    after: { claims: claims?.length ?? 0, messages: messages?.length ?? 0, service_request_id: serviceRequestId || null },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, claims: claims ?? [], messages: messages ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const serviceRequestId = cleanText(body.service_request_id ?? body.serviceRequestId, 120);
  const messageBody = cleanText(body.message_body ?? body.message ?? body.reply, 2000);
  const visibleToCustomer = body.visible_to_customer === false ? false : true;
  const internalOnly = visibleToCustomer ? false : true;

  if (!isUuid(serviceRequestId)) return jsonError('Valid service_request_id is required.', 400);
  if (!messageBody || messageBody.length < 1) return jsonError('Message body is required.', 400);

  const supabase = createAdminClient();
  const { data: claim, error: claimError } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,status,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_routing_status,created_at')
    .eq('service_request_id', serviceRequestId)
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .maybeSingle();

  if (claimError) return jsonError(claimError.message, 500);
  if (!claim) return jsonError('Warranty claim service request not found.', 404);

  const { data: reply, error: replyError } = await supabase
    .from('warranty_claim_messages')
    .insert({
      service_request_id: serviceRequestId,
      customer_id: claim.customer_id,
      sender_profile_id: auth.actor.profileId,
      sender_type: 'internal',
      sender_role: auth.role,
      message_body: messageBody,
      visible_to_customer: visibleToCustomer,
      internal_only: internalOnly,
      metadata_json: { source: 'internal_admin_warranty_claim_reply' }
    })
    .select('message_id,service_request_id,customer_id,sender_profile_id,sender_type,sender_role,message_body,visible_to_customer,internal_only,created_at,updated_at')
    .single();
  if (replyError) return jsonError(replyError.message, 500);

  const { data: task } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'service_operations',
      source_table: 'warranty_claim_messages',
      source_id: reply.message_id,
      title: visibleToCustomer ? 'Internal reply sent to warranty claim customer' : 'Internal note added to warranty claim',
      description: messageBody,
      priority: 'P2',
      assignee_role: 'operations_admin',
      status: 'completed',
      created_by: auth.actor.profileId,
      metadata_json: { source: 'internal_admin_warranty_claim_reply', service_request_id: serviceRequestId, message_id: reply.message_id, visible_to_customer: visibleToCustomer }
    })
    .select('task_id,title,status,priority,assignee_role,created_at')
    .single();

  if (task?.task_id) {
    await supabase.from('task_events').insert({
      task_id: task.task_id,
      actor_id: auth.actor.profileId,
      action: 'internal_warranty_claim_reply_recorded',
      before_json: null,
      after_json: { reply, service_request_id: serviceRequestId }
    }).throwOnError();
  }

  await supabase.from('internal_inbox_messages').insert({
    recipient_role: 'operations_admin',
    sender_profile_id: auth.actor.profileId,
    subject: visibleToCustomer ? 'Warranty claim reply sent to customer' : 'Internal warranty claim note added',
    body: messageBody,
    category: 'warranty_claim_message_reply',
    priority: 'P2',
    related_object_type: 'service_request',
    related_object_id: serviceRequestId,
    task_id: task?.task_id ?? null
  }).throwOnError();

  if (visibleToCustomer && claim.customer_id) {
    await supabase.from('notification_outbox').insert({
      channel: 'internal',
      recipient_customer_id: claim.customer_id,
      subject: 'NANOFIX replied to your warranty claim',
      body: messageBody,
      payload_json: { source: 'internal_admin_warranty_claim_reply', service_request_id: serviceRequestId, message_id: reply.message_id },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId
    }).throwOnError();
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_message_reply_submit',
    objectType: 'warranty_claim_message',
    objectId: reply.message_id,
    after: { reply, task, service_request_id: serviceRequestId, visible_to_customer: visibleToCustomer },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, reply, task });
}
