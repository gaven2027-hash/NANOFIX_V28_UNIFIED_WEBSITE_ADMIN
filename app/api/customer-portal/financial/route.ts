export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const ALLOWED_ROLES = ['customer', 'super_admin', 'operations_admin', 'support'] as const;
const BUCKET = 'service-uploads';

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

async function jobIdsForCustomers(customerIds: string[]) {
  const supabase = createAdminClient();
  if (!customerIds.length) return [];

  const { data: requests, error: requestError } = await supabase
    .from('service_requests')
    .select('service_request_id')
    .in('customer_id', customerIds);
  if (requestError) throw new Error(requestError.message);
  const requestIds = unique((requests ?? []).map((row) => row.service_request_id as string));

  const { data: directJobs, error: directJobError } = await supabase
    .from('jobs')
    .select('job_id')
    .in('customer_id', customerIds);
  if (directJobError) throw new Error(directJobError.message);
  const jobIds = unique((directJobs ?? []).map((row) => row.job_id as string));

  if (requestIds.length) {
    const { data: requestJobs, error: requestJobError } = await supabase
      .from('jobs')
      .select('job_id')
      .in('service_request_id', requestIds);
    if (requestJobError) throw new Error(requestJobError.message);
    jobIds.push(...unique((requestJobs ?? []).map((row) => row.job_id as string)));
  }

  return unique(jobIds);
}

async function signedDocumentUrl(path: string | null | undefined, bucket?: string | null | undefined) {
  if (!path) return { url: null, error: null };
  const supabase = createAdminClient();
  const storageBucket = bucket || BUCKET;
  const { data, error } = await supabase.storage.from(storageBucket).createSignedUrl(path, 300);
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

async function loadVisibleWarranties(customerIds: string[], jobIds: string[], limit: number) {
  const supabase = createAdminClient();
  const merged: Record<string, unknown>[] = [];

  if (jobIds.length) {
    const { data, error } = await supabase
      .from('warranties')
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,terms_snapshot,pdf_storage_path,visible_to_customer,customer_visible_at,public_ref,created_at')
      .in('job_id', jobIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    merged.push(...(data ?? []));
  }

  if (customerIds.length) {
    const { data, error } = await supabase
      .from('warranties')
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,terms_snapshot,pdf_storage_path,visible_to_customer,customer_visible_at,public_ref,created_at')
      .in('customer_id', customerIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    merged.push(...(data ?? []));
  }

  const deduped = merged.filter((row, index, list) => list.findIndex((item) => item.warranty_id === row.warranty_id) === index).slice(0, limit);
  const warranties = await withSignedPdf(deduped as Array<{ pdf_storage_path?: string | null }>);
  const warrantyIds = unique(deduped.map((row) => row.warranty_id as string));

  let warrantyPdfs: unknown[] = [];
  if (warrantyIds.length) {
    const { data, error } = await supabase
      .from('warranty_pdf_documents')
      .select('warranty_pdf_id,warranty_id,customer_id,job_id,warranty_version,storage_bucket,storage_path,file_name,mime_type,file_size_bytes,public_ref,generation_status,visible_to_customer,customer_visible_at,generated_at,created_at')
      .in('warranty_id', warrantyIds)
      .eq('visible_to_customer', true)
      .in('generation_status', ['generated', 'uploaded'])
      .order('warranty_version', { ascending: false })
      .limit(limit * 3);
    if (error) throw new Error(error.message);
    warrantyPdfs = await withSignedWarrantyPdf(data ?? []);
  }

  return { warranties, warranty_pdfs: warrantyPdfs };
}

async function loadFinancialForJobs(customerIds: string[], jobIds: string[], limit: number) {
  const supabase = createAdminClient();
  const empty = { quotations: [], quotation_versions: [], invoices: [], payments: [], warranties: [], warranty_pdfs: [] };
  if (!jobIds.length && !customerIds.length) return empty;

  let quotations: unknown[] = [];
  let quotationVersions: unknown[] = [];
  let invoices: unknown[] = [];
  let payments: unknown[] = [];

  if (jobIds.length) {
    const { data: quotationsRaw, error: quotationError } = await supabase
      .from('quotations')
      .select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,customer_visibility_notes,pdf_storage_path,public_ref,created_at')
      .in('job_id', jobIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (quotationError) throw new Error(quotationError.message);
    quotations = await withSignedPdf(quotationsRaw ?? []);
    const quotationIds = unique((quotationsRaw ?? []).map((row) => row.quotation_id as string));

    if (quotationIds.length) {
      const { data, error } = await supabase
        .from('quotation_versions')
        .select('version_id,quotation_id,version,line_items,total,created_at')
        .in('quotation_id', quotationIds)
        .order('created_at', { ascending: false })
        .limit(limit * 3);
      if (error) throw new Error(error.message);
      quotationVersions = data ?? [];
    }

    const { data: invoicesRaw, error: invoiceError } = await supabase
      .from('invoices')
      .select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,customer_visibility_notes,pdf_storage_path,payment_url,public_ref,created_at')
      .in('job_id', jobIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (invoiceError) throw new Error(invoiceError.message);
    invoices = await withSignedPdf(invoicesRaw ?? []);
    const invoiceIds = unique((invoicesRaw ?? []).map((row) => row.invoice_id as string));

    if (invoiceIds.length) {
      const { data, error } = await supabase
        .from('payments')
        .select('payment_id,invoice_id,amount,status,fee,reconciled_at,payment_url,visible_to_customer,created_at')
        .in('invoice_id', invoiceIds)
        .eq('visible_to_customer', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      payments = data ?? [];
    }
  }

  const warrantyDocuments = await loadVisibleWarranties(customerIds, jobIds, limit);
  return { quotations, quotation_versions: quotationVersions, invoices, payments, ...warrantyDocuments };
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...ALLOWED_ROLES]);
  if (!auth.ok) return auth.response;

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 20), 1), 50);
  const { customers, customerIds } = await customerIdsForProfile(auth.actor.profileId);
  const jobIds = await jobIdsForCustomers(customerIds);
  const financial = await loadFinancialForJobs(customerIds, jobIds, limit);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_financial_read',
    objectType: 'customer_portal_financial',
    after: {
      customers: customers.length,
      jobs: jobIds.length,
      quotations: financial.quotations.length,
      invoices: financial.invoices.length,
      payments: financial.payments.length,
      warranties: financial.warranties.length,
      warranty_pdfs: financial.warranty_pdfs.length
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, customers, job_ids: jobIds, ...financial });
}
