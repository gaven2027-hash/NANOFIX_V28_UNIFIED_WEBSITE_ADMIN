export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;
type ApiPayload = Record<string, unknown>;

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
    .select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,public_ref,created_at')
    .eq('quotation_id', quotationId)
    .in('job_id', jobIds)
    .eq('visible_to_customer', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Quotation is not visible or not linked to this customer.');
  return { quotation: data, customerId: customerIds[0] };
}

async function createTaskAndInbox(input: { quotationId: string; acceptanceId: string; paymentIntentId: string; total: number; customerNote: string | null }) {
  const supabase = createAdminClient();
  const title = 'Customer accepted quotation';
  const description = `Customer accepted quotation ${input.quotationId}. Total: ${input.total}. ${input.customerNote ? `Note: ${input.customerNote}` : ''}`;
  const { data: task, error: taskError } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'customer_portal',
      source_table: 'quotation_acceptances',
      source_id: input.acceptanceId,
      title,
      description,
      priority: 'P1',
      assignee_role: 'finance',
      status: 'open',
      metadata_json: { quotation_id: input.quotationId, payment_intent_id: input.paymentIntentId, source: 'quote_acceptance' }
    })
    .select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at')
    .single();
  if (taskError) throw new Error(taskError.message);
  await supabase.from('task_events').insert({ task_id: task.task_id, action: 'customer_quote_acceptance_created', after_json: task }).throwOnError();

  const { data: inbox, error: inboxError } = await supabase
    .from('internal_inbox_messages')
    .insert({
      recipient_role: 'finance',
      subject: title,
      body: `${description} Please prepare invoice/payment link.`,
      category: 'quote_acceptance',
      priority: 'P1',
      related_object_type: 'quotation_acceptance',
      related_object_id: input.acceptanceId,
      task_id: task.task_id
    })
    .select('message_id,recipient_role,subject,category,priority,related_object_type,related_object_id,task_id,created_at')
    .single();
  if (inboxError) throw new Error(inboxError.message);
  return { task, inbox };
}

async function queueCustomerConfirmation(input: { customerId: string; quotationId: string; acceptanceId: string }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('notification_outbox')
    .insert({
      channel: 'internal',
      recipient_customer_id: input.customerId,
      subject: 'NANOFIX quotation accepted',
      body: 'Your quotation acceptance has been received. NANOFIX will prepare the invoice/payment link.',
      payload_json: { quotation_id: input.quotationId, acceptance_id: input.acceptanceId, source: 'quote_acceptance' },
      delivery_status: 'queued',
      related_object_type: 'quotation_acceptance',
      related_object_id: input.acceptanceId
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
  const customerNote = cleanText(body.customer_note, 1000);
  if (!isUuid(quotationId)) return jsonError('Valid quotation_id is required.', 400);

  const supabase = createAdminClient();
  const { quotation, customerId } = await loadVisibleOwnedQuotation(auth.actor.profileId, quotationId);

  const { data: existing } = await supabase
    .from('quotation_acceptances')
    .select('acceptance_id,quotation_id,customer_id,acceptance_status,created_at')
    .eq('quotation_id', quotationId)
    .eq('customer_id', customerId)
    .eq('acceptance_status', 'accepted')
    .maybeSingle();
  if (existing) return jsonError('Quotation has already been accepted by this customer.', 409);

  const { data: acceptance, error: acceptanceError } = await supabase
    .from('quotation_acceptances')
    .insert({
      quotation_id: quotationId,
      job_id: quotation.job_id,
      customer_id: customerId,
      accepted_by_profile_id: auth.actor.profileId,
      acceptance_status: 'accepted',
      accepted_total: quotation.total,
      accepted_version: quotation.current_version,
      customer_note: customerNote,
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent') ?? null
    })
    .select('acceptance_id,quotation_id,job_id,customer_id,accepted_total,accepted_version,acceptance_status,customer_note,created_at')
    .single();
  if (acceptanceError) return jsonError(acceptanceError.message, 400);

  const { data: paymentIntent, error: paymentIntentError } = await supabase
    .from('payment_intents')
    .insert({
      quotation_id: quotationId,
      acceptance_id: acceptance.acceptance_id,
      job_id: quotation.job_id,
      customer_id: customerId,
      amount: quotation.total,
      currency: 'SGD',
      status: 'pending_invoice',
      provider: 'manual',
      metadata_json: { source: 'customer_quote_acceptance', quotation_public_ref: quotation.public_ref },
      created_by: auth.actor.profileId
    })
    .select('payment_intent_id,quotation_id,acceptance_id,job_id,customer_id,amount,currency,status,provider,payment_url,created_at')
    .single();
  if (paymentIntentError) return jsonError(paymentIntentError.message, 400);

  await supabase
    .from('quotations')
    .update({ approval_status: 'customer_accepted' })
    .eq('quotation_id', quotationId)
    .throwOnError();

  const [workflow, confirmation] = await Promise.all([
    createTaskAndInbox({ quotationId, acceptanceId: acceptance.acceptance_id, paymentIntentId: paymentIntent.payment_intent_id, total: Number(quotation.total), customerNote }),
    queueCustomerConfirmation({ customerId, quotationId, acceptanceId: acceptance.acceptance_id })
  ]);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_quote_acceptance_submit',
    objectType: 'quotation_acceptance',
    objectId: acceptance.acceptance_id,
    after: { quotation, acceptance, payment_intent: paymentIntent, workflow, confirmation },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, quotation, acceptance, payment_intent: paymentIntent, workflow, confirmation }, { status: 201 });
}
