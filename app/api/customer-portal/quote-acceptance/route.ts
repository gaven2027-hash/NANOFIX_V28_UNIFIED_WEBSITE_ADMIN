export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;
const RESPONSE_TYPES = ['accepted', 'declined', 'revision_requested'] as const;
type ResponseType = typeof RESPONSE_TYPES[number];
type ApiPayload = Record<string, unknown>;

type QuotationRow = {
  quotation_id: string;
  job_id: string | null;
  current_version: number | null;
  total: number | null;
  approval_status: string | null;
  visible_to_customer: boolean | null;
  public_ref: string | null;
  pdf_storage_path?: string | null;
  created_at: string | null;
};

type QuotationPdfRow = {
  quotation_pdf_id: string;
  quotation_id: string;
  quotation_version: number | null;
  storage_path: string | null;
  visible_to_customer: boolean | null;
  created_at: string | null;
};

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function responseType(value: unknown): ResponseType {
  const text = cleanText(value, 80) as ResponseType | null;
  return text && RESPONSE_TYPES.includes(text) ? text : 'accepted';
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
  return unique((data ?? []).map((row) => row.customer_id as string));
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

async function loadVisibleOwnedQuotation(profileId: string, quotationId: string) {
  const supabase = createAdminClient();
  const customerIds = await customerIdsForProfile(profileId);
  if (!customerIds.length) throw new Error('Active linked customer profile is required.');
  const jobIds = await jobIdsForCustomers(customerIds);
  if (!jobIds.length) throw new Error('No linked jobs found for this customer.');

  const { data, error } = await supabase
    .from('quotations')
    .select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,public_ref,pdf_storage_path,created_at')
    .eq('quotation_id', quotationId)
    .in('job_id', jobIds)
    .eq('visible_to_customer', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Quotation is not visible or not linked to this customer.');
  return { quotation: data as QuotationRow, customerId: customerIds[0] };
}

async function latestVisibleQuotationPdf(quotationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('quotation_pdf_documents')
    .select('quotation_pdf_id,quotation_id,quotation_version,storage_path,visible_to_customer,created_at')
    .eq('quotation_id', quotationId)
    .eq('visible_to_customer', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as QuotationPdfRow | null;
}

async function createCustomerResponse(input: { quotation: QuotationRow; customerId: string; profileId: string; response: ResponseType; customerMessage: string | null; quotePdf: QuotationPdfRow | null }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('quotation_customer_responses')
    .insert({
      quotation_id: input.quotation.quotation_id,
      quotation_version: input.quotation.current_version,
      quotation_pdf_id: input.quotePdf?.quotation_pdf_id ?? null,
      customer_id: input.customerId,
      responded_by_profile_id: input.profileId,
      response_type: input.response,
      response_status: 'submitted',
      quoted_total: input.quotation.total ?? 0,
      quoted_pdf_storage_path: input.quotePdf?.storage_path ?? input.quotation.pdf_storage_path ?? null,
      customer_message: input.customerMessage
    })
    .select('response_id,quotation_id,quotation_version,quotation_pdf_id,customer_id,response_type,response_status,quoted_total,quoted_pdf_storage_path,customer_message,created_at')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function createTaskAndInbox(input: { quotationId: string; responseId: string; response: ResponseType; total: number; customerMessage: string | null; paymentIntentId?: string | null }) {
  const supabase = createAdminClient();
  const title = input.response === 'accepted' ? 'Customer accepted quotation' : input.response === 'declined' ? 'Customer declined quotation' : 'Customer requested quotation revision';
  const description = `${title}: ${input.quotationId}. Total: ${input.total}. ${input.customerMessage ? `Customer message: ${input.customerMessage}` : ''}`;
  const { data: task, error: taskError } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'customer_portal',
      source_table: 'quotation_customer_responses',
      source_id: input.responseId,
      title,
      description,
      priority: input.response === 'accepted' ? 'P1' : 'P2',
      assignee_role: 'finance',
      status: 'open',
      metadata_json: { quotation_id: input.quotationId, response_type: input.response, payment_intent_id: input.paymentIntentId ?? null, source: 'quote_response' }
    })
    .select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at')
    .single();
  if (taskError) throw new Error(taskError.message);
  await supabase.from('task_events').insert({ task_id: task.task_id, action: `customer_quote_${input.response}`, after_json: task }).throwOnError();

  const { data: inbox, error: inboxError } = await supabase
    .from('internal_inbox_messages')
    .insert({
      recipient_role: 'finance',
      subject: title,
      body: input.response === 'accepted' ? `${description} Please prepare invoice/payment link.` : `${description} Please review customer feedback and prepare a revised quotation if needed.`,
      category: 'quote_response',
      priority: input.response === 'accepted' ? 'P1' : 'P2',
      related_object_type: 'quotation_customer_response',
      related_object_id: input.responseId,
      task_id: task.task_id
    })
    .select('message_id,recipient_role,subject,category,priority,related_object_type,related_object_id,task_id,created_at')
    .single();
  if (inboxError) throw new Error(inboxError.message);
  return { task, inbox };
}

async function queueCustomerConfirmation(input: { customerId: string; quotationId: string; responseId: string; response: ResponseType }) {
  const supabase = createAdminClient();
  const subject = input.response === 'accepted' ? 'NANOFIX quotation accepted' : input.response === 'declined' ? 'NANOFIX quotation response received' : 'NANOFIX quotation revision request received';
  const body = input.response === 'accepted'
    ? 'Your quotation acceptance has been received. NANOFIX will prepare the invoice/payment link.'
    : input.response === 'declined'
      ? 'Your quotation response has been received. NANOFIX will review it.'
      : 'Your quotation revision request has been received. NANOFIX will review your message and send an updated quotation if needed.';
  const { data, error } = await supabase
    .from('notification_outbox')
    .insert({
      channel: 'internal',
      recipient_customer_id: input.customerId,
      subject,
      body,
      payload_json: { quotation_id: input.quotationId, response_id: input.responseId, response_type: input.response, source: 'quote_response' },
      delivery_status: 'queued',
      related_object_type: 'quotation_customer_response',
      related_object_id: input.responseId
    })
    .select('notification_id,channel,recipient_customer_id,subject,delivery_status,related_object_type,related_object_id,created_at')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const quotationId = cleanText(body.quotation_id, 120);
  const customerMessage = cleanText(body.customer_note ?? body.customer_message, 1200);
  const response = responseType(body.response_type);
  if (!isUuid(quotationId)) return jsonError('Valid quotation_id is required.', 400);
  if ((response === 'declined' || response === 'revision_requested') && !customerMessage) return jsonError('Customer message is required when declining or requesting revision.', 400);

  const supabase = createAdminClient();
  const { quotation, customerId } = await loadVisibleOwnedQuotation(auth.actor.profileId, quotationId);
  const quotePdf = await latestVisibleQuotationPdf(quotationId);

  if (response === 'accepted') {
    const { data: existing } = await supabase
      .from('quotation_acceptances')
      .select('acceptance_id,quotation_id,customer_id,acceptance_status,created_at')
      .eq('quotation_id', quotationId)
      .eq('customer_id', customerId)
      .eq('acceptance_status', 'accepted')
      .maybeSingle();
    if (existing) return jsonError('Quotation has already been accepted by this customer.', 409);
  }

  const customerResponse = await createCustomerResponse({ quotation, customerId, profileId: auth.actor.profileId, response, customerMessage, quotePdf });

  let acceptance: Record<string, unknown> | null = null;
  let paymentIntent: Record<string, unknown> | null = null;
  if (response === 'accepted') {
    const { data: acceptanceRow, error: acceptanceError } = await supabase
      .from('quotation_acceptances')
      .insert({
        quotation_id: quotationId,
        job_id: quotation.job_id,
        customer_id: customerId,
        accepted_by_profile_id: auth.actor.profileId,
        acceptance_status: 'accepted',
        accepted_total: quotation.total,
        accepted_version: quotation.current_version,
        quotation_pdf_id: quotePdf?.quotation_pdf_id ?? null,
        accepted_pdf_storage_path: quotePdf?.storage_path ?? quotation.pdf_storage_path ?? null,
        customer_note: customerMessage,
        customer_message: customerMessage,
        ip_address: getClientIp(request),
        user_agent: request.headers.get('user-agent') ?? null
      })
      .select('acceptance_id,quotation_id,job_id,customer_id,accepted_total,accepted_version,quotation_pdf_id,accepted_pdf_storage_path,acceptance_status,customer_note,customer_message,created_at')
      .single();
    if (acceptanceError) return jsonError(acceptanceError.message, 400);
    acceptance = acceptanceRow;

    const { data: paymentIntentRow, error: paymentIntentError } = await supabase
      .from('payment_intents')
      .insert({
        quotation_id: quotationId,
        acceptance_id: acceptanceRow.acceptance_id,
        job_id: quotation.job_id,
        customer_id: customerId,
        amount: quotation.total,
        currency: 'SGD',
        status: 'pending_invoice',
        provider: 'manual',
        metadata_json: { source: 'customer_quote_acceptance', quotation_public_ref: quotation.public_ref, quotation_version: quotation.current_version, quotation_pdf_id: quotePdf?.quotation_pdf_id ?? null },
        created_by: auth.actor.profileId
      })
      .select('payment_intent_id,quotation_id,acceptance_id,job_id,customer_id,amount,currency,status,provider,payment_url,created_at')
      .single();
    if (paymentIntentError) return jsonError(paymentIntentError.message, 400);
    paymentIntent = paymentIntentRow;
  }

  const nextStatus = response === 'accepted' ? 'customer_accepted' : response === 'declined' ? 'customer_declined' : 'customer_revision_requested';
  await supabase.from('quotations').update({ approval_status: nextStatus }).eq('quotation_id', quotationId).throwOnError();

  const [workflow, confirmation] = await Promise.all([
    createTaskAndInbox({ quotationId, responseId: customerResponse.response_id, response, total: Number(quotation.total ?? 0), customerMessage, paymentIntentId: typeof paymentIntent?.payment_intent_id === 'string' ? paymentIntent.payment_intent_id : null }),
    queueCustomerConfirmation({ customerId, quotationId, responseId: customerResponse.response_id, response })
  ]);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_quote_response_submit',
    objectType: 'quotation_customer_response',
    objectId: customerResponse.response_id,
    after: { quotation, response: customerResponse, acceptance, payment_intent: paymentIntent, quote_pdf: quotePdf, workflow, confirmation },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, quotation, response: customerResponse, acceptance, payment_intent: paymentIntent, quote_pdf: quotePdf, workflow, confirmation }, { status: 201 });
}
