export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_ROLES = ['customer'] as const;
type Row = Record<string, unknown>;
type TimelineEvent = {
  event_id: string;
  event_type: string;
  title: string;
  status: string;
  amount: number | null;
  object_type: string;
  object_id: string | null;
  source: string;
  created_at: string | null;
};

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? data as Row[] : [];
}

function idOf(row: Row | null | undefined, key: string) {
  const value = row?.[key];
  return typeof value === 'string' && value ? value : null;
}

function textOf(row: Row | null | undefined, key: string, fallback = '') {
  const value = row?.[key];
  return typeof value === 'string' && value ? value : fallback;
}

function numberOf(row: Row | null | undefined, key: string) {
  const value = row?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function eventTime(row: Row) {
  return toIso(row.created_at) ?? toIso(row.updated_at) ?? null;
}

function event(event_type: string, title: string, status: string, amount: number | null, object_type: string, object_id: string | null, source: string, created_at: string | null): TimelineEvent {
  return {
    event_id: `${event_type}:${object_type}:${object_id ?? 'unknown'}:${created_at ?? 'na'}`,
    event_type,
    title,
    status,
    amount,
    object_type,
    object_id,
    source,
    created_at
  };
}

function isPaidStatus(status: string) {
  return ['paid', 'succeeded', 'success', 'completed', 'reconciled', 'settled'].includes(status.toLowerCase());
}

function isOpenInvoiceStatus(status: string) {
  return !isPaidStatus(status) && !['void', 'voided', 'cancelled', 'canceled', 'refunded', 'written_off', 'reversed'].includes(status.toLowerCase());
}

function labelAuditAction(action: string) {
  if (action === 'customer_portal_document_download_link_create') return 'Document download link generated';
  if (action === 'customer_portal_payment_link_open') return 'Payment link opened';
  if (action === 'customer_portal_quotation_response_create') return 'Quotation response submitted';
  if (action === 'customer_portal_records_read') return 'Customer records viewed';
  return action.replaceAll('_', ' ');
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
  return { customers: asRows(data), customerIds: unique(asRows(data).map((row) => idOf(row, 'customer_id'))) };
}

async function loadLinkedObjects(customerIds: string[], limit: number) {
  const supabase = createAdminClient();
  if (!customerIds.length) {
    return { serviceRequests: [], jobs: [], quotations: [], invoices: [], payments: [], warranties: [] };
  }

  const serviceRequestResult = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,status,leak_location,created_at,updated_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (serviceRequestResult.error) throw new Error(serviceRequestResult.error.message);

  const serviceRequests = asRows(serviceRequestResult.data);
  const serviceRequestIds = unique(serviceRequests.map((row) => idOf(row, 'service_request_id')));

  const directJobs = await supabase
    .from('jobs')
    .select('job_id,service_request_id,customer_id,status,scheduled_at,created_at,updated_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (directJobs.error) throw new Error(directJobs.error.message);

  let requestJobs: Row[] = [];
  if (serviceRequestIds.length) {
    const byRequest = await supabase
      .from('jobs')
      .select('job_id,service_request_id,customer_id,status,scheduled_at,created_at,updated_at')
      .in('service_request_id', serviceRequestIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (byRequest.error) throw new Error(byRequest.error.message);
    requestJobs = asRows(byRequest.data);
  }

  const seenJobs = new Set<string>();
  const jobs = [...asRows(directJobs.data), ...requestJobs].filter((row) => {
    const jobId = idOf(row, 'job_id') ?? JSON.stringify(row);
    if (seenJobs.has(jobId)) return false;
    seenJobs.add(jobId);
    return true;
  }).slice(0, limit);
  const jobIds = unique(jobs.map((row) => idOf(row, 'job_id')));

  const quotationRows: Row[] = [];
  if (jobIds.length) {
    const byJob = await supabase
      .from('quotations')
      .select('quotation_id,job_id,service_request_id,current_version,total,approval_status,visible_to_customer,public_ref,created_at,updated_at')
      .in('job_id', jobIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (byJob.error) throw new Error(byJob.error.message);
    quotationRows.push(...asRows(byJob.data));
  }

  if (serviceRequestIds.length) {
    const byRequest = await supabase
      .from('quotations')
      .select('quotation_id,job_id,service_request_id,current_version,total,approval_status,visible_to_customer,public_ref,created_at,updated_at')
      .in('service_request_id', serviceRequestIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (byRequest.error) throw new Error(byRequest.error.message);
    quotationRows.push(...asRows(byRequest.data));
  }

  const seenQuotations = new Set<string>();
  const quotations = quotationRows.filter((row) => {
    const id = idOf(row, 'quotation_id') ?? JSON.stringify(row);
    if (seenQuotations.has(id)) return false;
    seenQuotations.add(id);
    return true;
  }).slice(0, limit);

  let invoices: Row[] = [];
  if (jobIds.length) {
    const invoiceResult = await supabase
      .from('invoices')
      .select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,payment_url,public_ref,created_at,updated_at')
      .in('job_id', jobIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (invoiceResult.error) throw new Error(invoiceResult.error.message);
    invoices = asRows(invoiceResult.data);
  }

  const invoiceIds = unique(invoices.map((row) => idOf(row, 'invoice_id')));
  let payments: Row[] = [];
  if (invoiceIds.length) {
    const paymentResult = await supabase
      .from('payments')
      .select('payment_id,invoice_id,amount,status,fee,reconciled_at,visible_to_customer,payment_url,created_at,updated_at')
      .in('invoice_id', invoiceIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (paymentResult.error) throw new Error(paymentResult.error.message);
    payments = asRows(paymentResult.data);
  }

  let warranties: Row[] = [];
  if (jobIds.length) {
    const warrantyResult = await supabase
      .from('warranties')
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,visible_to_customer,public_ref,created_at,updated_at')
      .in('job_id', jobIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (warrantyResult.error) throw new Error(warrantyResult.error.message);
    warranties = asRows(warrantyResult.data);
  }

  return { serviceRequests, jobs, quotations, invoices, payments, warranties };
}

async function loadCustomerAuditEvents(profileId: string, limit: number) {
  const supabase = createAdminClient();
  const result = await supabase
    .from('audit_logs')
    .select('action,object_type,object_id,role,after_json,created_at')
    .eq('actor_id', profileId)
    .in('action', [
      'customer_portal_document_download_link_create',
      'customer_portal_payment_link_open',
      'customer_portal_quotation_response_create'
    ])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (result.error) return [];
  return asRows(result.data);
}

function buildTimeline(rows: Awaited<ReturnType<typeof loadLinkedObjects>>, auditRows: Row[], limit: number) {
  const events: TimelineEvent[] = [];

  for (const row of rows.serviceRequests) {
    events.push(event('service_request_status', `Repair request ${textOf(row, 'leak_location', idOf(row, 'service_request_id') ?? '')}`.trim(), textOf(row, 'status', 'submitted'), null, 'service_request', idOf(row, 'service_request_id'), 'service_requests', eventTime(row)));
  }

  for (const row of rows.jobs) {
    events.push(event('job_status', 'Job / site work status', textOf(row, 'status', 'scheduled'), null, 'job', idOf(row, 'job_id'), 'jobs', eventTime(row)));
  }

  for (const row of rows.quotations) {
    events.push(event('quotation_status', `Quotation ${textOf(row, 'public_ref', idOf(row, 'quotation_id') ?? '')}`.trim(), textOf(row, 'approval_status', 'pending_customer'), numberOf(row, 'total'), 'quotation', idOf(row, 'quotation_id'), 'quotations', eventTime(row)));
  }

  for (const row of rows.invoices) {
    events.push(event('invoice_status', `Invoice ${textOf(row, 'invoice_no', textOf(row, 'public_ref', idOf(row, 'invoice_id') ?? ''))}`.trim(), textOf(row, 'status', 'open'), numberOf(row, 'total'), 'invoice', idOf(row, 'invoice_id'), 'invoices', eventTime(row)));
  }

  for (const row of rows.payments) {
    events.push(event('payment_status', 'Payment status updated', textOf(row, 'status', 'pending'), numberOf(row, 'amount'), 'payment', idOf(row, 'payment_id'), 'payments', eventTime(row)));
  }

  for (const row of rows.warranties) {
    events.push(event('warranty_status', `Warranty ${textOf(row, 'public_ref', idOf(row, 'warranty_id') ?? '')}`.trim(), textOf(row, 'status', 'issued'), null, 'warranty', idOf(row, 'warranty_id'), 'warranties', eventTime(row)));
  }

  for (const row of auditRows) {
    events.push(event('customer_activity', labelAuditAction(textOf(row, 'action', 'customer_portal_activity')), textOf(row, 'action', 'activity'), null, textOf(row, 'object_type', 'audit'), idOf(row, 'object_id'), 'audit_logs', eventTime(row)));
  }

  return events
    .filter((row) => Boolean(row.created_at))
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, limit);
}

function buildPaymentStatusSummary(invoices: Row[], payments: Row[]) {
  const invoiceTotal = invoices.reduce((sum, row) => sum + numberOf(row, 'total'), 0);
  const paidAmount = payments.filter((row) => isPaidStatus(textOf(row, 'status', ''))).reduce((sum, row) => sum + numberOf(row, 'amount'), 0);
  const openInvoices = invoices.filter((row) => isOpenInvoiceStatus(textOf(row, 'status', 'open'))).length;
  const paidInvoices = invoices.filter((row) => isPaidStatus(textOf(row, 'status', ''))).length;
  const paymentLinksOpened = payments.filter((row) => Boolean(idOf(row, 'payment_url'))).length;

  return {
    invoice_count: invoices.length,
    open_invoice_count: openInvoices,
    paid_invoice_count: paidInvoices,
    payment_record_count: payments.length,
    payment_links_available: paymentLinksOpened,
    invoice_total: Number(invoiceTotal.toFixed(2)),
    paid_amount: Number(paidAmount.toFixed(2)),
    outstanding_amount: Number(Math.max(invoiceTotal - paidAmount, 0).toFixed(2))
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...ALLOWED_ROLES]);
  if (!auth.ok) return auth.response;

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 30), 1), 80);
  const { customers, customerIds } = await customerIdsForProfile(auth.actor.profileId);
  if (!customerIds.length) return jsonError('No active customer profile is linked to this account.', 403);

  const linkedObjects = await loadLinkedObjects(customerIds, limit);
  const auditRows = await loadCustomerAuditEvents(auth.actor.profileId, limit);
  const payment_status_summary = buildPaymentStatusSummary(linkedObjects.invoices, linkedObjects.payments);
  const activity_timeline = buildTimeline(linkedObjects, auditRows, limit);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_activity_timeline_read',
    objectType: 'customer_portal_activity_timeline',
    after: {
      customers: customers.length,
      payment_status_summary,
      activity_count: activity_timeline.length
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, customers, payment_status_summary, activity_timeline });
}
