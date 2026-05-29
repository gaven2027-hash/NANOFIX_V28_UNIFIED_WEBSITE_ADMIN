export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support', 'engineer'] as const;
const MANAGER_ROLES = ['super_admin', 'operations_admin', 'support'] as const;

type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanDate(value: unknown) {
  return cleanText(value, 100) || null;
}

function cleanBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false;
}

function cleanNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uuidOrNull(value: unknown) {
  const text = cleanText(value, 120);
  return isUuid(text) ? text : null;
}

function safePathPart(value: string | null | undefined) {
  return (value || 'unlinked').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || 'unlinked';
}

function inspectionPayload(body: ApiPayload, actorId: string) {
  return {
    service_request_id: uuidOrNull(body.service_request_id),
    job_id: uuidOrNull(body.job_id),
    customer_id: uuidOrNull(body.customer_id),
    engineer_id: uuidOrNull(body.engineer_id),
    scheduled_at: cleanDate(body.scheduled_at),
    status: cleanText(body.status, 80) ?? 'scheduled',
    location: cleanText(body.location, 500),
    findings: cleanText(body.findings, 1500),
    diagnosis: cleanText(body.diagnosis, 1500),
    recommended_action: cleanText(body.recommended_action, 1500),
    customer_present: cleanBoolean(body.customer_present),
    signature_required: cleanBoolean(body.signature_required),
    completed_at: cleanDate(body.completed_at),
    created_by: actorId
  };
}

function uploadPayload(body: ApiPayload, actorId: string) {
  return {
    service_request_id: uuidOrNull(body.service_request_id),
    job_id: uuidOrNull(body.job_id),
    inspection_id: uuidOrNull(body.inspection_id),
    uploaded_by: actorId,
    file_name: cleanText(body.file_name, 240),
    file_type: cleanText(body.file_type, 40) ?? 'image',
    storage_path: cleanText(body.storage_path, 500),
    review_status: cleanText(body.review_status, 80) ?? 'pending_review',
    review_notes: cleanText(body.review_notes, 1000),
    compression_status: cleanText(body.compression_status, 80) ?? 'pending_client_compression',
    original_size_bytes: cleanNumber(body.original_size_bytes),
    compressed_size_bytes: cleanNumber(body.compressed_size_bytes),
    checksum_sha256: cleanText(body.checksum_sha256, 128)
  };
}

