export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const ALLOWED_ROLES = ['customer', 'super_admin', 'operations_admin', 'support'] as const;
const DEFAULT_BUCKET = 'service-uploads';

type RouteContext = { params: Promise<{ serviceRequestId: string }> };
type Row = Record<string, unknown>;
type TimelineItem = { event_key: string; title: string; zh: string; status: string; timestamp: string; description: string; object_type: string; object_id: string };

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function addTimeline(items: TimelineItem[], item: Omit<TimelineItem, 'timestamp'> & { timestamp?: unknown }) {
  const timestamp = text(item.timestamp);
  if (!timestamp) return;
  items.push({ ...item, timestamp });
}

function buildCustomerTimeline(input: { serviceRequest: Row; relatedWarranty: Row | null; routedJobs: Row[]; quotations: Row[]; invoices: Row[]; payments: Row[]; warrantyPdfs: Row[] }) {
  const timeline: TimelineItem[] = [];
  const claimId = text(input.serviceRequest.service_request_id);

  addTimeline(timeline, { event_key: 'claim_submitted', title: 'Warranty claim submitted', zh: '已提交保修维修申请', status: text(input.serviceRequest.status) || 'submitted', timestamp: input.serviceRequest.created_at, description: 'NANOFIX received your warranty claim through the Customer Portal.', object_type: 'service_request', object_id: claimId });

  if (input.relatedWarranty) addTimeline(timeline, { event_key: 'linked_warranty_found', title: 'Linked warranty record found', zh: '已关联原保修单', status: text(input.relatedWarranty.status) || 'linked', timestamp: input.relatedWarranty.created_at, description: 'This claim is linked to your original warranty record.', object_type: 'warranty', object_id: text(input.relatedWarranty.warranty_id) });

  addTimeline(timeline, { event_key: 'admin_reviewed', title: 'Warranty claim reviewed', zh: '后台已审核保修申请', status: text(input.serviceRequest.warranty_claim_decision) || 'reviewed', timestamp: input.serviceRequest.warranty_claim_reviewed_at, description: text(input.serviceRequest.warranty_claim_next_action) || 'NANOFIX has reviewed the warranty claim and recorded the next action.', object_type: 'service_request', object_id: claimId });
  addTimeline(timeline, { event_key: 'claim_routed', title: 'Next step arranged', zh: '下一步流程已安排', status: text(input.serviceRequest.warranty_claim_routing_status) || 'routed', timestamp: input.serviceRequest.warranty_claim_routed_at, description: 'The warranty claim has been routed into the original service operations flow.', object_type: 'service_request', object_id: claimId });

  for (const job of input.routedJobs) {
    addTimeline(timeline, { event_key: 'job_created', title: 'Job record created', zh: '已生成或关联工单', status: text(job.status) || 'job_created', timestamp: job.created_at, description: 'A service job has been linked to this warranty claim.', object_type: 'job', object_id: text(job.job_id) });
    addTimeline(timeline, { event_key: 'job_scheduled', title: 'Site work scheduled', zh: '已安排现场工单时间', status: text(job.status) || 'scheduled', timestamp: job.scheduled_at, description: 'A site work schedule is linked to this claim.', object_type: 'job', object_id: text(job.job_id) });
  }

  for (const quotation of input.quotations) addTimeline(timeline, { event_key: 'quotation_visible', title: 'Quotation visible', zh: '报价已可查看', status: text(quotation.approval_status) || 'visible', timestamp: quotation.created_at, description: 'A customer-visible quotation is linked to this warranty claim.', object_type: 'quotation', object_id: text(quotation.quotation_id) });
  for (const invoice of input.invoices) addTimeline(timeline, { event_key: 'invoice_visible', title: 'Invoice visible', zh: '发票已可查看', status: text(invoice.status) || 'visible', timestamp: invoice.created_at, description: 'A customer-visible invoice is linked to this warranty claim.', object_type: 'invoice', object_id: text(invoice.invoice_id) });
  for (const pdf of input.warrantyPdfs) addTimeline(timeline, { event_key: 'warranty_pdf_visible', title: 'Warranty PDF visible', zh: '保修PDF已可查看', status: text(pdf.generation_status) || 'visible', timestamp: pdf.generated_at || pdf.created_at, description: 'A customer-visible warranty PDF is linked to this claim.', object_type: 'warranty_pdf', object_id: text(pdf.warranty_pdf_id) });
  for (const payment of input.payments) addTimeline(timeline, { event_key: 'payment_record_visible', title: 'Payment record visible', zh: '付款记录已可查看', status: text(payment.status) || 'visible', timestamp: payment.reconciled_at || payment.created_at, description: 'A payment record is linked to this claim.', object_type: 'payment', object_id: text(payment.payment_id) });

  addTimeline(timeline, { event_key: 'warranty_claim_completed', title: 'Warranty claim completed', zh: '保修维修申请已完成', status: text(input.serviceRequest.warranty_claim_closure_status) || 'completed', timestamp: input.serviceRequest.warranty_claim_completed_at, description: text(input.serviceRequest.warranty_claim_completion_summary) || 'NANOFIX marked this warranty claim as completed.', object_type: 'service_request', object_id: claimId });
  addTimeline(timeline, { event_key: 'warranty_claim_closed', title: 'Warranty claim closed', zh: '保修维修申请已关闭', status: text(input.serviceRequest.warranty_claim_closure_status) || 'closed', timestamp: input.serviceRequest.warranty_claim_closed_at, description: text(input.serviceRequest.warranty_claim_closure_notes) || 'NANOFIX closed this warranty claim record.', object_type: 'service_request', object_id: claimId });
  addTimeline(timeline, { event_key: 'warranty_claim_satisfaction_confirmed', title: 'Customer satisfaction confirmed', zh: '客户已确认满意度', status: text(input.serviceRequest.warranty_claim_customer_satisfaction_status) || 'pending', timestamp: input.serviceRequest.warranty_claim_customer_confirmed_at, description: text(input.serviceRequest.warranty_claim_customer_satisfaction_notes) || 'Customer satisfaction confirmation was recorded.', object_type: 'service_request', object_id: claimId });
  addTimeline(timeline, { event_key: 'warranty_claim_reopened_by_customer', title: 'Customer requested follow-up', zh: '客户要求继续处理', status: text(input.serviceRequest.warranty_claim_customer_satisfaction_status) || 'reopened', timestamp: input.serviceRequest.warranty_claim_customer_reopened_at, description: text(input.serviceRequest.warranty_claim_customer_reopen_reason) || 'Customer was not satisfied and requested follow-up.', object_type: 'service_request', object_id: claimId });

  return timeline.filter((item) => item.timestamp).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

async function customerIdsForProfile(profileId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('customers').select('customer_id,name,phone,email,account_status,binding_status,created_at').eq('profile_id', profileId).eq('account_status', 'active').limit(20);
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
  return Promise.all(rows.map(async (row) => { const signed = await signedDocumentUrl(row.pdf_storage_path); return { ...row, pdf_download_url: signed.url, pdf_download_error: signed.error, has_download: Boolean(signed.url) }; }));
}

async function withSignedWarrantyPdf<T extends { storage_bucket?: string | null; storage_path?: string | null }>(rows: T[]) {
  return Promise.all(rows.map(async (row) => { const signed = await signedDocumentUrl(row.storage_path, row.storage_bucket); return { ...row, pdf_download_url: signed.url, pdf_download_error: signed.error, has_download: Boolean(signed.url) }; }));
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
    .select('service_request_id,customer_id,contact_name,phone,whatsapp,email,address_text,postal_code,issue_type,leak_location,issue_description,preferred_time_text,status,priority,request_origin,customer_portal_request_type,related_warranty_id,warranty_id,warranty_code,portal_attachment_urls,portal_customer_notes,warranty_claim_decision,warranty_claim_next_action,warranty_claim_decision_notes,warranty_claim_reviewed_at,warranty_claim_routing_status,warranty_claim_routed_job_id,warranty_claim_routed_quotation_id,warranty_claim_routed_at,warranty_claim_routing_notes,warranty_claim_closure_status,warranty_claim_completed_at,warranty_claim_closed_at,warranty_claim_closed_by,warranty_claim_completion_summary,warranty_claim_closure_notes,warranty_claim_customer_satisfaction_status,warranty_claim_customer_satisfaction_rating,warranty_claim_customer_satisfaction_notes,warranty_claim_customer_confirmed_at,warranty_claim_customer_reopened_at,warranty_claim_customer_reopen_reason,created_at,updated_at')
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
    const { data, error } = await supabase.from('warranties').select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,accepted_warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,terms_snapshot,pdf_storage_path,visible_to_customer,customer_visible_at,public_ref,created_at').eq('warranty_id', String(relatedWarrantyId)).in('customer_id', customerIds).maybeSingle();
    if (error) return jsonError(error.message, 500);
    relatedWarranty = data ? (await withSignedPdf([data]))[0] : null;
  }

  const jobIds = unique([serviceRequest.warranty_claim_routed_job_id as string | undefined, relatedWarranty?.job_id as string | undefined]);
  const quotationIds = unique([serviceRequest.warranty_claim_routed_quotation_id as string | undefined, relatedWarranty?.source_quotation_id as string | undefined]);

  let routedJob: Row[] = [];
  if (jobIds.length) {
    const { data, error } = await supabase.from('jobs').select('job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at').in('job_id', jobIds).in('customer_id', customerIds).order('created_at', { ascending: false }).limit(5);
    if (error) return jsonError(error.message, 500);
    routedJob = data ?? [];
  }

  let quotations: Row[] = [];
  if (quotationIds.length || jobIds.length) {
    let query = supabase.from('quotations').select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,customer_visibility_notes,pdf_storage_path,public_ref,created_at').eq('visible_to_customer', true).order('created_at', { ascending: false }).limit(20);
    if (quotationIds.length) query = query.in('quotation_id', quotationIds); else query = query.in('job_id', jobIds);
    const { data, error } = await query;
    if (error) return jsonError(error.message, 500);
    quotations = await withSignedPdf(data ?? []);
  }

  const allQuotationIds = unique(quotations.map((row) => row.quotation_id as string | undefined));
  let quotationVersions: Row[] = [];
  if (allQuotationIds.length) {
    const { data, error } = await supabase.from('quotation_versions').select('version_id,quotation_id,version,line_items,total,warranty_years,warranty_terms,created_at').in('quotation_id', allQuotationIds).order('created_at', { ascending: false }).limit(30);
    if (error) return jsonError(error.message, 500);
    quotationVersions = data ?? [];
  }

  let invoices: Row[] = [];
  if (jobIds.length) {
    const { data, error } = await supabase.from('invoices').select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,customer_visibility_notes,pdf_storage_path,payment_url,public_ref,created_at').in('job_id', jobIds).eq('visible_to_customer', true).order('created_at', { ascending: false }).limit(20);
    if (error) return jsonError(error.message, 500);
    invoices = await withSignedPdf(data ?? []);
  }

  const invoiceIds = unique(invoices.map((row) => row.invoice_id as string | undefined));
  let payments: Row[] = [];
  if (invoiceIds.length) {
    const { data, error } = await supabase.from('payments').select('payment_id,invoice_id,amount,status,fee,reconciled_at,payment_url,visible_to_customer,created_at').in('invoice_id', invoiceIds).eq('visible_to_customer', true).order('created_at', { ascending: false }).limit(20);
    if (error) return jsonError(error.message, 500);
    payments = data ?? [];
  }

  let warrantyPdfs: Row[] = [];
  if (relatedWarranty?.warranty_id) {
    const { data, error } = await supabase.from('warranty_pdf_documents').select('warranty_pdf_id,warranty_id,customer_id,job_id,warranty_version,storage_bucket,storage_path,file_name,mime_type,file_size_bytes,public_ref,generation_status,visible_to_customer,customer_visible_at,generated_at,created_at').eq('warranty_id', relatedWarranty.warranty_id).eq('visible_to_customer', true).in('generation_status', ['generated', 'uploaded']).order('warranty_version', { ascending: false }).limit(20);
    if (error) return jsonError(error.message, 500);
    warrantyPdfs = await withSignedWarrantyPdf(data ?? []);
  }

  const customer_timeline = buildCustomerTimeline({ serviceRequest, relatedWarranty, routedJobs: routedJob, quotations, invoices, payments, warrantyPdfs });

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_warranty_claim_detail_read',
    objectType: 'service_request',
    objectId: serviceRequestId,
    after: { customers: customers.length, timeline: customer_timeline.length, closure_status: serviceRequest.warranty_claim_closure_status, satisfaction_status: serviceRequest.warranty_claim_customer_satisfaction_status, quotations: quotations.length, invoices: invoices.length, warranty_pdfs: warrantyPdfs.length },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, customers, service_request: serviceRequest, related_warranty: relatedWarranty, routed_jobs: routedJob, quotations, quotation_versions: quotationVersions, invoices, payments, warranty_pdfs: warrantyPdfs, customer_timeline });
}
