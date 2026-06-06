export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, requireActorApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;

type Row = Record<string, unknown>;

function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? data.filter((item): item is Row => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
}

function idOf(row: Row, key: string) {
  const value = row[key];
  return typeof value === 'string' && value ? value : null;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function clampLimit(value: string | null) {
  const parsed = Number(cleanText(value, 8) ?? 20);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.floor(parsed), 1), 50);
}

async function safeSelect(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  select: string,
  limit: number,
  order = 'created_at'
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order(order, { ascending: false })
    .limit(limit);

  return { rows: asRows(data), error: error?.message ?? null };
}

function dedupeBy(rows: Row[], key: string) {
  const seen = new Set<string>();
  const output: Row[] = [];

  for (const row of rows) {
    const id = idOf(row, key);
    const fallback = JSON.stringify(row);
    const marker = id ?? fallback;
    if (seen.has(marker)) continue;
    seen.add(marker);
    output.push(row);
  }

  return output;
}

function linkedByCustomer(rows: Row[], customerId: string) {
  return rows.filter((row) => row.customer_id === customerId);
}

function linkedByRequest(rows: Row[], requestIds: Set<string>) {
  return rows.filter((row) => typeof row.service_request_id === 'string' && requestIds.has(row.service_request_id));
}

function linkedByJob(rows: Row[], jobIds: Set<string>) {
  return rows.filter((row) => typeof row.job_id === 'string' && jobIds.has(row.job_id));
}

function linkedInvoices(rows: Row[], jobIds: Set<string>) {
  return rows.filter((row) => typeof row.job_id === 'string' && jobIds.has(row.job_id));
}

function linkedPayments(rows: Row[], invoiceIds: Set<string>) {
  return rows.filter((row) => typeof row.invoice_id === 'string' && invoiceIds.has(row.invoice_id));
}

function buildCustomerChains(payload: Record<string, Row[]>) {
  const customers = payload.customers ?? [];
  const serviceRequests = payload.service_requests ?? [];
  const jobs = payload.jobs ?? [];
  const quotations = payload.quotations ?? [];
  const invoices = payload.invoices ?? [];
  const payments = payload.payments ?? [];
  const warranties = payload.warranties ?? [];
  const statusLogs = payload.status_logs ?? [];

  return customers.map((customer) => {
    const customerId = idOf(customer, 'customer_id');
    const customerRequests = customerId ? linkedByCustomer(serviceRequests, customerId) : [];
    const requestIds = new Set(unique(customerRequests.map((row) => idOf(row, 'service_request_id'))));

    const directJobs = customerId ? linkedByCustomer(jobs, customerId) : [];
    const requestJobs = linkedByRequest(jobs, requestIds);
    const customerJobs = dedupeBy([...directJobs, ...requestJobs], 'job_id');
    const jobIds = new Set(unique(customerJobs.map((row) => idOf(row, 'job_id'))));

    const customerQuotations = dedupeBy([
      ...linkedByJob(quotations, jobIds),
      ...linkedByRequest(quotations, requestIds)
    ], 'quotation_id');

    const customerInvoices = linkedInvoices(invoices, jobIds);
    const invoiceIds = new Set(unique(customerInvoices.map((row) => idOf(row, 'invoice_id'))));
    const customerPayments = linkedPayments(payments, invoiceIds);
    const customerWarranties = linkedByJob(warranties, jobIds);

    const objectIds = new Set<string>();
    customerRequests.forEach((row) => { const id = idOf(row, 'service_request_id'); if (id) objectIds.add(id); });
    customerJobs.forEach((row) => { const id = idOf(row, 'job_id'); if (id) objectIds.add(id); });
    customerQuotations.forEach((row) => { const id = idOf(row, 'quotation_id'); if (id) objectIds.add(id); });
    customerInvoices.forEach((row) => { const id = idOf(row, 'invoice_id'); if (id) objectIds.add(id); });
    customerPayments.forEach((row) => { const id = idOf(row, 'payment_id'); if (id) objectIds.add(id); });
    customerWarranties.forEach((row) => { const id = idOf(row, 'warranty_id'); if (id) objectIds.add(id); });

    const customerStatusLogs = statusLogs.filter((log) => typeof log.object_id === 'string' && objectIds.has(log.object_id));

    return {
      customer,
      service_requests: customerRequests,
      jobs: customerJobs,
      quotations: customerQuotations,
      invoices: customerInvoices,
      payments: customerPayments,
      warranties: customerWarranties,
      status_logs: customerStatusLogs.slice(0, 8),
      linkage: {
        customer_to_service_requests: customerRequests.length,
        service_requests_to_jobs: customerJobs.length,
        jobs_or_requests_to_quotations: customerQuotations.length,
        jobs_to_invoices: customerInvoices.length,
        invoices_to_payments: customerPayments.length,
        jobs_to_warranties: customerWarranties.length
      }
    };
  });
}

