export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance'] as const;
const PROVIDERS = ['manual', 'stripe', 'hitpay'] as const;
type Provider = typeof PROVIDERS[number];
type ApiPayload = Record<string, unknown>;

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
  provider_external_id: string | null;
  payment_url: string | null;
};

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanProvider(value: unknown): Provider | null {
  const text = cleanText(value, 40) as Provider | null;
  return text && PROVIDERS.includes(text) ? text : null;
}

function cleanNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nanofixsg.com').replace(/\/$/, '');
}

function providerConfigured(provider: Provider) {
  if (provider === 'manual') return true;
  if (provider === 'stripe') return Boolean(process.env.STRIPE_SECRET_KEY);
  if (provider === 'hitpay') return Boolean(process.env.HITPAY_API_KEY);
  return false;
}

async function loadPaymentIntent(paymentIntentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payment_intents')
    .select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,provider_external_id,payment_url')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as PaymentIntentRow | null;
}

function buildManualCheckout(input: { paymentIntent: PaymentIntentRow; body: ApiPayload }) {
  const url = cleanText(input.body.payment_url, 700);
  if (!url) throw new Error('manual provider requires payment_url.');
  return {
    provider: 'manual' as Provider,
    providerExternalId: cleanText(input.body.provider_external_id, 240) || `manual-${input.paymentIntent.payment_intent_id}`,
    paymentUrl: url,
    status: 'ready',
    requestJson: { source: 'manual_payment_link', payment_intent_id: input.paymentIntent.payment_intent_id },
    responseJson: { mode: 'manual', payment_url: url }
  };
}

function buildConfiguredProviderPlaceholder(provider: Provider, input: { paymentIntent: PaymentIntentRow; body: ApiPayload }) {
  if (!providerConfigured(provider)) throw new Error(`${provider} checkout adapter is not configured. Add provider keys before generating live checkout links.`);
  const successUrl = cleanText(input.body.success_url, 700) || `${baseUrl()}/customer-portal/financial?payment_intent_id=${input.paymentIntent.payment_intent_id}&status=success`;
  const cancelUrl = cleanText(input.body.cancel_url, 700) || `${baseUrl()}/customer-portal/financial?payment_intent_id=${input.paymentIntent.payment_intent_id}&status=cancelled`;
  throw new Error(`${provider} live checkout call is intentionally disabled until provider-specific request signing is completed. Use manual payment_url or complete adapter implementation.`);
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 20), 1), 80);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payment_checkout_sessions')
    .select('checkout_session_id,payment_intent_id,provider,provider_external_id,payment_url,amount,currency,status,success_url,cancel_url,error_message,created_by,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_payment_checkout_sessions_read',
    objectType: 'payment_checkout_sessions',
    after: { count: data?.length ?? 0 },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, checkout_sessions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const provider = cleanProvider(body.provider) ?? 'manual';
  const paymentIntentId = cleanText(body.payment_intent_id, 120);
  if (action !== 'create_checkout_session') return jsonError('Unsupported checkout session action.', 400);
  if (!isUuid(paymentIntentId)) return jsonError('Valid payment_intent_id is required.', 400);

  const paymentIntent = await loadPaymentIntent(paymentIntentId);
  if (!paymentIntent) return jsonError('Payment intent not found.', 404);
  if (paymentIntent.status === 'paid') return jsonError('Payment intent is already paid.', 409);

  const amount = cleanNumber(body.amount, Number(paymentIntent.amount ?? 0));
  const currency = cleanText(body.currency, 10) || paymentIntent.currency || 'SGD';
  const successUrl = cleanText(body.success_url, 700) || `${baseUrl()}/customer-portal/financial?payment_intent_id=${paymentIntentId}&status=success`;
  const cancelUrl = cleanText(body.cancel_url, 700) || `${baseUrl()}/customer-portal/financial?payment_intent_id=${paymentIntentId}&status=cancelled`;
  const supabase = createAdminClient();

  let adapterResult: { provider: Provider; providerExternalId: string; paymentUrl: string; status: string; requestJson: Record<string, unknown>; responseJson: Record<string, unknown> };
  try {
    adapterResult = provider === 'manual'
      ? buildManualCheckout({ paymentIntent, body })
      : buildConfiguredProviderPlaceholder(provider, { paymentIntent, body }) as never;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { data: failedSession } = await supabase
      .from('payment_checkout_sessions')
      .insert({
        payment_intent_id: paymentIntentId,
        provider,
        provider_external_id: cleanText(body.provider_external_id, 240),
        payment_url: cleanText(body.payment_url, 700),
        amount,
        currency,
        status: 'failed',
        success_url: successUrl,
        cancel_url: cancelUrl,
        request_json: { action, provider, payment_intent_id: paymentIntentId },
        response_json: {},
        error_message: message,
        created_by: auth.actor.profileId
      })
      .select('checkout_session_id,payment_intent_id,provider,status,error_message,created_at')
      .single();
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_payment_checkout_session_failed', objectType: 'payment_checkout_session', objectId: failedSession?.checkout_session_id, after: { failedSession, error: message }, ip: getClientIp(request) }).catch(() => undefined);
    return jsonError(message, provider === 'manual' ? 400 : 501);
  }

  const { data: session, error: sessionError } = await supabase
    .from('payment_checkout_sessions')
    .insert({
      payment_intent_id: paymentIntentId,
      provider: adapterResult.provider,
      provider_external_id: adapterResult.providerExternalId,
      payment_url: adapterResult.paymentUrl,
      amount,
      currency,
      status: adapterResult.status,
      success_url: successUrl,
      cancel_url: cancelUrl,
      request_json: adapterResult.requestJson,
      response_json: adapterResult.responseJson,
      created_by: auth.actor.profileId
    })
    .select('checkout_session_id,payment_intent_id,provider,provider_external_id,payment_url,amount,currency,status,success_url,cancel_url,created_at,updated_at')
    .single();
  if (sessionError) return jsonError(sessionError.message, 400);

  const { data: updatedIntent, error: intentError } = await supabase
    .from('payment_intents')
    .update({
      checkout_session_id: session.checkout_session_id,
      provider: adapterResult.provider,
      provider_external_id: adapterResult.providerExternalId,
      payment_url: adapterResult.paymentUrl,
      amount,
      currency,
      status: 'ready'
    })
    .eq('payment_intent_id', paymentIntentId)
    .select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,provider_external_id,payment_url,checkout_session_id,updated_at')
    .single();
  if (intentError) return jsonError(intentError.message, 400);

  if (updatedIntent.invoice_id) {
    await supabase.from('invoices').update({ payment_intent_id: paymentIntentId, payment_url: adapterResult.paymentUrl }).eq('invoice_id', updatedIntent.invoice_id).throwOnError();
  }

  await supabase.from('notification_outbox').insert({
    channel: 'internal',
    recipient_customer_id: updatedIntent.customer_id,
    subject: 'NANOFIX payment link is ready',
    body: 'Your NANOFIX payment link is ready in Customer Portal.',
    payload_json: { source: 'checkout_session_generator', payment_intent_id: paymentIntentId, checkout_session_id: session.checkout_session_id, payment_url: adapterResult.paymentUrl },
    delivery_status: 'queued',
    related_object_type: 'payment_intent',
    related_object_id: paymentIntentId
  }).throwOnError();

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_payment_checkout_session_create',
    objectType: 'payment_checkout_session',
    objectId: session.checkout_session_id,
    after: { session, payment_intent: updatedIntent },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, checkout_session: session, payment_intent: updatedIntent }, { status: 201 });
}
