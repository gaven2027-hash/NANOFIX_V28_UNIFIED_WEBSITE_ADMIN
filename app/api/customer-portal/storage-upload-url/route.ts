export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;
const BUCKET = 'service-uploads';
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const MIME_TO_TYPE: Record<string, string> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/heic': 'image',
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'document'
};

type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function safePathPart(value: string | null | undefined) {
  return (value || 'unlinked').replace(/[^a-z0-9_.-]/gi, '-').replace(/-+/g, '-').slice(0, 100) || 'unlinked';
}

function cleanNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function customerIdsForProfile(profileId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.customer_id as string).filter(Boolean);
}

async function assertCustomerOwnsServiceRequest(profileId: string, serviceRequestId: string) {
  const supabase = createAdminClient();
  const customerIds = await customerIdsForProfile(profileId);
  if (!customerIds.length) throw new Error('Active linked customer profile is required.');
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id')
    .eq('service_request_id', serviceRequestId)
    .in('customer_id', customerIds)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Service request is not linked to this customer.');
  return data;
}

function pathFor(fileName: string, serviceRequestId: string) {
  return `service-operations/request-${safePathPart(serviceRequestId)}/${Date.now()}-${safePathPart(fileName)}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 80) ?? 'create_signed_upload_url';
  const supabase = createAdminClient();

  if (action === 'create_signed_upload_url') {
    const serviceRequestId = cleanText(body.service_request_id, 120);
    const fileName = cleanText(body.file_name, 240);
    const mimeType = cleanText(body.mime_type, 120);
    const sizeBytes = cleanNumber(body.size_bytes) ?? 0;
    if (!serviceRequestId || !isUuid(serviceRequestId)) return jsonError('Valid service_request_id is required.', 400);
    if (!fileName) return jsonError('file_name is required.', 400);
    if (!mimeType || !MIME_TO_TYPE[mimeType]) return jsonError('Unsupported mime_type for customer portal upload.', 400);
    if (sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) return jsonError('size_bytes must be between 1 and 52428800.', 400);

    const ownership = await assertCustomerOwnsServiceRequest(auth.actor.profileId, serviceRequestId);
    const storagePath = pathFor(fileName, serviceRequestId);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath);
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({
      actorId: auth.actor.profileId,
      role: auth.role,
      action: 'customer_portal_signed_upload_url_create',
      objectType: 'storage_object',
      objectId: storagePath,
      after: { bucket: BUCKET, storage_path: storagePath, file_name: fileName, mime_type: mimeType, size_bytes: sizeBytes, service_request_id: ownership.service_request_id },
      ip: getClientIp(request)
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      bucket: BUCKET,
      storage_path: storagePath,
      token: data.token,
      signed_url: data.signedUrl,
      service_request_id: ownership.service_request_id,
      file_type: MIME_TO_TYPE[mimeType],
      compression_required: mimeType.startsWith('image/') || mimeType.startsWith('video/'),
      max_size_bytes: MAX_SIZE_BYTES
    });
  }

  if (action === 'register_completed_upload') {
    const serviceRequestId = cleanText(body.service_request_id, 120);
    const storagePath = cleanText(body.storage_path, 500);
    const fileName = cleanText(body.file_name, 240);
    const mimeType = cleanText(body.mime_type, 120);
    if (!serviceRequestId || !isUuid(serviceRequestId)) return jsonError('Valid service_request_id is required.', 400);
    if (!storagePath || !fileName) return jsonError('storage_path and file_name are required.', 400);
    const ownership = await assertCustomerOwnsServiceRequest(auth.actor.profileId, serviceRequestId);
    if (!storagePath.startsWith(`service-operations/request-${serviceRequestId}/`)) return jsonError('storage_path does not match the service request scope.', 400);

    const originalSize = cleanNumber(body.original_size_bytes);
    const compressedSize = cleanNumber(body.compressed_size_bytes);
    const compressionStatus = cleanText(body.compression_status, 80) ?? 'pending_client_compression';
    const fileType = mimeType && MIME_TO_TYPE[mimeType] ? MIME_TO_TYPE[mimeType] : 'other';

    const { data, error } = await supabase
      .from('service_upload_reviews')
      .insert({
        service_request_id: ownership.service_request_id,
        uploaded_by: auth.actor.profileId,
        file_name: fileName,
        file_type: fileType,
        storage_path: storagePath,
        review_status: 'pending_review',
        review_notes: cleanText(body.review_notes, 1000) ?? 'Customer portal upload registered for admin review.',
        compression_status: compressionStatus,
        original_size_bytes: originalSize,
        compressed_size_bytes: compressedSize,
        checksum_sha256: cleanText(body.checksum_sha256, 128),
        visible_to_customer: false
      })
      .select('upload_review_id,service_request_id,file_name,file_type,storage_path,review_status,compression_status,visible_to_customer,created_at')
      .single();
    if (error) return jsonError(error.message, 400);

    const [taskResult, inboxResult] = await Promise.all([
      supabase
        .from('unified_tasks')
        .insert({ source_module: 'customer_portal', source_table: 'service_upload_reviews', source_id: data.upload_review_id, title: 'Review customer uploaded file', description: `Customer uploaded ${fileName} for service request ${serviceRequestId}.`, priority: 'P2', assignee_role: 'operations_admin', status: 'open', metadata_json: { source: 'customer_portal_storage_upload' } })
        .select('task_id')
        .single(),
      supabase
        .from('internal_inbox_messages')
        .insert({ recipient_role: 'operations_admin', subject: 'Customer upload pending review', body: `Customer uploaded ${fileName} for service request ${serviceRequestId}.`, category: 'customer_portal_upload', priority: 'P2', related_object_type: 'service_upload_review', related_object_id: data.upload_review_id })
        .select('message_id')
        .single()
    ]);
    if (taskResult.error) return jsonError(taskResult.error.message, 400);
    if (inboxResult.error) return jsonError(inboxResult.error.message, 400);
    await supabase.from('task_events').insert({ task_id: taskResult.data.task_id, action: 'customer_upload_review_task_created', after_json: data }).throwOnError();

    await writeAuditLog({
      actorId: auth.actor.profileId,
      role: auth.role,
      action: 'customer_portal_completed_upload_register',
      objectType: 'service_upload_review',
      objectId: data.upload_review_id,
      after: { upload_review: data, task: taskResult.data, inbox: inboxResult.data },
      ip: getClientIp(request)
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, upload_review: data, task: taskResult.data, inbox: inboxResult.data }, { status: 201 });
  }

  return jsonError('Unsupported customer portal storage upload action.', 400);
}
