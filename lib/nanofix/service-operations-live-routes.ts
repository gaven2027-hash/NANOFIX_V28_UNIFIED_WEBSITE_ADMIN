import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type JsonRecord = Record<string, unknown>;
type Supabase = ReturnType<typeof createAdminClient>;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' } });
}
function str(value: unknown, max = 500) { return cleanText(value, max) ?? ''; }
function uuid(value: unknown) { const v = str(value, 80); return uuidRe.test(v) ? v : ''; }
function money(value: unknown) { const n = Number(value || 0); return Number.isFinite(n) && n >= 0 ? n : 0; }
async function body(request: NextRequest) { return await request.json().catch(() => ({})) as JsonRecord; }
async function audit(auth: Awaited<ReturnType<typeof requireActorApi>>, request: NextRequest, action: string, objectType: string, objectId: string | null, after: JsonRecord) {
  if (!auth.ok) return;
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action, objectType, objectId, after, ip: getClientIp(request) }).catch(() => undefined);
}
async function transition(supabase: Supabase, auth: Awaited<ReturnType<typeof requireActorApi>>, request: NextRequest, machine: string, objectType: string, objectId: string, fromStatus: string | null, toStatus: string, reason: string) {
  if (!auth.ok || !uuidRe.test(objectId)) return;
  try { await supabase.from('status_transition_logs').insert({ machine, object_type: objectType, object_id: objectId, from_status: fromStatus, to_status: toStatus, reason, actor_id: auth.actor.profileId, actor_role: auth.role, ip_address: getClientIp(request) }); } catch {}
}
function invoiceNo() { return `NF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }

export async function serviceRequestListGET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 80), 100);
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('service_requests').select('service_request_id,customer_id,lead_id,contact_name,phone,whatsapp,email,address_text,issue_type,leak_location,status,binding_status,request_origin,customer_portal_request_type,priority,created_at,updated_at').order('created_at', { ascending: false }).limit(limit);
  if (error) return jsonError(error.message, 500);
  await audit(auth, request, 'service_operations_service_request_list_read', 'service_requests', null, { count: data?.length ?? 0 });
  return json({ ok: true, rows: data ?? [], service_requests: data ?? [] });
}

export async function serviceRequestDetailGET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;
  const serviceRequestId = uuid(request.nextUrl.searchParams.get('service_request_id'));
  if (!serviceRequestId) return jsonError('Valid service_request_id is required.', 400);
  const supabase = createAdminClient();
  const { data: serviceRequest, error } = await supabase.from('service_requests').select('service_request_id,customer_id,lead_id,contact_name,phone,whatsapp,email,address_text,issue_type,leak_location,issue_description,status,binding_status,request_origin,customer_portal_request_type,priority,created_at,updated_at').eq('service_request_id', serviceRequestId).maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!serviceRequest) return jsonError('Service request not found.', 404);
  const [jobs, inspections, quotations] = await Promise.all([
    supabase.from('jobs').select('job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at').eq('service_request_id', serviceRequestId).order('created_at', { ascending: false }).limit(20),
    supabase.from('service_inspections').select('inspection_id,service_request_id,job_id,engineer_id,status,findings,diagnosis,recommended_action,scheduled_at,completed_at,created_at,updated_at').eq('service_request_id', serviceRequestId).order('created_at', { ascending: false }).limit(20),
    supabase.from('quotations').select('quotation_id,service_request_id,job_id,current_version,total,total_amount,status,approval_status,created_at,updated_at').eq('service_request_id', serviceRequestId).order('created_at', { ascending: false }).limit(20)
  ]);
  const detail = { ...serviceRequest, jobs: jobs.data ?? [], inspections: inspections.data ?? [], quotations: quotations.data ?? [] };
  await audit(auth, request, 'service_operations_service_request_detail_read', 'service_request', serviceRequestId, { found: true });
  return json({ ok: true, detail, service_request: detail });
}

export async function createJobFromRequestPOST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const input = await body(request);
  const serviceRequestId = uuid(input.service_request_id);
  if (!serviceRequestId) return jsonError('Valid service_request_id is required.', 400);
  const supabase = createAdminClient();
  const insert: JsonRecord = { service_request_id: serviceRequestId, status: 'assigned', notes: str(input.notes, 1000) || str(input.job_title, 300) || null, updated_at: new Date().toISOString() };
  const assignee = uuid(input.engineer_profile_id || input.engineer_id);
  if (assignee) insert.engineer_id = assignee;
  const { data, error } = await supabase.from('jobs').insert(insert).select('job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at').single();
  if (error) return jsonError(error.message, 500);
  await transition(supabase, auth, request, 'job', 'job', data.job_id, null, data.status ?? 'assigned', 'Created from service request');
  await audit(auth, request, 'service_operations_job_create_from_request', 'job', data.job_id, { service_request_id: serviceRequestId, job: data });
  return json({ ok: true, job: data, result: data }, 201);
}

export async function assignEngineerPOST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const input = await body(request);
  const jobId = uuid(input.job_id);
  if (!jobId) return jsonError('Valid job_id is required.', 400);
  const engineerId = uuid(input.engineer_profile_id || input.engineer_id);
  const supabase = createAdminClient();
  const { data: before } = await supabase.from('jobs').select('job_id,status,engineer_id').eq('job_id', jobId).maybeSingle();
  const patch: JsonRecord = { status: 'assigned', notes: str(input.notes, 1000) || null, updated_at: new Date().toISOString() };
  if (engineerId) patch.engineer_id = engineerId;
  const scheduledAt = str(input.inspection_date, 80);
  if (scheduledAt) patch.scheduled_at = scheduledAt;
  const { data, error } = await supabase.from('jobs').update(patch).eq('job_id', jobId).select('job_id,service_request_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at').single();
  if (error) return jsonError(error.message, 500);
  await transition(supabase, auth, request, 'job', 'job', data.job_id, before?.status ?? null, data.status ?? 'assigned', 'Engineer assignment');
  await audit(auth, request, 'service_operations_engineer_assign_live', 'job', data.job_id, { before, after: data });
  return json({ ok: true, assignment: { ...data, assignment_id: data.job_id }, result: { ...data, assignment_id: data.job_id } });
}

export async function inspectionResultPOST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const input = await body(request);
  const jobId = uuid(input.job_id);
  if (!jobId) return jsonError('Valid job_id is required.', 400);
  const supabase = createAdminClient();
  const { data: job } = await supabase.from('jobs').select('job_id,service_request_id,customer_id,engineer_id,status').eq('job_id', jobId).maybeSingle();
  const insert = { job_id: jobId, service_request_id: job?.service_request_id ?? null, customer_id: job?.customer_id ?? null, engineer_id: job?.engineer_id ?? null, status: 'completed', findings: str(input.summary, 2000), diagnosis: str(input.leak_cause, 2000), recommended_action: str(input.recommended_solution, 2000) || str(input.warranty_suggestion, 500), completed_at: new Date().toISOString(), created_by: auth.actor.profileId };
  const { data, error } = await supabase.from('service_inspections').insert(insert).select('inspection_id,service_request_id,job_id,customer_id,engineer_id,status,findings,diagnosis,recommended_action,completed_at,created_at,updated_at').single();
  if (error) return jsonError(error.message, 500);
  await transition(supabase, auth, request, 'inspection', 'inspection', data.inspection_id, null, data.status ?? 'completed', 'Inspection result submitted');
  await audit(auth, request, 'service_operations_inspection_result_submit_live', 'service_inspection', data.inspection_id, { inspection: data, urgency: str(input.urgency, 30), estimated_cost: str(input.estimated_cost, 60) });
  return json({ ok: true, inspection: data, result: data }, 201);
}

export async function quotationLivePOST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const input = await body(request);
  const serviceRequestId = uuid(input.service_request_id);
  const jobId = uuid(input.job_id);
  if (!serviceRequestId && !jobId) return jsonError('service_request_id or job_id is required.', 400);
  const amount = money(input.amount);
  const action = str(input.action, 40) || 'draft';
  const supabase = createAdminClient();
  const insert: JsonRecord = { service_request_id: serviceRequestId || null, job_id: jobId || null, version: 1, current_version: 1, total: amount, total_amount: amount, status: action === 'submit' || action === 'send' ? 'sent' : 'draft', approval_status: action, created_at: new Date().toISOString() };
  const { data, error } = await supabase.from('quotations').insert(insert).select('quotation_id,service_request_id,job_id,current_version,total,total_amount,status,approval_status,created_at,updated_at').single();
  if (error) return jsonError(error.message, 500);
  try { await supabase.from('quotation_versions').insert({ quotation_id: data.quotation_id, version: 1, total: amount, line_items: [{ description: str(input.quotation_title, 300) || 'Service quotation', scope_of_work: str(input.scope_of_work, 3000), warranty_years: str(input.accepted_warranty_years, 60), amount }], created_by: auth.actor.profileId }); } catch {}
  await transition(supabase, auth, request, 'quotation', 'quotation', data.quotation_id, null, data.status ?? 'draft', 'Quotation created from live workspace');
  await audit(auth, request, 'service_operations_quotation_live_save', 'quotation', data.quotation_id, { quotation: data, title: str(input.quotation_title, 300), accepted_warranty_years: str(input.accepted_warranty_years, 60) });
  return json({ ok: true, quotation: data, result: data }, 201);
}

export async function quotationAcceptanceBridgePOST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const input = await body(request);
  const quotationId = uuid(input.quotation_id);
  if (!quotationId) return jsonError('Valid quotation_id is required.', 400);
  const supabase = createAdminClient();
  const { data: quote, error: quoteError } = await supabase.from('quotations').select('quotation_id,job_id,customer_id,total,total_amount,status,approval_status,current_version').eq('quotation_id', quotationId).maybeSingle();
  if (quoteError) return jsonError(quoteError.message, 500);
  if (!quote) return jsonError('Quotation not found.', 404);
  const amount = Number(quote.total ?? quote.total_amount ?? 0) || 0;
  const { data: acceptance } = await supabase.from('quotation_acceptances').insert({ quotation_id: quotationId, job_id: quote.job_id ?? null, customer_id: quote.customer_id ?? null, acceptance_status: 'accepted', accepted_total: amount, accepted_version: quote.current_version ?? 1 }).select('acceptance_id,quotation_id,acceptance_status,accepted_total,accepted_version,created_at').maybeSingle();
  let invoice = null as JsonRecord | null;
  if (str(input.action, 80) === 'prepare_invoice') {
    const inv = await supabase.from('invoices').insert({ invoice_no: invoiceNo(), customer_id: quote.customer_id ?? null, job_id: quote.job_id ?? null, total: amount, total_amount: amount, status: 'draft' }).select('invoice_id,invoice_no,job_id,total,total_amount,status,created_at').maybeSingle();
    invoice = inv.data as JsonRecord | null;
  }
  try { await supabase.from('quotations').update({ approval_status: 'accepted', status: 'accepted', updated_at: new Date().toISOString() }).eq('quotation_id', quotationId); } catch {}
  await transition(supabase, auth, request, 'quotation', 'quotation', quotationId, quote.status ?? null, 'accepted', 'Quotation acceptance bridge');
  const bridge = { quotation_id: quotationId, acceptance_id: acceptance?.acceptance_id ?? null, acceptance_status: acceptance?.acceptance_status ?? 'accepted', invoice_id: invoice?.invoice_id ?? null, invoice_status: invoice?.status ?? 'not_prepared', accepted_warranty_years: str(input.accepted_warranty_years, 80) || null };
  await audit(auth, request, 'service_operations_quotation_acceptance_bridge', 'quotation', quotationId, bridge);
  return json({ ok: true, bridge, result: bridge });
}

export async function invoiceLivePOST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const input = await body(request);
  const quotationId = uuid(input.quotation_id);
  const serviceRequestId = uuid(input.service_request_id);
  if (!quotationId && !serviceRequestId) return jsonError('quotation_id or service_request_id is required.', 400);
  const supabase = createAdminClient();
  let quote: JsonRecord | null = null;
  if (quotationId) {
    const { data } = await supabase.from('quotations').select('quotation_id,job_id,customer_id,total,total_amount').eq('quotation_id', quotationId).maybeSingle();
    quote = data as JsonRecord | null;
  }
  const amount = money(input.amount) || Number(quote?.total ?? quote?.total_amount ?? 0) || 0;
  const action = str(input.action, 40) || 'draft';
  const status = action === 'issue' || action === 'approve' || action === 'mark_sent' ? 'issued' : action === 'void' ? 'void' : 'draft';
  const { data, error } = await supabase.from('invoices').insert({ invoice_no: invoiceNo(), customer_id: quote?.customer_id ?? null, job_id: quote?.job_id ?? null, total: amount, total_amount: amount, due_date: str(input.due_date, 40) || null, status }).select('invoice_id,invoice_no,customer_id,job_id,total,total_amount,due_date,status,created_at,updated_at').single();
  if (error) return jsonError(error.message, 500);
  await transition(supabase, auth, request, 'invoice', 'invoice', data.invoice_id, null, data.status ?? status, 'Invoice saved from live workspace');
  await audit(auth, request, 'service_operations_invoice_live_save', 'invoice', data.invoice_id, { invoice: data, quotation_id: quotationId || null, service_request_id: serviceRequestId || null, customer_visible: str(input.customer_visible, 20) });
  return json({ ok: true, invoice: data, result: data }, 201);
}

export async function paymentLivePOST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const input = await body(request);
  const invoiceId = uuid(input.invoice_id);
  if (!invoiceId) return jsonError('Valid invoice_id is required.', 400);
  const supabase = createAdminClient();
  const action = str(input.action, 40) || 'create_intent';
  const status = action === 'mark_paid' ? 'succeeded' : action === 'failed' ? 'failed' : action === 'refund' ? 'refunded' : 'pending';
  const amount = money(input.amount);
  const { data, error } = await supabase.from('payments').insert({ invoice_id: invoiceId, amount, gateway: str(input.payment_method, 80) || 'manual', transaction_id: str(input.reference, 160) || `manual-${Date.now()}`, status, reconciled_at: status === 'succeeded' ? new Date().toISOString() : null }).select('payment_id,invoice_id,amount,gateway,transaction_id,status,reconciled_at,created_at,updated_at').single();
  if (error) return jsonError(error.message, 500);
  if (status === 'succeeded') { try { await supabase.from('invoices').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('invoice_id', invoiceId); } catch {} }
  await transition(supabase, auth, request, 'payment', 'payment', data.payment_id, null, data.status ?? status, 'Payment saved from live workspace');
  await audit(auth, request, 'service_operations_payment_live_save', 'payment', data.payment_id, { payment: data, action, invoice_status_update: status === 'succeeded' ? 'paid' : null });
  return json({ ok: true, payment: data, result: data }, 201);
}
