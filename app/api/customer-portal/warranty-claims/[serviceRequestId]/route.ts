export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const ALLOWED_ROLES = ['customer', 'super_admin', 'operations_admin', 'support'] as const;
const DEFAULT_BUCKET = 'service-uploads';

type RouteContext = { params: Promise<{ serviceRequestId: string }> };

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
    .select('customer_id,name,phone,email,account_status,binding_status,created_at')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .limit(20);
  if (error) throw new Error(error.message);
  return { customers: data ?? [], customerIds: unique((data ?? []).map((row) => row.customer_id as string)) };
}

async function signedDocumentUrl(path: string | null | undefined, bucket?: string | null | undefined) {
  if (!path) return { url: null, error: null };
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(bucket || DEFAULT_BUCKET).createSignedUrl(path, 300);
  return { url: data?.signedUrl ?? null, error: error?.message ?? null };
}

async function withSignedPdf<T extends { pdf_storage_path?: string | null }>(rows: T[]) {
  return Promise.all(rows.map(async (row) => {
    const signed = await signedDocumentUrl(row.pdf_storage_path);
    return { ...row, pdf_download_url: signed.url, pdf_download_error: signed.error, has_download: Boolean(signed.url) };
  }));
}

async function withSignedWarrantyPdf<T extends { storage_bucket?: string | null; storage_path?: string | null }>(rows: T[]) {
  return Promise.all(rows.map(async (row) => {
    const signed = await signedDocumentUrl(row.storage_path, row.storage_bucket);
    return { ...row, pdf_download_url: signed.url, pdf_download_error: signed.error, has_download: Boolean(signed.url) };
  }));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireActorApi(request, [...ALLOWED_ROLES]);
  if (!auth.ok) return auth.response;

  const params = await context.params;
  const serviceRequestId = params.serviceRequestId;
  if (!isUuid(serviceRequestId)) return jsonError('Valid service request ID is required.', 400);

  const supabase = createAdminClient();
  const { customers, customerIds } = await customerIdsForProfile(auth.actor.profileId);

  if (!customerIds.length) return jsonError('No active customer profile linked to this account.', 403);

  const { data: serviceRequest, error: requestError } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,whatsapp,email,address_text,postal_code,issue_type,leak_location,issue_description,preferred_time_text,status,priority,request_origin,customer_portal_request_type,related_warranty_id,warranty_id,warranty_code,portal_attachment_urls,portal_customer_notes,warranty_claim_decision,warranty_claim_next_action,warranty_claim_decision_notes,warranty_claim_reviewed_at,warranty_claim_routing_status,warranty_claim_routed_job_id,warranty_claim_routed_quotation_id,warranty_claim_routed_at,warranty_claim_routing_notes,created_at,updated_at')
    .eq('service_request_id', serviceRequestId)
    .in('customer_id', customerIds)
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .maybeSingle();
  if (requestError) return jsonError(requestError.message, 500);
  if (!serviceRequest) return jsonError('Warranty claim not found for this customer.', 404);

  let relatedWarranty = null;
  const relatedWarrantyId = serviceRequest.related_warranty_id || serviceRequest.warranty_id;
  if (relatedWarrantyId && isUuid(String(relatedWarrantyId))) {
    const { data, error } = await supabase
      .from('warranties')
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,accepted_warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,terms_snapshot,pdf_storage_path,visible_to_customer,customer_visible_at,public_ref,created_at')
      .eq('warranty_id', String(relatedWarrantyId))
      .in('customer_id', customerIds)
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    relatedWarranty = data ? (await withSignedPdf([data]))[0] : null;
  }

  const jobIds = unique([serviceRequest.warranty_claim_routed_job_id as string | undefined, relatedWarranty?.job_id as string | undefined]);
  const quotationIds = unique([serviceRequest.warranty_claim_routed_quotation_id as string | undefined, relatedWarranty?.source_quotation_id as string | undefined]);

  let routedJob = null;
  if (jobIds.length) {
    const { data, error } = await supabase
      .from('jobs')
      .select('job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at')
      .in('job_id', jobIds)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) return jsonError(error.message, 500);
    routedJob = data ?? [];
  }

  let quotations: unknown[] = [];
  if (quotationIds.length || jobIds.length) {
    let query = supabase
      .from('quotations')
      .select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,customer_visibility_notes,pdf_storage_path,public_ref,created_at')
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (quotationIds.length) query = query.in('quotation_id', quotationIds);
    else query = query.in('job_id', jobIds);
    const { data, error } = await query;
    if (error) return jsonError(error.message, 500);
    quotations = await withSignedPdf(data ?? []);
  }

  const allQuotationIds = unique((quotations as Array<{ quotation_id?: string }>).map((row) => row.quotation_id));
  let quotationVersions: unknown[] = [];
  if (allQuotationIds.length) {
    const { data, error } = await supabase
      .from('quotation_versions')
      .select('version_id,quotation_id,version,line_items,total,warranty_years,warranty_terms,created_at')
      .in('quotation_id', allQuotationIds)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) return jsonError(error.message, 500);
    quotationVersions = data ?? [];
  }

  let invoices: unknown[] = [];
  if (jobIds.length) {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,customer_visibility_notes,pdf_storage_path,payment_url,public_ref,created_at')
      .in('job_id', jobIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return jsonError(error.message, 500);
    invoices = await withSignedPdf(data ?? []);
  }

  const invoiceIds = unique((invoices as Array<{ invoice_id?: string }>).map((row) => row.invoice_id));
  let payments: unknown[] = [];
  if (invoiceIds.length) {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_id,invoice_id,amount,status,fee,reconciled_at,payment_url,visible_to_customer,created_at')
      .in('invoice_id', invoiceIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return jsonError(error.message, 500);
    payments = data ?? [];
  }

  let warrantyPdfs: unknown[] = [];
  if (relatedWarranty?.warranty_id) {
    const { data, error } = await supabase
      .from('warranty_pdf_documents')
      .select('warranty_pdf_id,warranty_id,customer_id,job_id,warranty_version,storage_bucket,storage_path,file_name,mime_type,file_size_bytes,public_ref,generation_status,visible_to_customer,customer_visible_at,generated_at,created_at')
      .eq('warranty_id', relatedWarranty.warranty_id)
      .eq('visible_to_customer', true)
      .in('generation_status', ['generated', 'uploaded'])
      .order('warranty_version', { ascending: false })
      .limit(20);
    if (error) return jsonError(error.message, 500);
    warrantyPdfs = await withSignedWarrantyPdf(data ?? []);
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_warranty_claim_detail_read',
    objectType: 'service_request',
    objectId: serviceRequestId,
    after: {
      customers: customers.length,
      quotations: quotations.length,
      invoices: invoices.length,
      warranty_pdfs: warrantyPdfs.length
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    customers,
    service_request: serviceRequest,
    related_warranty: relatedWarranty,
    routed_jobs: routedJob ?? [],
    quotations,
    quotation_versions: quotationVersions,
    invoices,
    payments,
    warranty_pdfs: warrantyPdfs
  });
}
