export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const ALLOWED_ROLES = ['customer', 'super_admin', 'operations_admin', 'support'] as const;
type RouteContext = { params: Promise<{ serviceRequestId: string }> };
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function customerIdsForProfile(profileId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,account_status,binding_status,created_at')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .limit(20);
  if (error) throw new Error(error.message);
  return { customers: data ?? [], customerIds: unique((data ?? []).map((row) => row.customer_id as string)) };
}

async function loadOwnedWarrantyClaim(serviceRequestId: string, customerIds: string[]) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,status,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_routing_status,created_at')
    .eq('service_request_id', serviceRequestId)
    .in('customer_id', customerIds)
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireActorApi(request, [...ALLOWED_ROLES]);
  if (!auth.ok) return auth.response;

  const { serviceRequestId } = await context.params;
  if (!isUuid(serviceRequestId)) return jsonError('Valid service request ID is required.', 400);

  const supabase = createAdminClient();
  const { customerIds } = await customerIdsForProfile(auth.actor.profileId);
  if (!customerIds.length) return jsonError('No active customer profile linked to this account.', 403);

  const claim = await loadOwnedWarrantyClaim(serviceRequestId, customerIds);
  if (!claim) return jsonError('Warranty claim not found for this customer.', 404);

  const { data, error } = await supabase
    .from('warranty_claim_messages')
    .select('message_id,service_request_id,customer_id,sender_profile_id,sender_type,sender_role,message_body,visible_to_customer,internal_only,created_at,updated_at')
    .eq('service_request_id', serviceRequestId)
    .eq('visible_to_customer', true)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_warranty_claim_messages_read',
    objectType: 'service_request',
    objectId: serviceRequestId,
    after: { count: data?.length ?? 0 },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, claim, messages: data ?? [] });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireActorApi(request, ['customer']);
  if (!auth.ok) return auth.response;

  const { serviceRequestId } = await context.params;
  if (!isUuid(serviceRequestId)) return jsonError('Valid service request ID is required.', 400);

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const messageBody = cleanText(body.message_body ?? body.message ?? body.body, 2000);
  if (!messageBody || messageBody.length < 1) return jsonError('Message body is required.', 400);

  const supabase = createAdminClient();
  const { customerIds } = await customerIdsForProfile(auth.actor.profileId);
  if (!customerIds.length) return jsonError('No active customer profile linked to this account.', 403);

  const claim = await loadOwnedWarrantyClaim(serviceRequestId, customerIds);
  if (!claim) return jsonError('Warranty claim not found for this customer.', 404);

  const { data: message, error: messageError } = await supabase
    .from('warranty_claim_messages')
    .insert({
      service_request_id: serviceRequestId,
      customer_id: claim.customer_id,
      sender_profile_id: auth.actor.profileId,
      sender_type: 'customer',
      sender_role: 'customer',
      message_body: messageBody,
      visible_to_customer: true,
      internal_only: false,
      metadata_json: { source: 'customer_portal_warranty_claim_message' }
    })
    .select('message_id,service_request_id,customer_id,sender_profile_id,sender_type,sender_role,message_body,visible_to_customer,internal_only,created_at,updated_at')
    .single();
  if (messageError) return jsonError(messageError.message, 500);

  const { data: task } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'customer_portal',
      source_table: 'warranty_claim_messages',
      source_id: message.message_id,
      title: 'Customer replied on warranty claim',
      description: messageBody,
      priority: 'P2',
      assignee_role: 'operations_admin',
      status: 'open',
      created_by: auth.actor.profileId,
      metadata_json: { source: 'customer_portal_warranty_claim_message', service_request_id: serviceRequestId, message_id: message.message_id }
    })
    .select('task_id,title,status,priority,assignee_role,created_at')
    .single();

  if (task?.task_id) {
    await supabase.from('task_events').insert({
      task_id: task.task_id,
      actor_id: auth.actor.profileId,
      action: 'customer_warranty_claim_message_submitted',
      before_json: null,
      after_json: { message, service_request_id: serviceRequestId }
    }).throwOnError();

    await supabase.from('internal_inbox_messages').insert({
      recipient_role: 'operations_admin',
      sender_profile_id: auth.actor.profileId,
      subject: 'Customer message on warranty claim',
      body: messageBody,
      category: 'warranty_claim_message',
      priority: 'P2',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId,
      task_id: task.task_id
    }).throwOnError();
  }

  await supabase.from('notification_outbox').insert({
    channel: 'internal',
    recipient_role: 'operations_admin',
    subject: 'Customer warranty claim message received',
    body: messageBody,
    payload_json: { source: 'customer_portal_warranty_claim_message', service_request_id: serviceRequestId, message_id: message.message_id },
    delivery_status: 'queued',
    related_object_type: 'service_request',
    related_object_id: serviceRequestId
  }).throwOnError();

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_warranty_claim_message_submit',
    objectType: 'warranty_claim_message',
    objectId: message.message_id,
    after: { message, task, service_request_id: serviceRequestId },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, message, task });
}
