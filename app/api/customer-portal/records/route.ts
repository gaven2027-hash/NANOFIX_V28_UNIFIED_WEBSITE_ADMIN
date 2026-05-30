export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const ALLOWED_ROLES = ['customer', 'super_admin', 'operations_admin', 'support'] as const;

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

async function loadCustomerRecords(customerIds: string[], limit: number) {
  const supabase = createAdminClient();
  if (!customerIds.length) return { service_requests: [], warranty_claims: [], jobs: [], invoices: [], payments: [], warranties: [] };

  const { data: serviceRequests, error: requestError } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,whatsapp,email,address_text,postal_code,leak_location,issue_description,property_type,preferred_time_text,status,binding_status,request_origin,customer_portal_request_type,related_warranty_id,warranty_claim_decision,warranty_claim_next_action,warranty_claim_decision_notes,warranty_claim_reviewed_at,warranty_claim_routing_status,warranty_claim_routed_job_id,warranty_claim_routed_quotation_id,warranty_claim_routed_at,created_at,updated_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (requestError) throw new Error(requestError.message);

  const warrantyClaims = (serviceRequests ?? []).filter((row) => row.request_origin === 'customer_portal' && row.customer_portal_request_type === 'warranty_repair');
  const serviceRequestIds = unique((serviceRequests ?? []).map((row) => row.service_request_id as string));

  const directJobs = await supabase
    .from('jobs')
    .select('job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (directJobs.error) throw new Error(directJobs.error.message);

  let requestJobs: typeof directJobs.data = [];
  if (serviceRequestIds.length) {
    const byRequest = await supabase
      .from('jobs')
      .select('job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at')
      .in('service_request_id', serviceRequestIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (byRequest.error) throw new Error(byRequest.error.message);
    requestJobs = byRequest.data ?? [];
  }

  const jobs = [...(directJobs.data ?? []), ...(requestJobs ?? [])].filter((job, index, list) => list.findIndex((item) => item.job_id === job.job_id) === index).slice(0, limit);
  const jobIds = unique(jobs.map((row) => row.job_id as string));

  let invoices: unknown[] = [];
  if (jobIds.length) {
    const invoiceResult = await supabase
      .from('invoices')
      .select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,pdf_storage_path,payment_url,public_ref,created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (invoiceResult.error) throw new Error(invoiceResult.error.message);
    invoices = invoiceResult.data ?? [];
  }

  const invoiceIds = unique((invoices as Array<{ invoice_id?: string }>).map((row) => row.invoice_id));
  let payments: unknown[] = [];
  if (invoiceIds.length) {
    const paymentResult = await supabase
      .from('payments')
      .select('payment_id,invoice_id,amount,status,fee,reconciled_at,visible_to_customer,payment_url,created_at')
      .in('invoice_id', invoiceIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (paymentResult.error) throw new Error(paymentResult.error.message);
    payments = paymentResult.data ?? [];
  }

  let warranties: unknown[] = [];
  if (jobIds.length) {
    const warrantyResult = await supabase
      .from('warranties')
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,pdf_storage_path,visible_to_customer,public_ref,created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (warrantyResult.error) throw new Error(warrantyResult.error.message);
    warranties = warrantyResult.data ?? [];
  }

  return { service_requests: serviceRequests ?? [], warranty_claims: warrantyClaims, jobs, invoices, payments, warranties };
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...ALLOWED_ROLES]);
  if (!auth.ok) return auth.response;

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 20), 1), 50);
  const { customers, customerIds } = await customerIdsForProfile(auth.actor.profileId);

  if (auth.role !== 'customer' && !customerIds.length) {
    return jsonError('Internal preview requires an actor profile linked to customer records.', 400);
  }

  const records = await loadCustomerRecords(customerIds, limit);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_records_read',
    objectType: 'customer_portal_records',
    after: {
      customers: customers.length,
      service_requests: records.service_requests.length,
      warranty_claims: records.warranty_claims.length,
      jobs: records.jobs.length,
      invoices: records.invoices.length,
      payments: records.payments.length,
      warranties: records.warranties.length
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, customers, ...records });
}
