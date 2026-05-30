export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;
const BUCKET = 'service-uploads';
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_FILES_HINT = 12;

type DimensionPayload = {
  original_width?: number;
  original_height?: number;
  processed_width?: number;
  processed_height?: number;
  original_size_bytes?: number;
  compression_status?: string;
  compression_notes?: string;
  clarity_profile?: string;
};

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function safeName(value: string) {
  return value.replace(/[^a-z0-9_.-]/gi, '-').replace(/-+/g, '-').slice(0, 120) || 'upload';
}

function mediaType(mimeType: string) {
  if (IMAGE_TYPES.has(mimeType)) return 'image';
  if (VIDEO_TYPES.has(mimeType)) return 'video';
  return null;
}

function cleanNumber(value: FormDataEntryValue | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

async function activeCustomerForProfile(profileId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,account_status,binding_status,created_at')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Active linked customer profile is required.');
  return data as Record<string, unknown>;
}

async function verifyPortalRequest(customerId: string, portalRequestId: string | null) {
  if (!portalRequestId) return null;
  const supabase = createAdminClient();
  if (!isUuid(portalRequestId)) throw new Error('portal_request_id must be a valid UUID.');
  const { data, error } = await supabase
    .from('customer_portal_requests')
    .select('portal_request_id,created_service_request_id,customer_id,request_type,status')
    .eq('portal_request_id', portalRequestId)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Portal request is not linked to this customer.');
  return data as Record<string, unknown>;
}

async function verifyServiceRequest(customerId: string, serviceRequestId: string | null) {
  if (!serviceRequestId) return null;
  const supabase = createAdminClient();
  if (!isUuid(serviceRequestId)) throw new Error('service_request_id must be a valid UUID.');
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,customer_portal_request_id,portal_source_type,status')
    .eq('service_request_id', serviceRequestId)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Service request is not linked to this customer.');
  return data as Record<string, unknown>;
}

