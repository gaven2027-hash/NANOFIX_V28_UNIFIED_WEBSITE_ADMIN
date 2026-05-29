export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getClientIp } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

type WebhookPayload = Record<string, unknown>;
type PaymentIntentRow = {
  payment_intent_id: string;
  quotation_id: string | null;
  acceptance_id: string | null;
  invoice_id: string | null;
  job_id: string | null;
  customer_id: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  provider: string | null;
  payment_url: string | null;
  provider_external_id?: string | null;
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 500) : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyWebhookSecret(request: NextRequest, rawBody: string) {
  const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.NANOFIX_PAYMENT_WEBHOOK_SECRET || '';
  if (!configuredSecret) return { ok: false, reason: 'PAYMENT_WEBHOOK_SECRET is not configured.' };
  const headerSecret = request.headers.get('x-nanofix-webhook-secret') || '';
  if (headerSecret && timingSafeEqual(headerSecret, configuredSecret)) return { ok: true, method: 'shared-secret' };
  const headerSignature = request.headers.get('x-nanofix-signature') || '';
  if (headerSignature) {
    const expected = crypto.createHmac('sha256', configuredSecret).update(rawBody).digest('hex');
    const normalized = headerSignature.replace(/^sha256=/i, '');
    if (timingSafeEqual(normalized, expected)) return { ok: true, method: 'hmac-sha256' };
  }
  return { ok: false, reason: 'Invalid payment webhook signature.' };
}

function providerStatusToInternal(status: string, eventType: string) {
  const normalized = `${status} ${eventType}`.toLowerCase();
  if (/(paid|succeeded|success|captured|settled|completed)/.test(normalized)) return 'paid';
  if (/(fail|failed|declined|expired)/.test(normalized)) return 'failed';
  if (/(cancel|cancelled|canceled|void)/.test(normalized)) return 'cancelled';
  return 'ready';
}

function parseWebhook(payload: WebhookPayload) {
  const data = (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) ? payload.data as WebhookPayload : payload;
  const provider = text(payload.provider, text(payload.gateway, text(data.provider, 'manual')));
  const providerEventId = text(payload.provider_event_id, text(payload.event_id, text(payload.id, text(data.event_id, text(data.id, '')))));
  const eventType = text(payload.event_type, text(payload.type, text(data.event_type, text(data.type, 'payment.updated'))));
  const providerExternalId = text(payload.provider_external_id, text(payload.payment_external_id, text(payload.checkout_session_id, text(data.provider_external_id, text(data.payment_external_id, text(data.checkout_session_id, text(data.id, '')))))));
  const paymentIntentId = text(payload.payment_intent_id, text(data.payment_intent_id, ''));
  const invoiceId = text(payload.invoice_id, text(data.invoice_id, ''));
  const status = text(payload.status, text(data.status, eventType));
  const amount = num(payload.amount, num(data.amount, 0));
  const currency = text(payload.currency, text(data.currency, 'SGD')).toUpperCase();
  return { provider, providerEventId, eventType, providerExternalId, paymentIntentId, invoiceId, status, amount, currency };
}

async function findPaymentIntent(input: { paymentIntentId: string; provider: string; providerExternalId: string; invoiceId: string }) {
  const supabase = createAdminClient();
  if (input.paymentIntentId) {
    const { data, error } = await supabase.from('payment_intents').select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,payment_url,provider_external_id').eq('payment_intent_id', input.paymentIntentId).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as PaymentIntentRow;
  }
  if (input.providerExternalId) {
    const { data, error } = await supabase.from('payment_intents').select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,payment_url,provider_external_id').eq('provider', input.provider).eq('provider_external_id', input.providerExternalId).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as PaymentIntentRow;
  }
  if (input.invoiceId) {
    const { data, error } = await supabase.from('payment_intents').select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,payment_url,provider_external_id').eq('invoice_id', input.invoiceId).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as PaymentIntentRow;
  }
  return null;
}

