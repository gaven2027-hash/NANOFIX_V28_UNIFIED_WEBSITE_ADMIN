export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support'] as const;
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanStatus(value: unknown) {
  const status = cleanText(value, 80);
  return status && ['reviewing', 'converted_to_job', 'resolved', 'rejected', 'cancelled'].includes(status) ? status : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 30), 1), 100);
  const { data: portalRequests, error: portalError } = await supabase
    .from('customer_portal_requests')
    .select('portal_request_id,customer_id,request_type,related_warranty_id,related_job_id,title,issue_location,issue_description,preferred_schedule,contact_name,contact_phone,contact_email,attachment_urls,status,created_service_request_id,internal_notes,reviewed_by,reviewed_at,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (portalError) return jsonError(portalError.message, 500);

  const { data: serviceRequests, error: serviceError } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,title,status,source,request_channel,customer_portal_request_id,portal_source_type,portal_related_warranty_id,customer_attachment_urls,customer_feedback_notes,created_at')
    .not('customer_portal_request_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (serviceError) return jsonError(serviceError.message, 500);

  const { data: feedback, error: feedbackError } = await supabase
    .from('customer_document_feedback')
    .select('feedback_id,customer_id,document_type,document_id,related_job_id,feedback_type,message,status,internal_response,reviewed_by,reviewed_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (feedbackError) return jsonError(feedbackError.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_customer_portal_intake_read',
    objectType: 'customer_portal_intake',
    after: { portal_requests: portalRequests?.length ?? 0, service_requests: serviceRequests?.length ?? 0, feedback: feedback?.length ?? 0 },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, portal_requests: portalRequests ?? [], service_requests: serviceRequests ?? [], document_feedback: feedback ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const portalRequestId = cleanText(body.portal_request_id, 120);
  const feedbackId = cleanText(body.feedback_id, 120);
  const internalNotes = cleanText(body.internal_notes ?? body.internal_response, 1200);
  const supabase = createAdminClient();

  if (action === 'update_portal_request_status') {
    const status = cleanStatus(body.status);
    if (!isUuid(portalRequestId)) return jsonError('Valid portal_request_id is required.', 400);
    if (!status) return jsonError('Valid status is required.', 400);
    const { data: before } = await supabase.from('customer_portal_requests').select('portal_request_id,status,internal_notes,created_service_request_id').eq('portal_request_id', portalRequestId).maybeSingle();
    const { data, error } = await supabase
      .from('customer_portal_requests')
      .update({ status, internal_notes: internalNotes, reviewed_by: auth.actor.profileId, reviewed_at: new Date().toISOString() })
      .eq('portal_request_id', portalRequestId)
      .select('portal_request_id,customer_id,request_type,status,created_service_request_id,internal_notes,reviewed_by,reviewed_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);
    if (data.created_service_request_id) {
      await supabase.from('service_requests').update({ status: status === 'reviewing' ? 'reviewing' : status, customer_feedback_notes: internalNotes }).eq('service_request_id', data.created_service_request_id).throwOnError();
    }
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_customer_portal_request_status_update', objectType: 'customer_portal_request', objectId: portalRequestId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, portal_request: data });
  }

  if (action === 'respond_document_feedback') {
    if (!isUuid(feedbackId)) return jsonError('Valid feedback_id is required.', 400);
    const status = cleanText(body.status, 80) || 'resolved';
    if (!['reviewing', 'resolved', 'rejected', 'superseded'].includes(status)) return jsonError('Valid feedback status is required.', 400);
    const { data: before } = await supabase.from('customer_document_feedback').select('feedback_id,status,internal_response').eq('feedback_id', feedbackId).maybeSingle();
    const { data, error } = await supabase
      .from('customer_document_feedback')
      .update({ status, internal_response: internalNotes, reviewed_by: auth.actor.profileId, reviewed_at: new Date().toISOString() })
      .eq('feedback_id', feedbackId)
      .select('feedback_id,customer_id,document_type,document_id,feedback_type,message,status,internal_response,reviewed_by,reviewed_at,created_at')
      .single();
    if (error) return jsonError(error.message, 400);
    await supabase.from('notification_outbox').insert({
      channel: 'internal',
      recipient_customer_id: data.customer_id,
      subject: 'NANOFIX feedback reviewed',
      body: internalNotes || 'Your feedback has been reviewed by NANOFIX.',
      payload_json: { feedback_id: feedbackId, status, source: 'customer_document_feedback_review' },
      delivery_status: 'queued',
      related_object_type: 'customer_document_feedback',
      related_object_id: feedbackId
    }).throwOnError();
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_customer_document_feedback_respond', objectType: 'customer_document_feedback', objectId: feedbackId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, feedback: data });
  }

  return jsonError('Unsupported customer portal intake action.', 400);
}