async function linkUploadAsset(input: { uploadAssetId: string; portalRequestId: string | null; serviceRequestId: string | null; storagePath: string }) {
  const supabase = createAdminClient();
  if (input.portalRequestId) {
    const { data } = await supabase.from('customer_portal_requests').select('upload_asset_ids,attachment_urls').eq('portal_request_id', input.portalRequestId).maybeSingle();
    const ids = Array.isArray(data?.upload_asset_ids) ? data.upload_asset_ids : [];
    const urls = Array.isArray(data?.attachment_urls) ? data.attachment_urls : [];
    await supabase.from('customer_portal_requests').update({
      upload_asset_ids: [...new Set([...ids, input.uploadAssetId])],
      attachment_urls: [...new Set([...urls, input.storagePath])]
    }).eq('portal_request_id', input.portalRequestId).throwOnError();
  }
  if (input.serviceRequestId) {
    const { data } = await supabase.from('service_requests').select('customer_upload_asset_ids,customer_attachment_urls').eq('service_request_id', input.serviceRequestId).maybeSingle();
    const ids = Array.isArray(data?.customer_upload_asset_ids) ? data.customer_upload_asset_ids : [];
    const urls = Array.isArray(data?.customer_attachment_urls) ? data.customer_attachment_urls : [];
    await supabase.from('service_requests').update({
      customer_upload_asset_ids: [...new Set([...ids, input.uploadAssetId])],
      customer_attachment_urls: [...new Set([...urls, input.storagePath])]
    }).eq('service_request_id', input.serviceRequestId).throwOnError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return jsonError('Upload file is required.', 400);

    const mimeType = file.type || 'application/octet-stream';
    const kind = mediaType(mimeType);
    if (!kind) return jsonError('Only JPG, PNG, WebP, MP4, MOV and WebM files are allowed.', 400);
    if (kind === 'image' && file.size > MAX_IMAGE_BYTES) return jsonError('Processed image is too large. Please upload an image up to 5MB after compression.', 400);
    if (kind === 'video' && file.size > MAX_VIDEO_BYTES) return jsonError('Video is too large. Please upload a video up to 80MB.', 400);

    const supabase = createAdminClient();
    const customer = await activeCustomerForProfile(auth.actor.profileId);
    const customerId = String(customer.customer_id);
    const portalRequestId = cleanText(formData.get('portal_request_id'), 120);
    const providedServiceRequestId = cleanText(formData.get('service_request_id'), 120);
    const portalRequest = await verifyPortalRequest(customerId, portalRequestId);
    const serviceRequestId = providedServiceRequestId || (typeof portalRequest?.created_service_request_id === 'string' ? portalRequest.created_service_request_id : null);
    await verifyServiceRequest(customerId, serviceRequestId);

    const dimensions: DimensionPayload = {
      original_width: cleanNumber(formData.get('original_width')) ?? undefined,
      original_height: cleanNumber(formData.get('original_height')) ?? undefined,
      processed_width: cleanNumber(formData.get('processed_width')) ?? undefined,
      processed_height: cleanNumber(formData.get('processed_height')) ?? undefined,
      original_size_bytes: cleanNumber(formData.get('original_size_bytes')) ?? file.size,
      compression_status: cleanText(formData.get('compression_status'), 80) || (kind === 'image' ? 'client_processed' : 'stored_original'),
      compression_notes: cleanText(formData.get('compression_notes'), 500) || (kind === 'image' ? 'Image compressed in browser with clarity-preserving balanced profile.' : 'Video validated and stored original; transcoding adapter can process later.'),
      clarity_profile: cleanText(formData.get('clarity_profile'), 80) || (kind === 'image' ? 'balanced_clear' : 'video_original_clear')
    };

    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : mimeType === 'video/mp4' ? 'mp4' : mimeType === 'video/quicktime' ? 'mov' : 'webm';
    const baseName = safeName(file.name.replace(/\.[^.]+$/, ''));
    const storagePath = `customer-portal/${customerId}/${portalRequestId || 'unlinked'}/${Date.now()}-${baseName}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType: mimeType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: asset, error: assetError } = await supabase.from('customer_upload_assets').insert({
      customer_id: customerId,
      uploaded_by_profile_id: auth.actor.profileId,
      portal_request_id: portalRequestId || null,
      service_request_id: serviceRequestId || null,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      original_file_name: file.name,
      stored_file_name: `${baseName}.${extension}`,
      mime_type: mimeType,
      media_type: kind,
      original_size_bytes: dimensions.original_size_bytes,
      processed_size_bytes: file.size,
      original_width: dimensions.original_width ?? null,
      original_height: dimensions.original_height ?? null,
      processed_width: dimensions.processed_width ?? null,
      processed_height: dimensions.processed_height ?? null,
      compression_status: dimensions.compression_status,
      compression_notes: dimensions.compression_notes,
      clarity_profile: dimensions.clarity_profile,
      upload_status: 'uploaded'
    }).select('upload_asset_id,customer_id,portal_request_id,service_request_id,storage_bucket,storage_path,original_file_name,stored_file_name,mime_type,media_type,original_size_bytes,processed_size_bytes,compression_status,clarity_profile,upload_status,created_at').single();
    if (assetError) throw new Error(assetError.message);

    await linkUploadAsset({ uploadAssetId: String(asset.upload_asset_id), portalRequestId: portalRequestId || null, serviceRequestId: serviceRequestId || null, storagePath });
    await supabase.from('task_events').insert({
      task_id: null,
      action: 'customer_upload_asset_uploaded',
      after_json: { asset, max_files_hint: MAX_FILES_HINT }
    }).throwOnError().catch(() => undefined);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'customer_portal_upload_asset', objectType: 'customer_upload_asset', objectId: String(asset.upload_asset_id), after: { asset, image_auto_compressed: kind === 'image', video_size_limited: kind === 'video' }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, asset, storage_path: storagePath }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 400);
  }
}