async function createFinanceTask(input: { paymentIntentId: string; paymentId: string | null; status: string; amount: number; provider: string }) {
  const supabase = createAdminClient();
  const { data: task, error: taskError } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'payment_webhook',
      source_table: 'payment_intents',
      source_id: input.paymentIntentId,
      title: 'Payment webhook reconciled',
      description: `Payment webhook from ${input.provider} reconciled as ${input.status}. Amount: ${input.amount}.`,
      priority: input.status === 'paid' ? 'P1' : 'P2',
      assignee_role: 'finance',
      status: 'open',
      metadata_json: { source: 'payment_webhook_reconciliation', payment_id: input.paymentId }
    })
    .select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at')
    .single();
  if (taskError) throw new Error(taskError.message);
  await supabase.from('task_events').insert({ task_id: task.task_id, action: 'payment_webhook_reconciled', after_json: task }).throwOnError();
  await supabase.from('internal_inbox_messages').insert({
    recipient_role: 'finance',
    subject: 'Payment webhook reconciled',
    body: `Payment intent ${input.paymentIntentId} reconciled as ${input.status}.`,
    category: 'payment_webhook',
    priority: input.status === 'paid' ? 'P1' : 'P2',
    related_object_type: 'payment_intent',
    related_object_id: input.paymentIntentId,
    task_id: task.task_id
  }).throwOnError();
  return task;
}

