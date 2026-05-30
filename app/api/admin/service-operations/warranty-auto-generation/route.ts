export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance'] as const;
type ApiPayload = Record<string, unknown>;
type JobRow = Record<string, unknown>;
type QuotationRow = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addYears(date: Date, years: number) {
  const wholeYears = Math.floor(years);
  const months = Math.round((years - wholeYears) * 12);
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + wholeYears);
  result.setMonth(result.getMonth() + months);
  return result;
}

function warrantyNo(jobId: string) {
  return `NFX-WTY-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${jobId.slice(0, 8).toUpperCase()}`;
}

async function loadJob(jobId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('job_id,service_request_id,customer_id,status,scheduled_at,notes,confirmed_warranty_years,confirmed_warranty_terms,repair_completed_at,warranty_generated_at,created_at,updated_at')
    .eq('job_id', jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Job not found.');
  return data as JobRow;
}

async function loadLatestQuotation(jobId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('quotations')
    .select('quotation_id,job_id,current_version,total,approval_status,warranty_years,warranty_terms,warranty_confirmed_at,created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as QuotationRow | null;
}

async function loadLatestInvoice(jobId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_id,invoice_no,job_id,customer_id,quotation_id,total,status,created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown> | null;
}

function resolveWarrantyYears(body: ApiPayload, job: JobRow, quotation: QuotationRow | null) {
  const overrideYears = cleanNumber(body.warranty_years, NaN);
  if (Number.isFinite(overrideYears) && overrideYears > 0) return overrideYears;
  const jobYears = cleanNumber(job.confirmed_warranty_years, NaN);
  if (Number.isFinite(jobYears) && jobYears > 0) return jobYears;
  const quoteYears = cleanNumber(quotation?.warranty_years, NaN);
  if (Number.isFinite(quoteYears) && quoteYears > 0) return quoteYears;
  return 1;
}

function resolveWarrantyTerms(body: ApiPayload, job: JobRow, quotation: QuotationRow | null) {
  return cleanText(body.warranty_terms, 1200)
    || (typeof job.confirmed_warranty_terms === 'string' ? job.confirmed_warranty_terms : '')
    || (typeof quotation?.warranty_terms === 'string' ? quotation.warranty_terms : '')
    || 'NANOFIX standard workmanship warranty. Warranty coverage follows the confirmed quotation/order scope.';
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;
  const jobId = cleanText(request.nextUrl.searchParams.get('job_id'), 120);
  if (!isUuid(jobId)) return jsonError('Valid job_id is required.', 400);
  try {
    const [job, quotation, invoice] = await Promise.all([loadJob(jobId), loadLatestQuotation(jobId), loadLatestInvoice(jobId)]);
    const supabase = createAdminClient();
    const { data: warranties, error } = await supabase
      .from('warranties')
      .select('warranty_id,warranty_no,job_id,customer_id,quotation_id,invoice_id,status,coverage,warranty_years,warranty_terms,starts_at,ends_at,generated_from,visible_to_customer,pdf_storage_path,created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, job, quotation, invoice, warranties: warranties ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  if (action !== 'generate_warranty_after_repair_completion') return jsonError('Unsupported warranty generation action.', 400);
  const jobId = cleanText(body.job_id, 120);
  if (!isUuid(jobId)) return jsonError('Valid job_id is required.', 400);

  const supabase = createAdminClient();
  try {
    const job = await loadJob(jobId);
    const [quotation, invoice] = await Promise.all([loadLatestQuotation(jobId), loadLatestInvoice(jobId)]);
    const customerId = cleanText(body.customer_id, 120) || (typeof job.customer_id === 'string' ? job.customer_id : '') || (typeof invoice?.customer_id === 'string' ? invoice.customer_id : '');
    if (!isUuid(customerId)) return jsonError('Job must be linked to a valid customer before generating warranty.', 400);

    const repairCompletedAt = cleanText(body.repair_completed_at, 80) || (typeof job.repair_completed_at === 'string' ? job.repair_completed_at : '') || new Date().toISOString();
    const start = new Date(repairCompletedAt);
    if (Number.isNaN(start.getTime())) return jsonError('repair_completed_at is invalid.', 400);
    const years = resolveWarrantyYears(body, job, quotation);
    const terms = resolveWarrantyTerms(body, job, quotation);
    const ends = addYears(start, years);
    const coverage = cleanText(body.coverage, 1200) || terms;

    const { data: beforeJob } = await supabase
      .from('jobs')
      .select('job_id,status,confirmed_warranty_years,confirmed_warranty_terms,repair_completed_at,warranty_generated_at,warranty_generated_by')
      .eq('job_id', jobId)
      .maybeSingle();

    const { data: updatedJob, error: jobError } = await supabase
      .from('jobs')
      .update({
        status: cleanText(body.job_status, 80) || 'completed',
        confirmed_warranty_years: years,
        confirmed_warranty_terms: terms,
        repair_completed_at: start.toISOString(),
        warranty_generated_at: new Date().toISOString(),
        warranty_generated_by: auth.actor.profileId
      })
      .eq('job_id', jobId)
      .select('job_id,service_request_id,customer_id,status,confirmed_warranty_years,confirmed_warranty_terms,repair_completed_at,warranty_generated_at,warranty_generated_by,created_at,updated_at')
      .single();
    if (jobError) throw new Error(jobError.message);

    const warrantyPayload = {
      job_id: jobId,
      customer_id: customerId,
      quotation_id: typeof quotation?.quotation_id === 'string' ? quotation.quotation_id : null,
      invoice_id: typeof invoice?.invoice_id === 'string' ? invoice.invoice_id : null,
      warranty_years: years,
      warranty_no: warrantyNo(jobId),
      warranty_terms: terms,
      status: 'active',
      coverage,
      starts_at: start.toISOString(),
      ends_at: ends.toISOString(),
      generated_from: 'repair_completion',
      visible_to_customer: body.visible_to_customer !== false,
      customer_visible_at: body.visible_to_customer === false ? null : new Date().toISOString(),
      customer_visible_by: body.visible_to_customer === false ? null : auth.actor.profileId,
      metadata_json: { source: 'repair_completion', warranty_years_source: body.warranty_years ? 'admin_override' : job.confirmed_warranty_years ? 'job' : quotation?.warranty_years ? 'quotation' : 'default', quotation_id: quotation?.quotation_id ?? null, invoice_id: invoice?.invoice_id ?? null }
    };

    const { data: warranty, error: warrantyError } = await supabase
      .from('warranties')
      .upsert(warrantyPayload, { onConflict: 'job_id' })
      .select('warranty_id,warranty_no,job_id,customer_id,quotation_id,invoice_id,status,coverage,warranty_years,warranty_terms,starts_at,ends_at,generated_from,visible_to_customer,customer_visible_at,customer_visible_by,created_at')
      .single();
    if (warrantyError) throw new Error(warrantyError.message);

    const { data: task, error: taskError } = await supabase.from('unified_tasks').insert({
      source_module: 'service_operations',
      source_table: 'warranties',
      source_id: warranty.warranty_id,
      title: 'Warranty generated after repair completion',
      description: `Warranty ${warranty.warranty_no ?? warranty.warranty_id} generated for job ${jobId} with ${years} year(s).`,
      priority: 'P2',
      assignee_role: 'operations_admin',
      status: 'open',
      metadata_json: { job_id: jobId, customer_id: customerId, warranty_years: years, quotation_id: quotation?.quotation_id ?? null, invoice_id: invoice?.invoice_id ?? null }
    }).select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at').single();
    if (taskError) throw new Error(taskError.message);
    await supabase.from('task_events').insert({ task_id: task.task_id, action: 'warranty_generated_after_repair_completion', after_json: { warranty, job: updatedJob } }).throwOnError();
    await supabase.from('internal_inbox_messages').insert({
      recipient_role: 'operations_admin',
      subject: 'Warranty generated after repair completion',
      body: `Warranty generated for completed job ${jobId}. Customer can view it if visible_to_customer is true.`,
      category: 'warranty_generation',
      priority: 'P2',
      related_object_type: 'warranty',
      related_object_id: warranty.warranty_id,
      task_id: task.task_id
    }).throwOnError();
    await supabase.from('notification_outbox').insert({
      channel: 'internal',
      recipient_customer_id: customerId,
      subject: 'NANOFIX warranty generated',
      body: 'Your NANOFIX warranty document has been generated after repair completion.',
      payload_json: { warranty_id: warranty.warranty_id, job_id: jobId, warranty_years: years, source: 'repair_completion' },
      delivery_status: 'queued',
      related_object_type: 'warranty',
      related_object_id: warranty.warranty_id
    }).throwOnError();

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_warranty_auto_generate_after_repair_completion', objectType: 'warranty', objectId: warranty.warranty_id, before: { job: beforeJob }, after: { warranty, job: updatedJob, quotation, invoice, task }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, warranty, job: updatedJob, quotation, invoice, task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_warranty_auto_generate_failed', objectType: 'job', objectId: jobId, after: { error: message }, ip: getClientIp(request) }).catch(() => undefined);
    return jsonError(message, 500);
  }
}
