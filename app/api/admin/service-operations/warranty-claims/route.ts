export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support'] as const;
const DECISIONS = ['in_warranty', 'out_of_warranty', 'needs_new_quote', 'rejected', 'converted_to_job'] as const;
type Decision = typeof DECISIONS[number];
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanDecision(value: unknown): Decision | null {
  const text = cleanText(value, 80);
  return DECISIONS.includes(text as Decision) ? text as Decision : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 40), 1), 100);
  const status = cleanText(request.nextUrl.searchParams.get('status'), 80);
  const supabase = createAdminClient();

  let query = supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,whatsapp,email,address_text,postal_code,issue_type,leak_location,issue_description,preferred_time_text,status,binding_status,priority,request_origin,customer_portal_request_type,related_warranty_id,warranty_id,warranty_code,portal_attachment_urls,portal_customer_notes,warranty_claim_decision,warranty_claim_next_action,warranty_claim_decision_notes,warranty_claim_reviewed_by,warranty_claim_reviewed_at,created_at,updated_at')
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claims_read',
    objectType: 'service_requests',
    after: { count: data?.length ?? 0, status: status ?? null },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, warranty_claims: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const serviceRequestId = cleanText(body.service_request_id ?? body.serviceRequestId, 120);
  const decision = cleanDecision(body.decision);
  const notes = cleanText(body.notes ?? body.internal_notes ?? body.reason, 1200) ?? '';

  if (!isUuid(serviceRequestId)) return jsonError('Valid service_request_id is required.', 400);
  if (!decision) return jsonError('Valid warranty claim decision is required.', 400);

  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from('service_requests')
    .select('service_request_id,status,customer_id,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_next_action,warranty_claim_decision_notes')
    .eq('service_request_id', serviceRequestId)
    .maybeSingle();

  const { data: transition, error } = await supabase.rpc('review_warranty_claim_tx', {
    p_service_request_id: serviceRequestId,
    p_decision: decision,
    p_notes: notes,
    p_actor_id: auth.actor.profileId,
    p_actor_role: auth.role,
    p_ip: getClientIp(request) ?? ''
  });

  if (error) return jsonError(error.message, 400);

  const { data: updated, error: updatedError } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,email,status,priority,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_next_action,warranty_claim_decision_notes,warranty_claim_reviewed_by,warranty_claim_reviewed_at,created_at,updated_at')
    .eq('service_request_id', serviceRequestId)
    .single();
  if (updatedError) return jsonError(updatedError.message, 500);

  const taskTitle = decision === 'in_warranty'
    ? 'Warranty claim approved for repair scheduling'
    : decision === 'rejected'
      ? 'Warranty claim rejected and closed'
      : 'Warranty claim requires quotation follow-up';

  const { data: task } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'service_operations',
      source_table: 'service_requests',
      source_id: serviceRequestId,
      title: taskTitle,
      description: `Warranty claim decision: ${decision}. ${notes}`,
      priority: decision === 'in_warranty' ? 'P1' : 'P2',
      assignee_role: 'operations_admin',
      status: decision === 'rejected' ? 'completed' : 'open',
      created_by: auth.actor.profileId,
      metadata_json: { source: 'warranty_claim_admin_review', service_request_id: serviceRequestId, decision, transition }
    })
    .select('task_id,title,status,priority,assignee_role,created_at')
    .single();

  if (task?.task_id) {
    await supabase.from('task_events').insert({
      task_id: task.task_id,
      actor_id: auth.actor.profileId,
      action: 'warranty_claim_admin_decision_recorded',
      before_json: before ?? null,
      after_json: { updated, transition }
    }).throwOnError();

    await supabase.from('internal_inbox_messages').insert({
      recipient_role: 'operations_admin',
      sender_profile_id: auth.actor.profileId,
      subject: taskTitle,
      body: `Decision: ${decision}. Next action: ${updated.warranty_claim_next_action ?? 'review required'}. ${notes}`,
      category: 'warranty_claim_review',
      priority: decision === 'in_warranty' ? 'P1' : 'P2',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId,
      task_id: task.task_id
    }).throwOnError();
  }

  if (updated.customer_id) {
    await supabase.from('notification_outbox').insert({
      channel: 'internal',
      recipient_customer_id: updated.customer_id,
      subject: 'NANOFIX warranty claim reviewed',
      body: decision === 'in_warranty'
        ? 'Your warranty claim has been approved for repair arrangement.'
        : decision === 'rejected'
          ? 'Your warranty claim has been reviewed and cannot be accepted under the warranty scope.'
          : 'Your warranty claim has been reviewed. NANOFIX will follow up with the next quotation or service arrangement.',
      payload_json: { source: 'warranty_claim_admin_review', service_request_id: serviceRequestId, decision, next_action: updated.warranty_claim_next_action },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: serviceRequestId
    }).throwOnError();
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_decision_submit',
    objectType: 'service_request',
    objectId: serviceRequestId,
    before: before as Record<string, unknown> | null,
    after: { updated, transition, task },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, warranty_claim: updated, transition, task });
}