function countRows(payload: Record<string, Row[]>) {
  return Object.fromEntries(Object.entries(payload).map(([key, rows]) => [key, rows.length]));
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const limit = clampLimit(request.nextUrl.searchParams.get('limit'));
  const supabase = createAdminClient();
  const errors: string[] = [];
  const payload: Record<string, Row[]> = {};

  const customers = await safeSelect(
    supabase,
    'customers',
    'customer_id,profile_id,name,phone,email,account_status,binding_status,source,created_at,updated_at',
    limit
  );
  payload.customers = customers.rows;
  if (customers.error) errors.push(`customers: ${customers.error}`);

  const customerIds = unique(payload.customers.map((row) => idOf(row, 'customer_id')));

  if (customerIds.length) {
    const serviceRequests = await supabase
      .from('service_requests')
      .select('service_request_id,customer_id,contact_name,phone,whatsapp,email,address_text,leak_location,issue_type,issue_description,status,binding_status,request_origin,customer_portal_request_type,created_at,updated_at')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
      .limit(limit * 3);
    payload.service_requests = asRows(serviceRequests.data);
    if (serviceRequests.error) errors.push(`service_requests: ${serviceRequests.error.message}`);
  } else {
    payload.service_requests = [];
  }

  const serviceRequestIds = unique(payload.service_requests.map((row) => idOf(row, 'service_request_id')));

  const jobRows: Row[] = [];
  if (customerIds.length) {
    const byCustomer = await supabase
      .from('jobs')
      .select('job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
      .limit(limit * 3);
    jobRows.push(...asRows(byCustomer.data));
    if (byCustomer.error) errors.push(`jobs_by_customer: ${byCustomer.error.message}`);
  }

  if (serviceRequestIds.length) {
    const byRequest = await supabase
      .from('jobs')
      .select('job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at')
      .in('service_request_id', serviceRequestIds)
      .order('created_at', { ascending: false })
      .limit(limit * 3);
    jobRows.push(...asRows(byRequest.data));
    if (byRequest.error) errors.push(`jobs_by_request: ${byRequest.error.message}`);
  }

  payload.jobs = dedupeBy(jobRows, 'job_id');
  const jobIds = unique(payload.jobs.map((row) => idOf(row, 'job_id')));

  const quotationRows: Row[] = [];
  if (jobIds.length) {
    const byJob = await supabase
      .from('quotations')
      .select('quotation_id,job_id,service_request_id,current_version,total,approval_status,created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(limit * 3);
    quotationRows.push(...asRows(byJob.data));
    if (byJob.error) errors.push(`quotations_by_job: ${byJob.error.message}`);
  }

  if (serviceRequestIds.length) {
    const byRequest = await supabase
      .from('quotations')
      .select('quotation_id,job_id,service_request_id,current_version,total,approval_status,created_at')
      .in('service_request_id', serviceRequestIds)
      .order('created_at', { ascending: false })
      .limit(limit * 3);
    quotationRows.push(...asRows(byRequest.data));
    if (byRequest.error) errors.push(`quotations_by_request: ${byRequest.error.message}`);
  }

  payload.quotations = dedupeBy(quotationRows, 'quotation_id');

  if (jobIds.length) {
    const invoices = await supabase
      .from('invoices')
      .select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,public_ref,created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(limit * 3);
    payload.invoices = asRows(invoices.data);
    if (invoices.error) errors.push(`invoices: ${invoices.error.message}`);
  } else {
    payload.invoices = [];
  }

  const invoiceIds = unique(payload.invoices.map((row) => idOf(row, 'invoice_id')));

  if (invoiceIds.length) {
    const payments = await supabase
      .from('payments')
      .select('payment_id,invoice_id,amount,status,fee,reconciled_at,visible_to_customer,created_at')
      .in('invoice_id', invoiceIds)
      .order('created_at', { ascending: false })
      .limit(limit * 3);
    payload.payments = asRows(payments.data);
    if (payments.error) errors.push(`payments: ${payments.error.message}`);
  } else {
    payload.payments = [];
  }

  if (jobIds.length) {
    const warranties = await supabase
      .from('warranties')
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,visible_to_customer,public_ref,created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(limit * 3);
    payload.warranties = asRows(warranties.data);
    if (warranties.error) errors.push(`warranties: ${warranties.error.message}`);
  } else {
    payload.warranties = [];
  }

  const objectIds = unique([
    ...serviceRequestIds,
    ...jobIds,
    ...unique(payload.quotations.map((row) => idOf(row, 'quotation_id'))),
    ...invoiceIds,
    ...unique(payload.payments.map((row) => idOf(row, 'payment_id'))),
    ...unique(payload.warranties.map((row) => idOf(row, 'warranty_id')))
  ]);

  if (objectIds.length) {
    const logs = await supabase
      .from('status_transition_logs')
      .select('transition_id,machine,object_id,from_status,to_status,reason,actor_role,created_at')
      .in('object_id', objectIds)
      .order('created_at', { ascending: false })
      .limit(limit * 5);
    payload.status_logs = asRows(logs.data);
    if (logs.error) errors.push(`status_logs: ${logs.error.message}`);
  } else {
    payload.status_logs = [];
  }

  const chains = buildCustomerChains(payload);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_service_linkage_read',
    objectType: 'customer_service_linkage',
    after: {
      limit,
      degraded: errors.length > 0,
      counts: countRows(payload),
      customer_chain_count: chains.length
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({
    ok: errors.length === 0,
    degraded: errors.length > 0,
    errors,
    counts: countRows(payload),
    chains
  }, { status: errors.length ? 207 : 200 });
}