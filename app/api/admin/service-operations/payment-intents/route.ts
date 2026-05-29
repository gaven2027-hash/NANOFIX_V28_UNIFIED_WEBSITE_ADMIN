export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance'] as const;
const STATUS_VALUES = ['pending_invoice', 'pending_payment_link', 'ready', 'paid', 'cancelled', 'failed'] as const;
type StatusValue = typeof STATUS_VALUES[number];
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanStatus(value: unknown): StatusValue | null {
  const text = cleanText(value, 80) as StatusValue | null;
  return text && STATUS_VALUES.includes(text) ? text : null;
}

function cleanNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 20), 1), 80);
  const status = cleanStatus(request.nextUrl.searchParams.get('status'));
  const query = supabase
    .from('payment_intents')
    .select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,provider_external_id,payment_url,expires_at,metadata_json,created_by,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) query.eq('status', status);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_payment_intents_read',
    objectType: 'payment_intents',
    after: { count: data?.length ?? 0, status: status ?? 'all' },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, payment_intents: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const paymentIntentId = cleanText(body.payment_intent_id, 120);
  if (action !== 'update_payment_intent') return jsonError('Unsupported payment intent action.', 400);
  if (!isUuid(paymentIntentId)) return jsonError('Valid payment_intent_id is required.', 400);

  const status = cleanStatus(body.status);
  if (!status) return jsonError('Valid payment intent status is required.', 400);

  const invoiceId = cleanText(body.invoice_id, 120);
  const paymentUrl = cleanText(body.payment_url, 500);
  const provider = cleanText(body.provider, 120);
  const providerExternalId = cleanText(body.provider_external_id, 240);
  const amount = cleanNumber(body.amount);
  const expiresAt = cleanText(body.expires_at, 120);
  const notes = cleanText(body.notes, 1000);
  const metadata = body.metadata_json && typeof body.metadata_json === 'object' && !Array.isArray(body.metadata_json) ? body.metadata_json as Record<string, unknown> : {};

  if (invoiceId && !isUuid(invoiceId)) return jsonError('invoice_id must be a valid UUID when provided.', 400);
  if (status === 'ready' && !paymentUrl) return jsonError('payment_url is required when status is ready.', 400);

  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from('payment_intents')
    .select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,provider_external_id,payment_url,expires_at,metadata_json,created_at,updated_at')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    status,
    invoice_id: invoiceId || null,
    payment_url: paymentUrl,
    provider: provider ?? 'manual',
    provider_external_id: providerExternalId,
    expires_at: expiresAt || null,
    metadata_json: { ...(before?.metadata_json && typeof before.metadata_json === 'object' ? before.metadata_json as Record<string, unknown> : {}), ...metadata, finance_notes: notes, updated_by: auth.actor.profileId }
  };
  if (amount !== null) patch.amount = amount;

  const { data, error } = await supabase
    .from('payment_intents')
    .update(patch)
    .eq('payment_intent_id', paymentIntentId)
    .select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,provider_external_id,payment_url,expires_at,metadata_json,created_by,created_at,updated_at')
    .single();
  if (error) return jsonError(error.message, 400);

  if (invoiceId) {
    await supabase
      .from('invoices')
      .update({ payment_intent_id: paymentIntentId, payment_url: paymentUrl })
      .eq('invoice_id', invoiceId)
      .throwOnError();
  }

  await supabase.from('notification_outbox').insert({
    channel: 'internal',
    recipient_customer_id: data.customer_id,
    subject: status === 'ready' ? 'NANOFIX payment link is ready' : 'NANOFIX payment status updated',
    body: status === 'ready' ? 'Your NANOFIX payment link is ready in Customer Portal.' : `Your NANOFIX payment status is now ${status}.`,
    payload_json: { source: 'finance_payment_intent_update', payment_intent_id: data.payment_intent_id, invoice_id: data.invoice_id, payment_url: data.payment_url, provider_external_id: data.provider_external_id },
    delivery_status: 'queued',
    related_object_type: 'payment_intent',
    related_object_id: data.payment_intent_id
  }).throwOnError();

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_payment_intent_update',
    objectType: 'payment_intent',
    objectId: paymentIntentId,
    before,
    after: data,
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, action, payment_intent: data });
}
