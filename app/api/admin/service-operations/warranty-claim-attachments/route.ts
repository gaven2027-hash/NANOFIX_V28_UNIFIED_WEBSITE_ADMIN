export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support'] as const;
const BUCKET = 'service-uploads';
const VALID_REVIEW_STATUS = ['pending_review', 'approved', 'rejected', 'needs_more_info'] as const;
type ApiPayload = Record<string, unknown>;
type UploadRow = { storage_path?: string | null; service_request_id?: string | null } & Record<string, unknown>;

const uploadSelect = 'upload_review_id,service_request_id,job_id,inspection_id,uploaded_by,file_name,file_type,storage_path,review_status,review_notes,reviewed_by,reviewed_at,compression_status,original_size_bytes,compressed_size_bytes,checksum_sha256,notification_id,attached_to_record,visible_to_customer,customer_visible_at,customer_visible_by,customer_visibility_notes,created_at,updated_at';

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanReviewStatus(value: unknown) {
  const text = cleanText(value, 80) ?? 'approved';
  return VALID_REVIEW_STATUS.includes(text as typeof VALID_REVIEW_STATUS[number]) ? text : null;
}

async function signedReviewerUrl(row: UploadRow) {
  if (!row.storage_path) return { ...row, reviewer_file_url: null, has_reviewer_file_access: false };
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 300);
  return { ...row, reviewer_file_url: data?.signedUrl ?? null, reviewer_file_url_error: error?.message ?? null, has_reviewer_file_access: Boolean(data?.signedUrl) };
}

async function loadWarrantyClaims(supabase: ReturnType<typeof createAdminClient>, serviceRequestId?: string | null) {
  let query = supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,email,status,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_routing_status,created_at,updated_at')
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .order('updated_at', { ascending: false })
    .limit(80);
  if (serviceRequestId && isUuid(serviceRequestId)) query = query.eq('service_request_id', serviceRequestId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const serviceRequestId = cleanText(request.nextUrl.searchParams.get('service_request_id'), 120);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 80), 1), 150);
  const supabase = createAdminClient();

  const claims = await loadWarrantyClaims(supabase, serviceRequestId);
  const claimIds = claims.map((claim) => claim.service_request_id as string).filter(Boolean);

  let uploads: UploadRow[] = [];
  if (claimIds.length) {
    const { data, error } = await supabase
      .from('service_upload_reviews')
      .select(uploadSelect)
      .in('service_request_id', claimIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return jsonError(error.message, 500);
    uploads = await Promise.all((data ?? []).map((row) => signedReviewerUrl(row as UploadRow)));
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_attachments_read',
    objectType: 'service_upload_reviews',
    after: { claims: claims.length, attachments: uploads.length, service_request_id: serviceRequestId || null },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, claims, attachments: uploads });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const uploadReviewId = cleanText(body.upload_review_id ?? body.uploadReviewId, 120);
  const reviewStatus = cleanReviewStatus(body.review_status ?? body.reviewStatus);
  const reviewNotes = cleanText(body.review_notes ?? body.reviewNotes, 1000);
  const customerVisibilityNotes = cleanText(body.customer_visibility_notes ?? body.customerVisibilityNotes, 1000);
  const visibleToCustomer = reviewStatus === 'approved' && body.visible_to_customer === true;

  if (!isUuid(uploadReviewId)) return jsonError('Valid upload_review_id is required.', 400);
  if (!reviewStatus) return jsonError('Valid review_status is required.', 400);

  const supabase = createAdminClient();
  const { data: current, error: currentError } = await supabase
    .from('service_upload_reviews')
    .select(uploadSelect)
    .eq('upload_review_id', uploadReviewId)
    .maybeSingle();
  if (currentError) return jsonError(currentError.message, 500);
  if (!current) return jsonError('Attachment review not found.', 404);
  if (!current.service_request_id) return jsonError('Attachment is not linked to a service request.', 400);

  const { data: claim, error: claimError } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,status,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_routing_status')
    .eq('service_request_id', current.service_request_id)
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .maybeSingle();
  if (claimError) return jsonError(claimError.message, 500);
  if (!claim) return jsonError('Only Customer Portal warranty claim attachments can be reviewed here.', 400);

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('service_upload_reviews')
    .update({
      review_status: reviewStatus,
      review_notes: reviewNotes,
      reviewed_by: auth.actor.profileId,
      reviewed_at: now,
      attached_to_record: reviewStatus === 'approved',
      visible_to_customer: visibleToCustomer,
      customer_visible_at: visibleToCustomer ? now : null,
      customer_visible_by: visibleToCustomer ? auth.actor.profileId : null,
      customer_visibility_notes: customerVisibilityNotes
    })
    .eq('upload_review_id', uploadReviewId)
    .select(uploadSelect)
    .single();
  if (updateError) return jsonError(updateError.message, 400);

  const { data: task } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'service_operations',
      source_table: 'service_upload_reviews',
      source_id: uploadReviewId,
      title: `Warranty claim attachment ${reviewStatus}`,
      description: reviewNotes || `Warranty claim attachment reviewed as ${reviewStatus}.`,
      priority: reviewStatus === 'needs_more_info' ? 'P2' : 'P3',
      assignee_role: 'operations_admin',
      status: 'completed',
      created_by: auth.actor.profileId,
      metadata_json: { source: 'internal_warranty_claim_attachment_review', service_request_id: claim.service_request_id, upload_review_id: uploadReviewId, review_status: reviewStatus, visible_to_customer: visibleToCustomer }
    })
    .select('task_id,title,status,priority,assignee_role,created_at')
    .single();

  if (task?.task_id) {
    await supabase.from('task_events').insert({
      task_id: task.task_id,
      actor_id: auth.actor.profileId,
      action: 'internal_warranty_claim_attachment_reviewed',
      before_json: current,
      after_json: updated
    }).throwOnError();
  }

  await supabase.from('internal_inbox_messages').insert({
    recipient_role: 'operations_admin',
    sender_profile_id: auth.actor.profileId,
    subject: `Warranty claim attachment ${reviewStatus}`,
    body: `${updated.file_name} reviewed as ${reviewStatus}. Customer visible: ${visibleToCustomer}.`,
    category: 'warranty_claim_attachment_review',
    priority: 'P3',
    related_object_type: 'service_upload_review',
    related_object_id: uploadReviewId,
    task_id: task?.task_id ?? null
  }).throwOnError();

  await supabase.from('notification_outbox').insert({
    channel: 'internal',
    recipient_customer_id: claim.customer_id,
    subject: reviewStatus === 'approved' ? 'NANOFIX reviewed your warranty claim attachment' : 'NANOFIX updated your warranty claim attachment status',
    body: reviewStatus === 'approved'
      ? `Your attachment ${updated.file_name} has been reviewed.${visibleToCustomer ? ' It is visible in your warranty claim detail.' : ''}`
      : `Your attachment ${updated.file_name} status is ${reviewStatus}.`,
    payload_json: { source: 'internal_warranty_claim_attachment_review', service_request_id: claim.service_request_id, upload_review_id: uploadReviewId, review_status: reviewStatus, visible_to_customer: visibleToCustomer },
    delivery_status: 'queued',
    related_object_type: 'service_upload_review',
    related_object_id: uploadReviewId
  }).throwOnError();

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_claim_attachment_review_submit',
    objectType: 'service_upload_review',
    objectId: uploadReviewId,
    before: current,
    after: { upload_review: updated, claim, task },
    ip: getClientIp(request)
  }).catch(() => undefined);

  const signed = await signedReviewerUrl(updated as UploadRow);
  return NextResponse.json({ ok: true, upload_review: signed, task });
}
