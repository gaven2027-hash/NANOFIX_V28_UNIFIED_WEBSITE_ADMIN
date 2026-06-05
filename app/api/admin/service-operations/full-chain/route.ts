export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, requireActorApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer'] as const;

type Row = Record<string, unknown>;

type ListResult = {
  key: string;
  rows: Row[];
  error: string | null;
};

function clampLimit(value: string | null) {
  const parsed = Number(value ?? 20);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.floor(parsed), 1), 50);
}

function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? data.filter((item): item is Row => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
}

function idOf(row: Row, key: string) {
  const value = row[key];
  return typeof value === 'string' && value ? value : null;
}

function equalsId(a: unknown, b: unknown) {
  return typeof a === 'string' && typeof b === 'string' && a === b;
}

function recent<T extends Row>(rows: T[], limit = 8) {
  return rows.slice(0, limit);
}

async function safeList(
  supabase: ReturnType<typeof createAdminClient>,
  key: string,
  table: string,
  select: string,
  limit: number,
  order = 'created_at'
): Promise<ListResult> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order(order, { ascending: false })
    .limit(limit);

  return {
    key,
    rows: asRows(data),
    error: error?.message ?? null
  };
}

function buildChains(payload: Record<string, Row[]>) {
  const serviceRequests = payload.service_requests ?? [];
  const jobs = payload.jobs ?? [];
  const quotations = payload.quotations ?? [];
  const invoices = payload.invoices ?? [];
  const payments = payload.payments ?? [];
  const warranties = payload.warranties ?? [];
  const statusLogs = payload.status_logs ?? [];

  const chains = serviceRequests.map((request) => {
    const serviceRequestId = idOf(request, 'service_request_id');
    const linkedJobs = jobs.filter((job) => equalsId(job.service_request_id, serviceRequestId));
    const linkedJobIds = new Set(linkedJobs.map((job) => idOf(job, 'job_id')).filter(Boolean) as string[]);

    const linkedQuotations = quotations.filter((quotation) => linkedJobIds.has(String(quotation.job_id ?? '')));
    const linkedInvoices = invoices.filter((invoice) => linkedJobIds.has(String(invoice.job_id ?? '')));
    const linkedInvoiceIds = new Set(linkedInvoices.map((invoice) => idOf(invoice, 'invoice_id')).filter(Boolean) as string[]);

    const linkedPayments = payments.filter((payment) => linkedInvoiceIds.has(String(payment.invoice_id ?? '')));
    const linkedWarranties = warranties.filter((warranty) => linkedJobIds.has(String(warranty.job_id ?? '')));

    const objectIds = new Set<string>();
    if (serviceRequestId) objectIds.add(serviceRequestId);
    linkedJobs.forEach((row) => { const id = idOf(row, 'job_id'); if (id) objectIds.add(id); });
    linkedQuotations.forEach((row) => { const id = idOf(row, 'quotation_id'); if (id) objectIds.add(id); });
    linkedInvoices.forEach((row) => { const id = idOf(row, 'invoice_id'); if (id) objectIds.add(id); });
    linkedPayments.forEach((row) => { const id = idOf(row, 'payment_id'); if (id) objectIds.add(id); });
    linkedWarranties.forEach((row) => { const id = idOf(row, 'warranty_id'); if (id) objectIds.add(id); });

    const linkedStatusLogs = statusLogs.filter((log) => objectIds.has(String(log.object_id ?? '')));

    return {
      service_request: request,
      jobs: linkedJobs,
      quotations: linkedQuotations,
      invoices: linkedInvoices,
      payments: linkedPayments,
      warranties: linkedWarranties,
      status_logs: recent(linkedStatusLogs, 8),
      completeness: {
        has_service_request: Boolean(serviceRequestId),
        has_job: linkedJobs.length > 0,
        has_quotation: linkedQuotations.length > 0,
        has_invoice: linkedInvoices.length > 0,
        has_payment: linkedPayments.length > 0,
        has_warranty: linkedWarranties.length > 0
      }
    };
  });

  const linkedRequestIds = new Set(serviceRequests.map((row) => idOf(row, 'service_request_id')).filter(Boolean) as string[]);
  const orphanJobs = jobs.filter((job) => !linkedRequestIds.has(String(job.service_request_id ?? '')));

  return { chains, orphan_jobs: orphanJobs };
}

function countRows(payload: Record<string, Row[]>) {
  return Object.fromEntries(Object.entries(payload).map(([key, rows]) => [key, rows.length]));
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const limit = clampLimit(cleanText(request.nextUrl.searchParams.get('limit'), 20));
  const supabase = createAdminClient();

  const results = await Promise.all([
    safeList(supabase, 'service_requests', 'service_requests', 'service_request_id,customer_id,contact_name,phone,whatsapp,email,address_text,issue_type,leak_location,status,binding_status,request_origin,customer_portal_request_type,created_at,updated_at', limit),
    safeList(supabase, 'jobs', 'jobs', 'job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at', limit),
    safeList(supabase, 'quotations', 'quotations', 'quotation_id,job_id,current_version,total,approval_status,created_at', limit),
    safeList(supabase, 'invoices', 'invoices', 'invoice_id,invoice_no,job_id,total,status,created_at', limit),
    safeList(supabase, 'payments', 'payments', 'payment_id,invoice_id,amount,status,fee,reconciled_at,created_at', limit),
    safeList(supabase, 'warranties', 'warranties', 'warranty_id,job_id,status,coverage,starts_at,ends_at,created_at', limit),
    safeList(supabase, 'status_logs', 'status_transition_logs', 'transition_id,machine,object_id,from_status,to_status,reason,actor_role,created_at', Math.max(limit * 3, 30))
  ]);

  const payload: Record<string, Row[]> = {};
  const errors: string[] = [];

  for (const result of results) {
    payload[result.key] = result.rows;
    if (result.error) errors.push(`${result.key}: ${result.error}`);
  }

  const chain = buildChains(payload);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_full_chain_read',
    objectType: 'service_operations_full_chain',
    after: {
      limit,
      degraded: errors.length > 0,
      counts: countRows(payload),
      chain_count: chain.chains.length,
      orphan_job_count: chain.orphan_jobs.length
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  if (errors.length) {
    return NextResponse.json({
      ok: false,
      degraded: true,
      errors,
      counts: countRows(payload),
      ...chain
    }, { status: 207 });
  }

  return NextResponse.json({
    ok: true,
    degraded: false,
    errors: [],
    counts: countRows(payload),
    ...chain
  });
}