async function reconcilePayment(input: { parsed: ReturnType<typeof parseWebhook>; paymentIntent: PaymentIntentRow; eventId: string }) {
  const supabase = createAdminClient();
  const internalStatus = providerStatusToInternal(input.parsed.status, input.parsed.eventType);
  const paid = internalStatus === 'paid';
  const amount = input.parsed.amount || Number(input.paymentIntent.amount ?? 0);

  const { data: updatedIntent, error: intentError } = await supabase
    .from('payment_intents')
    .update({
      status: internalStatus,
      provider: input.parsed.provider,
      provider_external_id: input.parsed.providerExternalId || input.paymentIntent.provider_external_id,
      amount,
      currency: input.parsed.currency || input.paymentIntent.currency || 'SGD',
      last_webhook_event_id: input.eventId
    })
    .eq('payment_intent_id', input.paymentIntent.payment_intent_id)
    .select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,payment_url,provider_external_id,updated_at')
    .single();
  if (intentError) throw new Error(intentError.message);

  let paymentId: string | null = null;
  if (input.paymentIntent.invoice_id) {
    const { data: existingPayment, error: paymentSelectError } = await supabase
      .from('payments')
      .select('payment_id')
      .eq('invoice_id', input.paymentIntent.invoice_id)
      .maybeSingle();
    if (paymentSelectError) throw new Error(paymentSelectError.message);
    if (existingPayment?.payment_id) {
      paymentId = existingPayment.payment_id as string;
      await supabase
        .from('payments')
        .update({ amount, status: internalStatus, reconciled_at: paid ? new Date().toISOString() : null, visible_to_customer: true })
        .eq('payment_id', paymentId)
        .throwOnError();
    } else {
      const { data: newPayment, error: paymentInsertError } = await supabase
        .from('payments')
        .insert({ invoice_id: input.paymentIntent.invoice_id, amount, status: internalStatus, fee: 0, reconciled_at: paid ? new Date().toISOString() : null, visible_to_customer: true })
        .select('payment_id')
        .single();
      if (paymentInsertError) throw new Error(paymentInsertError.message);
      paymentId = newPayment.payment_id as string;
    }
    await supabase.from('payment_transactions').insert({
      payment_id: paymentId,
      provider: input.parsed.provider,
      external_id: input.parsed.providerExternalId || input.parsed.providerEventId,
      status: internalStatus,
      amount,
      payload: { source: 'payment_webhook', event_id: input.eventId, provider_event_id: input.parsed.providerEventId }
    }).throwOnError();
    await supabase
      .from('invoices')
      .update({ status: paid ? 'paid' : internalStatus })
      .eq('invoice_id', input.paymentIntent.invoice_id)
      .throwOnError();
  }

  const task = await createFinanceTask({ paymentIntentId: input.paymentIntent.payment_intent_id, paymentId, status: internalStatus, amount, provider: input.parsed.provider });
  if (updatedIntent.customer_id) {
    await supabase.from('notification_outbox').insert({
      channel: 'internal',
      recipient_customer_id: updatedIntent.customer_id,
      subject: paid ? 'NANOFIX payment received' : 'NANOFIX payment status updated',
      body: paid ? 'Your NANOFIX payment has been received.' : `Your NANOFIX payment status is ${internalStatus}.`,
      payload_json: { source: 'payment_webhook_reconciliation', payment_intent_id: updatedIntent.payment_intent_id, payment_id: paymentId },
      delivery_status: 'queued',
      related_object_type: 'payment_intent',
      related_object_id: updatedIntent.payment_intent_id
    }).throwOnError();
  }

  return { status: internalStatus, payment_id: paymentId, payment_intent: updatedIntent, task };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const verification = verifyWebhookSecret(request, rawBody);
  if (!verification.ok) return NextResponse.json({ ok: false, error: verification.reason }, { status: 401 });

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = parseWebhook(payload);
  if (!parsed.provider || !parsed.providerEventId) return NextResponse.json({ ok: false, error: 'provider and provider_event_id are required.' }, { status: 400 });

  const supabase = createAdminClient();
  const signatureHash = sha256(request.headers.get('x-nanofix-signature') || request.headers.get('x-nanofix-webhook-secret') || 'verified');
  const { data: eventRow, error: insertError } = await supabase
    .from('payment_webhook_events')
    .insert({
      provider: parsed.provider,
      provider_event_id: parsed.providerEventId,
      event_type: parsed.eventType,
      provider_external_id: parsed.providerExternalId,
      amount: parsed.amount,
      currency: parsed.currency,
      signature_valid: true,
      signature_hash: signatureHash,
      payload_json: payload,
      processing_status: 'received'
    })
    .select('webhook_event_id,provider,provider_event_id,processing_status,created_at')
    .single();

  if (insertError) {
    if (/duplicate key|23505/i.test(insertError.message)) {
      return NextResponse.json({ ok: true, duplicate: true, provider: parsed.provider, provider_event_id: parsed.providerEventId });
    }
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  }

  try {
    const paymentIntent = await findPaymentIntent({ paymentIntentId: parsed.paymentIntentId, provider: parsed.provider, providerExternalId: parsed.providerExternalId, invoiceId: parsed.invoiceId });
    if (!paymentIntent) {
      await supabase.from('payment_webhook_events').update({ processing_status: 'unmatched', error_message: 'No matching payment intent found.', processed_at: new Date().toISOString() }).eq('webhook_event_id', eventRow.webhook_event_id).throwOnError();
      await writeAuditLog({ role: 'system', action: 'payment_webhook_unmatched', objectType: 'payment_webhook_event', objectId: eventRow.webhook_event_id, after: { parsed }, ip: getClientIp(request) }).catch(() => undefined);
      return NextResponse.json({ ok: true, matched: false, webhook_event_id: eventRow.webhook_event_id });
    }

    await supabase.from('payment_webhook_events').update({ processing_status: 'matched', payment_intent_id: paymentIntent.payment_intent_id, invoice_id: paymentIntent.invoice_id }).eq('webhook_event_id', eventRow.webhook_event_id).throwOnError();
    const reconciliation = await reconcilePayment({ parsed, paymentIntent, eventId: eventRow.webhook_event_id });
    await supabase.from('payment_webhook_events').update({ processing_status: 'processed', payment_id: reconciliation.payment_id, processed_at: new Date().toISOString() }).eq('webhook_event_id', eventRow.webhook_event_id).throwOnError();
    await writeAuditLog({ role: 'system', action: 'payment_webhook_reconciled', objectType: 'payment_intent', objectId: paymentIntent.payment_intent_id, after: { parsed, reconciliation }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, webhook_event_id: eventRow.webhook_event_id, reconciliation });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from('payment_webhook_events').update({ processing_status: 'failed', error_message: message, processed_at: new Date().toISOString() }).eq('webhook_event_id', eventRow.webhook_event_id).throwOnError();
    await writeAuditLog({ role: 'system', action: 'payment_webhook_failed', objectType: 'payment_webhook_event', objectId: eventRow.webhook_event_id, after: { parsed, error: message }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: false, error: message, webhook_event_id: eventRow.webhook_event_id }, { status: 500 });
  }
}
