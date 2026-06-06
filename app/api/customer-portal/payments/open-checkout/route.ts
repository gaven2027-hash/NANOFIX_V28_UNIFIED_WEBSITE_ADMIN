export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_ROLES = ['customer'] as const;
type Row = Record<string, unknown>;
type AdminClient = ReturnType<typeof createAdminClient>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function idOf(row: Row | null | undefined, key: string) {
  const value = row?.[key];
  return typeof value === 'string' && value ? value : null;
}

function safePaymentUrl(url: string | null) {
  if (!url) return null;
  return /^https:\/\//i.test(url) ? url : null;
}

async function customerIdsForProfile(supabase: AdminClient, profileId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .limit(20);

  if (error) throw new Error(error.message);

  return new Set(
    (Array.isArray(data) ? data : [])
      .map((row) => idOf(row as Row, 'customer_id'))
      .filter((value): value is string => Boolean(value))
  );
}

async function serviceRequestCustomerId(supabase: AdminClient, serviceRequestId: string | null) {
  if (!serviceRequestId) return null;
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id')
    .eq('service_request_id', serviceRequestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return idOf(data as Row | null, 'customer_id');
}

async function jobCustomerId(supabase: AdminClient, jobId: string | null) {
  if (!jobId) return null;
  const { data, error } = await supabase
    .from('jobs')
    .select('job_id,service_request_id,customer_id')
    .eq('job_id', jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const job = data as Row | null;
  return idOf(job, 'customer_id') ?? await serviceRequestCustomerId(supabase, idOf(job, 'service_request_id'));
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...ALLOWED_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Row;
  const invoiceId = cleanText(body.invoice_id, 120);
  if (!isUuid(invoiceId)) return jsonError('Valid invoice_id is required.', 400);

  const supabase = createAdminClient();
  const customerIds = await customerIdsForProfile(supabase, auth.actor.profileId);
  if (!customerIds.size) return jsonError('No active customer profile is linked to this account.', 403);

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,payment_url,public_ref,created_at')
    .eq('invoice_id', invoiceId)
    .eq('visible_to_customer', true)
    .maybeSingle();

  if (invoiceError) return jsonError(invoiceError.message, 400);
  if (!invoice) return jsonError('Invoice not found or not visible to this customer.', 404);

  const invoiceRow = invoice as Row;
  const owner = await jobCustomerId(supabase, idOf(invoiceRow, 'job_id'));
  if (!owner || !customerIds.has(owner)) return jsonError('Invoice is not linked to your customer profile.', 404);

  let paymentUrl = safePaymentUrl(idOf(invoiceRow, 'payment_url'));
  let source = 'invoice.payment_url';

  if (!paymentUrl) {
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('payment_id,invoice_id,visible_to_customer,payment_url,created_at')
      .eq('invoice_id', invoiceId)
      .eq('visible_to_customer', true)
      .not('payment_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) return jsonError(paymentError.message, 400);
    paymentUrl = safePaymentUrl(idOf(payment as Row | null, 'payment_url'));
    source = 'payments.payment_url';
  }

  if (!paymentUrl) return jsonError('No secure customer-visible payment link is available for this invoice yet.', 404);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_payment_link_open',
    objectType: 'invoice',
    objectId: invoiceId,
    after: { invoice_id: invoiceId, source, invoice_status: invoiceRow.status },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, invoice_id: invoiceId, url: paymentUrl, source });
}
