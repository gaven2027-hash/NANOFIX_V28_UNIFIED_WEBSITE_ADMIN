export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const ALLOWED_ROLES = ['customer', 'super_admin', 'operations_admin', 'support'] as const;
const BUCKET = 'service-uploads';
type RouteContext = { params: Promise<{ serviceRequestId: string }> };
type UploadRow = { storage_path?: string | null; review_status?: string | null; visible_to_customer?: boolean | null } & Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
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
  return unique((data ?? []).map((row) => row.customer_id as string));
}

async function loadOwnedWarrantyClaim(profileId: string, serviceRequestId: string) {
  const supabase = createAdminClient();
  const customerIds = await customerIdsForProfile(profileId);
  if (!customerIds.length) throw new Error('Active linked customer profile is required.');
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,request_origin,customer_portal_request_type,status,related_warranty_id,warranty_claim_decision,warranty_claim_routing_status')
    .eq('service_request_id', serviceRequestId)
    .in('customer_id', customerIds)
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function withOptionalSignedUrl(row: UploadRow) {
  if (!row.storage_path || row.visible_to_customer !== true || row.review_status !== 'approved') return { ...row, file_url: null, has_file_access: false };
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 300);
  return { ...row, file_url: data?.signedUrl ?? null, file_url_error: error?.message ?? null, has_file_access: Boolean(data?.signedUrl) };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireActorApi(request, [...ALLOWED_ROLES]);
  if (!auth.ok) return auth.response;

  const { serviceRequestId } = await context.params;
  if (!isUuid(serviceRequestId)) return jsonError('Valid service request ID is required.', 400);

  const claim = await loadOwnedWarrantyClaim(auth.actor.profileId, serviceRequestId).catch((error) => {
    throw error;
  });
  if (!claim) return jsonError('Warranty claim not found for this customer.', 404);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('service_upload_reviews')
    .select('upload_review_id,service_request_id,uploaded_by,file_name,file_type,storage_path,review_status,review_notes,visible_to_customer,customer_visible_at,compression_status,original_size_bytes,compressed_size_bytes,checksum_sha256,created_at,updated_at')
    .eq('service_request_id', serviceRequestId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) return jsonError(error.message, 500);

  const attachments = await Promise.all((data ?? []).map((row) => withOptionalSignedUrl(row as UploadRow)));

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_warranty_claim_attachments_read',
    objectType: 'service_request',
    objectId: serviceRequestId,
    after: { count: attachments.length },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, claim, attachments });
}
