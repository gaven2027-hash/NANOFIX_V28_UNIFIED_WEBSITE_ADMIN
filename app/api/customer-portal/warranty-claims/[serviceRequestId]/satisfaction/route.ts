export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

type RouteContext = { params: Promise<{ serviceRequestId: string }> };
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanStatus(value: unknown) {
  const text = cleanText(value, 80) ?? 'satisfied';
  return text === 'satisfied' || text === 'not_satisfied' ? text : null;
}

function cleanRating(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

async function loadCustomerOwnedCompletedClaim(profileId: string, serviceRequestId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,status,request_origin,customer_portal_request_type,warranty_claim_closure_status,warranty_claim_completed_at,warranty_claim_closed_at,warranty_claim_customer_satisfaction_status,warranty_claim_customer_satisfaction_rating,warranty_claim_customer_satisfaction_notes,warranty_claim_customer_confirmed_at,warranty_claim_customer_reopened_at,warranty_claim_customer_reopen_reason,created_at,updated_at,customers!inner(customer_id,profile_id,account_status)')
    .eq('service_request_id', serviceRequestId)
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .eq('customers.profile_id', profileId)
    .eq('customers.account_status', 'active')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function customerConfirmationSubject(satisfactionStatus: string) {
  return satisfactionStatus === 'satisfied'
    ? 'NANOFIX received your warranty repair satisfaction confirmation'
    : 'NANOFIX received your warranty repair follow-up request';
}

function customerConfirmationBody(satisfactionStatus: string, notes: string | null | undefined) {
  return satisfactionStatus === 'satisfied'
    ? 'Thank you for confirming the completed warranty repair. Your confirmation has been recorded in Customer Portal.'
    : `Thank you for your feedback. NANOFIX has reopened the warranty claim for follow-up.${notes ? ` Your note: ${notes}` : ''}`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireActorApi(request, ['customer']);
  if (!auth.ok) return auth.response;

  const { serviceRequestId } = await context.params;
  if (!isUuid(serviceRequestId)) return jsonError('Valid service request ID is required.', 400);

  const claim = await loadCustomerOwnedCompletedClaim(auth.actor.profileId, serviceRequestId);
  if (!claim) return jsonError('Warranty claim not found for this customer.', 404);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_warranty_claim_satisfaction_read',
    objectType: 'service_request',
    objectId: serviceRequestId,
    after: { satisfaction_status: claim.warranty_claim_customer_satisfaction_status, closure_status: claim.warranty_claim_closure_status },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, claim });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireActorApi(request, ['customer']);
  if (!auth.ok) return auth.response;

  const { serviceRequestId } = await context.params;
  if (!isUuid(serviceRequestId)) return jsonError('Valid service request ID is required.', 400);

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const satisfactionStatus = cleanStatus(body.satisfaction_status ?? body.status);
  const rating = cleanRating(body.rating);
  const notes = cleanText(body.notes ?? body.feedback ?? body.message, 2000);

  if (!satisfactionStatus) return jsonError('satisfaction_status must be satisfied or not_satisfied.', 400);
  if (body.rating !== undefined && body.rating !== null && body.rating !== '' && rating === null) return jsonError('Rating must be an integer between 1 and 5.', 400);
  if (satisfactionStatus === 'not_satisfied' && !notes) return jsonError('Please add a short reason when not satisfied.', 400);

  const existing = await loadCustomerOwnedCompletedClaim(auth.actor.profileId, serviceRequestId);
  if (!existing) return jsonError('Warranty claim not found for this customer.', 404);
  if (!['completed', 'closed'].includes(String(existing.warranty_claim_closure_status ?? ''))) return jsonError('Satisfaction confirmation is available after warranty claim completion or closure.', 400);

  const supabase = createAdminClient();
  const { data: result, error } = await supabase.rpc('confirm_warranty_claim_satisfaction_tx', {
    p_service_request_id: serviceRequestId,
    p_customer_profile_id: auth.actor.profileId,
    p_satisfaction_status: satisfactionStatus,
    p_rating: rating,
    p_notes: notes
  });
  if (error) return jsonError(error.message, 400);

  const taskStatus = satisfactionStatus === 'satisfied' ? 'completed' : 'open';
  const taskPriority = satisfactionStatus === 'satisfied' ? 'P3' : 'P1';
  const title = satisfactionStatus === 'satisfied' ? 'Customer confirmed warranty claim satisfaction' : 'Customer not satisfied with warranty claim result';
  const { data: task } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'customer_portal',
      source_table: 'service_requests',
      source_id: serviceRequestId,
      title,
      description: notes || title,
      priority: taskPriority,
      assignee_role: 'operations_admin',
      status: taskStatus,
      created_by: auth.actor.profileId,
      metadata_json: { source: 'customer_portal_warranty_claim_satisfaction', service_request_id: serviceRequestId, satisfaction_status: satisfactionStatus, rating }
    })
    .select('task_id,title,status,priority,assignee_role,created_at')
    .single();

  if (task?.task_id) {
    await supabase.from('task_events').insert({
      task_id: task.task_id,
      actor_id: auth.actor.profileId,
      action: 'customer_warranty_claim_satisfaction_confirmed',
      before_json: existing,
      after_json: { result, satisfaction_status: satisfactionStatus, rating, notes }
    }).throwOnError();
  }

  await supabase.from('internal_inbox_messages').insert({
    recipient_role: 'operations_admin',
    sender_profile_id: auth.actor.profileId,
    subject: title,
    body: notes || title,
    category: 'warranty_claim_satisfaction',
    priority: taskPriority,
    related_object_type: 'service_request',
    related_object_id: serviceRequestId,
    task_id: task?.task_id ?? null
  }).throwOnError();

  if (satisfactionStatus === 'not_satisfied') {
    await supabase.from('warranty_claim_messages').insert({
      service_request_id: serviceRequestId,
      customer_id: existing.customer_id,
      sender_profile_id: auth.actor.profileId,
      sender_type: 'customer',
      sender_role: 'customer',
      message_body: notes,
      visible_to_customer: true,
      internal_only: false,
      metadata_json: { source: 'customer_portal_warranty_claim_not_satisfied' }
    }).throwOnError();
  }

  const notificationRows = [
    {
      channel: 'internal',
      recipient_role: 'operations_admin',
      subject: title,
      body: notes || title,
      payload_json: { source: 'customer_portal_warranty_claim_satisfaction', rule_id: satisfactionStatus === 'satisfied' ? 'WC-SAT-NOTIFY-001' : 'WC-SAT-NOTIFY-002', service_request_id: serviceRequestId, satisfaction_status: satisfactionStatus, rating },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId
    },
    {
      channel: 'customer_portal',
      recipient_customer_id: existing.customer_id,
      subject: customerConfirmationSubject(satisfactionStatus),
      body: customerConfirmationBody(satisfactionStatus, notes),
      payload_json: { source: 'customer_portal_warranty_claim_satisfaction_customer_receipt', rule_id: 'WC-SAT-NOTIFY-003', service_request_id: serviceRequestId, satisfaction_status: satisfactionStatus, rating },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId
    }
  ];

  if (rating !== null && rating <= 2) {
    notificationRows.push({
      channel: 'internal',
      recipient_role: 'operations_admin',
      subject: 'Low warranty satisfaction rating alert',
      body: `Warranty claim received a low rating (${rating}/5). ${notes || ''}`,
      payload_json: { source: 'customer_portal_warranty_claim_low_rating_alert', rule_id: 'WC-SAT-NOTIFY-004', service_request_id: serviceRequestId, satisfaction_status: satisfactionStatus, rating },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId
    });
  }

  if (satisfactionStatus === 'not_satisfied') {
    notificationRows.push({
      channel: 'internal',
      recipient_role: 'operations_admin',
      subject: 'Warranty claim reopened by customer feedback',
      body: notes || 'Customer was not satisfied and requested follow-up.',
      payload_json: { source: 'customer_portal_warranty_claim_reopened_alert', rule_id: 'WC-SAT-NOTIFY-005', service_request_id: serviceRequestId, satisfaction_status: satisfactionStatus, rating },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId
    });
  }

  await supabase.from('notification_outbox').insert(notificationRows).throwOnError();

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_warranty_claim_satisfaction_submit',
    objectType: 'service_request',
    objectId: serviceRequestId,
    before: existing,
    after: { result, task, satisfaction_status: satisfactionStatus, rating, notification_rules: notificationRows.map((row) => row.payload_json.rule_id) },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, result, task, notification_rules: notificationRows.map((row) => row.payload_json.rule_id) });
}
