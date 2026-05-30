export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support'] as const;
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanFollowupStatus(value: unknown) {
  const status = cleanText(value, 80) ?? 'in_follow_up';
  return ['acknowledged', 'in_follow_up', 'resolved', 'internal_note'].includes(status) ? status : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const serviceRequestId = cleanText(request.nextUrl.searchParams.get('service_request_id'), 120);
  const satisfaction = cleanText(request.nextUrl.searchParams.get('satisfaction'), 80);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 80), 1), 150);
  const supabase = createAdminClient();

  let query = supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,email,status,priority,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_next_action,warranty_claim_routing_status,warranty_claim_closure_status,warranty_claim_completed_at,warranty_claim_closed_at,warranty_claim_customer_satisfaction_status,warranty_claim_customer_satisfaction_rating,warranty_claim_customer_satisfaction_notes,warranty_claim_customer_confirmed_at,warranty_claim_customer_reopened_at,warranty_claim_customer_reopen_reason,created_at,updated_at')
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .neq('warranty_claim_customer_satisfaction_status', 'pending')
    .order('warranty_claim_customer_confirmed_at', { ascending: false })
    .limit(limit);

  if (serviceRequestId && isUuid(serviceRequestId)) query = query.eq('service_request_id', serviceRequestId);
  if (satisfaction && ['satisfied', 'not_satisfied', 'reopened'].includes(satisfaction)) query = query.eq('warranty_claim_customer_satisfaction_status', satisfaction);

  const { data: claims, error } = await query;
  if (error) return jsonError(error.message, 500);

  const claimIds = (claims ?? []).map((claim) => claim.service_request_id as string).filter(Boolean);
  let recentMessages: Record<string, unknown>[] = [];
  if (claimIds.length) {
    const { data, error: messageError } = await supabase
      .from('warranty_claim_messages')
      .select('message_id,service_request_id,customer_id,sender_profile_id,sender_type,sender_role,message_body,visible_to_customer,internal_only,created_at,updated_at')
      .in('service_request_id', claimIds)
      .order('created_at', { ascending: false })
      .limit(120);
    if (messageError) return jsonError(messageError.message, 500);
    recentMessages = data ?? [];
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_satisfaction_followup_read',
    objectType: 'service_request',
    after: { count: claims?.length ?? 0, satisfaction: satisfaction || null, service_request_id: serviceRequestId || null },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, claims: claims ?? [], recent_messages: recentMessages });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const serviceRequestId = cleanText(body.service_request_id ?? body.serviceRequestId, 120);
  const followupStatus = cleanFollowupStatus(body.followup_status ?? body.followupStatus);
  const replyBody = cleanText(body.reply_body ?? body.replyBody ?? body.message, 2000);
  const internalNote = cleanText(body.internal_note ?? body.internalNote, 2000);
  const visibleToCustomer = body.visible_to_customer === false ? false : true;

  if (!isUuid(serviceRequestId)) return jsonError('Valid service_request_id is required.', 400);
  if (!followupStatus) return jsonError('Valid followup_status is required.', 400);
  if (!replyBody && !internalNote) return jsonError('Reply body or internal note is required.', 400);

  const supabase = createAdminClient();
  const { data: claim, error: claimError } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,status,request_origin,customer_portal_request_type,warranty_claim_closure_status,warranty_claim_customer_satisfaction_status,warranty_claim_customer_satisfaction_rating,warranty_claim_customer_satisfaction_notes,warranty_claim_customer_confirmed_at,warranty_claim_customer_reopened_at,warranty_claim_customer_reopen_reason,warranty_claim_next_action')
    .eq('service_request_id', serviceRequestId)
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .maybeSingle();
  if (claimError) return jsonError(claimError.message, 500);
  if (!claim) return jsonError('Warranty claim satisfaction record not found.', 404);
  if (!['not_satisfied', 'reopened'].includes(String(claim.warranty_claim_customer_satisfaction_status ?? ''))) return jsonError('Follow-up dashboard actions are intended for not_satisfied or reopened warranty claims.', 400);

  const nextAction = followupStatus === 'resolved'
    ? 'NANOFIX has recorded the follow-up response and will close the warranty claim after confirmation.'
    : replyBody || internalNote || 'NANOFIX follow-up is in progress.';

  const { data: updated, error: updateError } = await supabase
    .from('service_requests')
    .update({
      warranty_claim_next_action: nextAction,
      warranty_claim_routing_status: followupStatus === 'resolved' ? 'follow_up_resolved' : 'follow_up_in_progress',
      priority: followupStatus === 'resolved' ? 'P3' : 'P1',
      updated_at: new Date().toISOString()
    })
    .eq('service_request_id', serviceRequestId)
    .select('service_request_id,customer_id,contact_name,status,priority,warranty_claim_next_action,warranty_claim_routing_status,warranty_claim_customer_satisfaction_status,warranty_claim_customer_satisfaction_rating,warranty_claim_customer_satisfaction_notes,warranty_claim_customer_confirmed_at,warranty_claim_customer_reopened_at,warranty_claim_customer_reopen_reason,updated_at')
    .single();
  if (updateError) return jsonError(updateError.message, 400);

  let reply = null;
  if (replyBody) {
    const { data, error: messageError } = await supabase
      .from('warranty_claim_messages')
      .insert({
        service_request_id: serviceRequestId,
        customer_id: claim.customer_id,
        sender_profile_id: auth.actor.profileId,
        sender_type: 'internal',
        sender_role: auth.role,
        message_body: replyBody,
        visible_to_customer: visibleToCustomer,
        internal_only: !visibleToCustomer,
        metadata_json: { source: 'internal_warranty_claim_satisfaction_followup', followup_status: followupStatus }
      })
      .select('message_id,service_request_id,customer_id,sender_profile_id,sender_type,sender_role,message_body,visible_to_customer,internal_only,created_at')
      .single();
    if (messageError) return jsonError(messageError.message, 500);
    reply = data;
  }

  const { data: task } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'service_operations',
      source_table: 'service_requests',
      source_id: serviceRequestId,
      title: followupStatus === 'resolved' ? 'Warranty satisfaction follow-up resolved' : 'Warranty satisfaction follow-up in progress',
      description: replyBody || internalNote || `Warranty satisfaction follow-up ${followupStatus}.`,
      priority: followupStatus === 'resolved' ? 'P3' : 'P1',
      assignee_role: 'operations_admin',
      status: followupStatus === 'resolved' ? 'completed' : 'open',
      created_by: auth.actor.profileId,
      metadata_json: { source: 'internal_warranty_claim_satisfaction_followup', service_request_id: serviceRequestId, followup_status: followupStatus, visible_to_customer: visibleToCustomer }
    })
    .select('task_id,title,status,priority,assignee_role,created_at')
    .single();

  if (task?.task_id) {
    await supabase.from('task_events').insert({
      task_id: task.task_id,
      actor_id: auth.actor.profileId,
      action: 'internal_warranty_claim_satisfaction_followup_recorded',
      before_json: claim,
      after_json: { updated, reply, followup_status: followupStatus, internal_note: internalNote }
    }).throwOnError();
  }

  await supabase.from('internal_inbox_messages').insert({
    recipient_role: 'operations_admin',
    sender_profile_id: auth.actor.profileId,
    subject: followupStatus === 'resolved' ? 'Warranty satisfaction follow-up resolved' : 'Warranty satisfaction follow-up updated',
    body: replyBody || internalNote || `Warranty satisfaction follow-up ${followupStatus}.`,
    category: 'warranty_claim_satisfaction_followup',
    priority: followupStatus === 'resolved' ? 'P3' : 'P1',
    related_object_type: 'service_request',
    related_object_id: serviceRequestId,
    task_id: task?.task_id ?? null
  }).throwOnError();

  if (replyBody && visibleToCustomer) {
    await supabase.from('notification_outbox').insert({
      channel: 'internal',
      recipient_customer_id: claim.customer_id,
      subject: 'NANOFIX followed up on your warranty claim feedback',
      body: replyBody,
      payload_json: { source: 'internal_warranty_claim_satisfaction_followup', service_request_id: serviceRequestId, followup_status: followupStatus, message_id: (reply as Record<string, unknown> | null)?.message_id ?? null },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId
    }).throwOnError();
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_satisfaction_followup_submit',
    objectType: 'service_request',
    objectId: serviceRequestId,
    before: claim,
    after: { updated, reply, task, followup_status: followupStatus },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, claim: updated, reply, task });
}
