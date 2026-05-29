export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const WRITE_ROLES = ['super_admin', 'operations_admin', 'support', 'engineer'] as const;
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
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function safePathPart(value: string | null | undefined) {
  return (value || 'unlinked').replace(/[^a-z0-9_.-]/gi, '-').replace(/-+/g, '-').slice(0, 100) || 'unlinked';
}

function cleanNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uuidOrNull(value: unknown) {
  const text = cleanText(value, 120);
  return isUuid(text) ? text : null;
}

function pathFor(input: { fileName: string; inspectionId?: string | null; serviceRequestId?: string | null; jobId?: string | null; actorId: string }) {
  const scope = input.inspectionId ? `inspection-${safePathPart(input.inspectionId)}` : input.jobId ? `job-${safePathPart(input.jobId)}` : input.serviceRequestId ? `request-${safePathPart(input.serviceRequestId)}` : `manual-${safePathPart(input.actorId)}`;
  return `service-operations/${scope}/${Date.now()}-${safePathPart(input.fileName)}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 80) ?? 'create_signed_upload_url';
  const supabase = createAdminClient();

  if (action === 'create_signed_upload_url') {
    const fileName = cleanText(body.file_name, 240);
    const mimeType = cleanText(body.mime_type, 120);
    const sizeBytes = cleanNumber(body.size_bytes) ?? 0;
    const inspectionId = cleanText(body.inspection_id, 120);
    const serviceRequestId = cleanText(body.service_request_id, 120);
    const jobId = cleanText(body.job_id, 120);

    if (!fileName) return jsonError('file_name is required.', 400);
    if (!mimeType || !MIME_TO_TYPE[mimeType]) return jsonError('Unsupported mime_type for service upload.', 400);
    if (sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) return jsonError('size_bytes must be between 1 and 52428800.', 400);
    if (inspectionId && !isUuid(inspectionId)) return jsonError('inspection_id must be UUID when provided.', 400);
    if (serviceRequestId && !isUuid(serviceRequestId)) return jsonError('service_request_id must be UUID when provided.', 400);
    if (jobId && !isUuid(jobId)) return jsonError('job_id must be UUID when provided.', 400);

    const storagePath = pathFor({ fileName, inspectionId, serviceRequestId, jobId, actorId: auth.actor.profileId });
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath);
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({
      actorId: auth.actor.profileId,
      role: auth.role,
      action: 'service_operations_signed_upload_url_create',
      objectType: 'storage_object',
      objectId: storagePath,
      after: { bucket: BUCKET, storage_path: storagePath, file_name: fileName, mime_type: mimeType, size_bytes: sizeBytes },
      ip: getClientIp(request)
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      bucket: BUCKET,
      storage_path: storagePath,
      signed_url: data.signedUrl,
      token: data.token,
      file_type: MIME_TO_TYPE[mimeType],
      compression_required: mimeType.startsWith('image/') || mimeType.startsWith('video/'),
      max_size_bytes: MAX_SIZE_BYTES
    });
  }

  if (action === 'register_completed_upload') {
    const storagePath = cleanText(body.storage_path, 500);
    const fileName = cleanText(body.file_name, 240);
    const mimeType = cleanText(body.mime_type, 120);
    const fileType = mimeType ? MIME_TO_TYPE[mimeType] : cleanText(body.file_type, 40) ?? 'other';
    if (!storagePath || !fileName) return jsonError('storage_path and file_name are required.', 400);

    const originalSize = cleanNumber(body.original_size_bytes);
    const compressedSize = cleanNumber(body.compressed_size_bytes);
    const compressionStatus = cleanText(body.compression_status, 80) ?? (compressedSize && originalSize && compressedSize < originalSize ? 'compressed' : 'not_required');

    const { data, error } = await supabase
      .from('service_upload_reviews')
      .insert({
        service_request_id: uuidOrNull(body.service_request_id),
        job_id: uuidOrNull(body.job_id),
        inspection_id: uuidOrNull(body.inspection_id),
        uploaded_by: auth.actor.profileId,
        file_name: fileName,
        file_type: fileType,
        storage_path: storagePath,
        review_status: 'pending_review',
        review_notes: cleanText(body.review_notes, 1000) ?? 'Registered after signed upload URL flow.',
        compression_status: compressionStatus,
        original_size_bytes: originalSize,
        compressed_size_bytes: compressedSize,
        checksum_sha256: cleanText(body.checksum_sha256, 128)
      })
      .select('upload_review_id,service_request_id,job_id,inspection_id,uploaded_by,file_name,file_type,storage_path,review_status,review_notes,compression_status,original_size_bytes,compressed_size_bytes,checksum_sha256,notification_id,attached_to_record,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({
      actorId: auth.actor.profileId,
      role: auth.role,
      action: 'service_operations_completed_upload_register',
      objectType: 'service_upload_review',
      objectId: data.upload_review_id,
      after: data,
      ip: getClientIp(request)
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, upload_review: data }, { status: 201 });
  }

  return jsonError('Unsupported storage upload action.', 400);
}