function stripUndefined(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

async function queueCustomerNotification(supabase: ReturnType<typeof createAdminClient>, input: { subject: string; body: string; relatedObjectType: string; relatedObjectId: string; customerId?: string | null; channel?: string; payload?: Record<string, unknown> }) {
  const { data, error } = await supabase
    .from('notification_outbox')
    .insert({
      channel: input.channel ?? 'internal',
      recipient_customer_id: input.customerId ?? null,
      target_role: input.customerId ? null : 'support',
      subject: input.subject,
      body: input.body,
      payload_json: input.payload ?? {},
      delivery_status: 'queued',
      related_object_type: input.relatedObjectType,
      related_object_id: input.relatedObjectId
    })
    .select('notification_id,channel,recipient_customer_id,target_role,subject,delivery_status,related_object_type,related_object_id,created_at')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function createFollowUpTask(supabase: ReturnType<typeof createAdminClient>, input: { sourceTable: string; sourceId: string; title: string; description: string; priority?: string }) {
  const { data, error } = await supabase
    .from('unified_tasks')
    .insert({ source_module: 'service_operations', source_table: input.sourceTable, source_id: input.sourceId, title: input.title, description: input.description, priority: input.priority ?? 'P2', assignee_role: 'operations_admin', status: 'open', metadata_json: { source: 'service_operations_inspection_hooks' } })
    .select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at')
    .single();
  if (error) throw new Error(error.message);
  await supabase.from('task_events').insert({ task_id: data.task_id, action: 'created_from_inspection_hook', after_json: data }).throwOnError();
  return data;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 12), 1), 50);

  const [inspectionsResult, uploadsResult] = await Promise.all([
    supabase
      .from('service_inspections')
      .select('inspection_id,service_request_id,job_id,customer_id,engineer_id,scheduled_at,status,location,findings,diagnosis,recommended_action,customer_present,signature_required,completed_at,created_by,created_at,updated_at')
      .order('scheduled_at', { ascending: false })
      .limit(limit),
    supabase
      .from('service_upload_reviews')
      .select('upload_review_id,service_request_id,job_id,inspection_id,uploaded_by,file_name,file_type,storage_path,review_status,review_notes,reviewed_by,reviewed_at,compression_status,original_size_bytes,compressed_size_bytes,checksum_sha256,notification_id,attached_to_record,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)
  ]);

  const errors = [inspectionsResult.error?.message, uploadsResult.error?.message].filter(Boolean) as string[];

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_inspection_upload_read',
    objectType: 'service_operations_inspections',
    after: {
      inspections: inspectionsResult.data?.length ?? 0,
      upload_reviews: uploadsResult.data?.length ?? 0,
      degraded: errors.length > 0
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({
    ok: errors.length === 0,
    degraded: errors.length > 0,
    errors,
    inspections: inspectionsResult.data ?? [],
    upload_reviews: uploadsResult.data ?? []
  }, { status: errors.length ? 207 : 200 });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const supabase = createAdminClient();

  if (action === 'prepare_upload_path') {
    const fileName = cleanText(body.file_name, 240);
    const fileType = cleanText(body.file_type, 40) ?? 'image';
    const serviceRequestId = cleanText(body.service_request_id, 120);
    const jobId = cleanText(body.job_id, 120);
    const inspectionId = cleanText(body.inspection_id, 120);
    if (!fileName) return jsonError('file_name is required.', 400);
    if (serviceRequestId && !isUuid(serviceRequestId)) return jsonError('service_request_id must be UUID when provided.', 400);
    if (jobId && !isUuid(jobId)) return jsonError('job_id must be UUID when provided.', 400);
    if (inspectionId && !isUuid(inspectionId)) return jsonError('inspection_id must be UUID when provided.', 400);
    const scope = inspectionId ? `inspection-${safePathPart(inspectionId)}` : jobId ? `job-${safePathPart(jobId)}` : serviceRequestId ? `request-${safePathPart(serviceRequestId)}` : `manual-${auth.actor.profileId}`;
    const storagePath = `service-operations/${scope}/${Date.now()}-${safePathPart(fileName)}`;
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_upload_path_prepare', objectType: 'service_upload_path', after: { storage_path: storagePath, file_name: fileName, file_type: fileType }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, bucket: 'service-uploads', storage_path: storagePath, file_name: fileName, file_type: fileType, compression_required: ['image','video'].includes(fileType) });
  }

  if (action === 'schedule_inspection') {
    const payload = stripUndefined(inspectionPayload(body, auth.actor.profileId));
    if (!payload.service_request_id && !payload.job_id) return jsonError('service_request_id or job_id is required.', 400);
    if (!payload.scheduled_at) return jsonError('scheduled_at is required.', 400);

    const { data, error } = await supabase
      .from('service_inspections')
      .insert(payload)
      .select('inspection_id,service_request_id,job_id,customer_id,engineer_id,scheduled_at,status,location,findings,diagnosis,recommended_action,customer_present,signature_required,completed_at,created_by,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_inspection_schedule', objectType: 'service_inspection', objectId: data.inspection_id, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, inspection: data }, { status: 201 });
  }

  if (action === 'submit_inspection_form') {
    const inspectionId = cleanText(body.inspection_id, 120);
    if (!isUuid(inspectionId)) return jsonError('Valid inspection_id is required.', 400);
    const patch = stripUndefined({
      status: cleanText(body.status, 80) ?? 'completed',
      findings: cleanText(body.findings, 1500),
      diagnosis: cleanText(body.diagnosis, 1500),
      recommended_action: cleanText(body.recommended_action, 1500),
      customer_present: cleanBoolean(body.customer_present),
      signature_required: cleanBoolean(body.signature_required),
      completed_at: cleanDate(body.completed_at) ?? new Date().toISOString()
    });

    const { data: before } = await supabase
      .from('service_inspections')
      .select('inspection_id,status,findings,diagnosis,recommended_action,completed_at,service_request_id,job_id,customer_id')
      .eq('inspection_id', inspectionId)
      .maybeSingle();
    const { data, error } = await supabase
      .from('service_inspections')
      .update(patch)
      .eq('inspection_id', inspectionId)
      .select('inspection_id,service_request_id,job_id,customer_id,engineer_id,scheduled_at,status,location,findings,diagnosis,recommended_action,customer_present,signature_required,completed_at,created_by,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    let hook: Record<string, unknown> = {};
    if (data.status === 'completed') {
      const [task, notification] = await Promise.all([
        createFollowUpTask(supabase, { sourceTable: 'service_inspections', sourceId: inspectionId, title: 'Review completed inspection and prepare quotation', description: `Inspection completed. Diagnosis: ${data.diagnosis ?? 'N/A'}`, priority: 'P1' }),
        queueCustomerNotification(supabase, { subject: 'NANOFIX inspection completed', body: 'Your NANOFIX inspection record has been completed and is under review.', relatedObjectType: 'service_inspection', relatedObjectId: inspectionId, customerId: data.customer_id, channel: 'internal', payload: { service_request_id: data.service_request_id, job_id: data.job_id } })
      ]);
      hook = { task, notification };
    }

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_inspection_form_submit', objectType: 'service_inspection', objectId: inspectionId, before, after: { inspection: data, hook }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, inspection: data, hook });
  }

  if (action === 'assign_engineer') {
    const role = auth.role;
    if (!MANAGER_ROLES.includes(role as typeof MANAGER_ROLES[number])) return jsonError('Only manager roles can assign engineers.', 403);
    const inspectionId = cleanText(body.inspection_id, 120);
    const engineerId = cleanText(body.engineer_id, 120);
    if (!isUuid(inspectionId) || !isUuid(engineerId)) return jsonError('Valid inspection_id and engineer_id are required.', 400);

    const { data, error } = await supabase
      .from('service_inspections')
      .update({ engineer_id: engineerId, status: cleanText(body.status, 80) ?? 'assigned' })
      .eq('inspection_id', inspectionId)
      .select('inspection_id,service_request_id,job_id,engineer_id,scheduled_at,status,location,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_engineer_assign', objectType: 'service_inspection', objectId: inspectionId, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, inspection: data });
  }

  if (action === 'create_upload_review') {
    const payload = stripUndefined(uploadPayload(body, auth.actor.profileId));
    if (!payload.inspection_id && !payload.service_request_id && !payload.job_id) return jsonError('inspection_id, service_request_id or job_id is required.', 400);
    if (!payload.file_name || !payload.storage_path) return jsonError('file_name and storage_path are required.', 400);

    const { data, error } = await supabase
      .from('service_upload_reviews')
      .insert(payload)
      .select('upload_review_id,service_request_id,job_id,inspection_id,uploaded_by,file_name,file_type,storage_path,review_status,review_notes,reviewed_by,reviewed_at,compression_status,original_size_bytes,compressed_size_bytes,checksum_sha256,notification_id,attached_to_record,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_upload_review_create', objectType: 'service_upload_review', objectId: data.upload_review_id, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, upload_review: data }, { status: 201 });
  }

  if (action === 'review_upload') {
    const uploadReviewId = cleanText(body.upload_review_id, 120);
    if (!isUuid(uploadReviewId)) return jsonError('Valid upload_review_id is required.', 400);
    const reviewStatus = cleanText(body.review_status, 80) ?? 'approved';
    const patch = {
      review_status: reviewStatus,
      review_notes: cleanText(body.review_notes, 1000),
      reviewed_by: auth.actor.profileId,
      reviewed_at: new Date().toISOString(),
      attached_to_record: reviewStatus === 'approved'
    };

    const { data, error } = await supabase
      .from('service_upload_reviews')
      .update(patch)
      .eq('upload_review_id', uploadReviewId)
      .select('upload_review_id,service_request_id,job_id,inspection_id,uploaded_by,file_name,file_type,storage_path,review_status,review_notes,reviewed_by,reviewed_at,compression_status,original_size_bytes,compressed_size_bytes,checksum_sha256,notification_id,attached_to_record,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    let notification = null;
    if (reviewStatus === 'approved') {
      notification = await queueCustomerNotification(supabase, { subject: 'NANOFIX upload approved', body: `Upload ${data.file_name} has been approved and attached to the service record.`, relatedObjectType: 'service_upload_review', relatedObjectId: uploadReviewId, channel: 'internal', payload: { storage_path: data.storage_path, inspection_id: data.inspection_id, service_request_id: data.service_request_id, job_id: data.job_id } });
      await supabase.from('service_upload_reviews').update({ notification_id: notification.notification_id }).eq('upload_review_id', uploadReviewId).throwOnError();
    }

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_upload_review_update', objectType: 'service_upload_review', objectId: uploadReviewId, after: { upload_review: data, notification }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, upload_review: data, notification });
  }

  if (action === 'queue_customer_notification') {
    const relatedObjectType = cleanText(body.related_object_type, 120) ?? 'service_operations';
    const relatedObjectId = cleanText(body.related_object_id, 120);
    if (!relatedObjectId) return jsonError('related_object_id is required.', 400);
    const notification = await queueCustomerNotification(supabase, { subject: cleanText(body.subject, 180) ?? 'NANOFIX service update', body: cleanText(body.body, 1000) ?? 'Your NANOFIX service record has been updated.', relatedObjectType, relatedObjectId, customerId: uuidOrNull(body.customer_id), channel: cleanText(body.channel, 80) ?? 'internal', payload: { source: 'manual_service_operations_notification' } });
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_customer_notification_queue', objectType: relatedObjectType, objectId: relatedObjectId, after: notification, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, notification }, { status: 201 });
  }

  return jsonError('Unsupported inspection/upload action.', 400);
}
