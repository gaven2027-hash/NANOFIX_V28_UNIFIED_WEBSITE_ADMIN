export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const BUCKET = 'service-uploads';
const CUSTOMER_AND_INTERNAL_ROLES = ['customer', 'super_admin', 'operations_admin', 'support'] as const;

type UploadRow = {
  upload_review_id: string;
  service_request_id: string | null;
  job_id: string | null;
  inspection_id: string | null;
  file_name: string;
  file_type: string;
  storage_path: string;
  review_status: string;
  visible_to_customer: boolean;
  customer_visibility_notes: string | null;
  created_at: string;
};

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
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

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function allowedRelatedIdsForCustomers(customerIds: string[]) {
  const supabase = createAdminClient();
  if (!customerIds.length) return { serviceRequestIds: [] as string[], jobIds: [] as string[], inspectionIds: [] as string[] };

  const { data: requests, error: requestError } = await supabase
    .from('service_requests')
    .select('service_request_id')
    .in('customer_id', customerIds);
  if (requestError) throw new Error(requestError.message);

  const requestIds = unique((requests ?? []).map((row) => row.service_request_id as string));
  const { data: jobs, error: jobError } = await supabase
    .from('jobs')
    .select('job_id')
    .in('customer_id', customerIds);
  if (jobError) throw new Error(jobError.message);

  const jobIds = unique((jobs ?? []).map((row) => row.job_id as string));
  const { data: inspections, error: inspectionError } = await supabase
    .from('service_inspections')
    .select('inspection_id')
    .or(`customer_id.in.(${customerIds.join(',')}),service_request_id.in.(${requestIds.join(',')}),job_id.in.(${jobIds.join(',')})`);
  if (inspectionError) throw new Error(inspectionError.message);

  return { serviceRequestIds: requestIds, jobIds, inspectionIds: unique((inspections ?? []).map((row) => row.inspection_id as string)) };
}

function belongsToAllowed(row: UploadRow, allowed: { serviceRequestIds: string[]; jobIds: string[]; inspectionIds: string[] }) {
  return Boolean(
    (row.service_request_id && allowed.serviceRequestIds.includes(row.service_request_id)) ||
    (row.job_id && allowed.jobIds.includes(row.job_id)) ||
    (row.inspection_id && allowed.inspectionIds.includes(row.inspection_id))
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_AND_INTERNAL_ROLES]);
  if (!auth.ok) return auth.response;

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 20), 1), 50);
  const uploadReviewId = cleanText(request.nextUrl.searchParams.get('upload_review_id'), 120);
  if (uploadReviewId && !isUuid(uploadReviewId)) return jsonError('upload_review_id must be a valid UUID.', 400);

  const supabase = createAdminClient();
  let customerIds: string[] = [];
  let allowed = { serviceRequestIds: [] as string[], jobIds: [] as string[], inspectionIds: [] as string[] };

  if (auth.role === 'customer') {
    customerIds = await customerIdsForProfile(auth.actor.profileId);
    allowed = await allowedRelatedIdsForCustomers(customerIds);
    if (!customerIds.length) return NextResponse.json({ ok: true, uploads: [], customer_ids: [] });
  }

  let query = supabase
    .from('service_upload_reviews')
    .select('upload_review_id,service_request_id,job_id,inspection_id,file_name,file_type,storage_path,review_status,visible_to_customer,customer_visibility_notes,created_at')
    .eq('review_status', 'approved')
    .eq('visible_to_customer', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (uploadReviewId) query = query.eq('upload_review_id', uploadReviewId);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  const rows = (data ?? []) as UploadRow[];
  const visibleRows = auth.role === 'customer' ? rows.filter((row) => belongsToAllowed(row, allowed)) : rows;

  const uploads = await Promise.all(visibleRows.map(async (row) => {
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 300);
    return {
      upload_review_id: row.upload_review_id,
      file_name: row.file_name,
      file_type: row.file_type,
      created_at: row.created_at,
      customer_visibility_notes: row.customer_visibility_notes,
      download_url: signed.data?.signedUrl ?? null,
      download_error: signed.error?.message ?? null
    };
  }));

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_uploads_signed_download_read',
    objectType: 'service_upload_reviews',
    after: { count: uploads.length, customer_ids: auth.role === 'customer' ? customerIds : undefined },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, uploads, customer_ids: auth.role === 'customer' ? customerIds : undefined });
}
