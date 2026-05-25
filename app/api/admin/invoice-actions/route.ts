import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const invoiceColumns = 'invoice_id,invoice_no,quotation_id,customer_id,job_id,total_amount,currency,due_date,status,source_json,created_at';
const paymentColumns = 'payment_id,invoice_id,customer_id,gateway,transaction_id,amount,currency,status,reconciled_at,created_at';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 8000) : fallback;
}

function transactionId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY-${stamp}-${suffix}`;
}

function isUniqueConflict(error: { code?: string; message?: string } | null) {
  return error?.code === '23505' || /duplicate key|unique/i.test(error?.message || '');
}

async function findExistingPayment(supabase: ReturnType<typeof createSupabaseAdminClient>, invoiceId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('payments')
    .select(paymentColumns)
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:finance');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = cleanText(body.action);
  const invoiceId = String(body.invoice_id || '');

  if (action !== 'create_payment') return jsonError('Unsupported action.', 400);
  if (!validUuid(invoiceId)) return jsonError('A valid invoice_id is required.');

  const { data: invoice, error: invoiceError } = await supabase.from('invoices').select(invoiceColumns).eq('invoice_id', invoiceId).maybeSingle();
  if (invoiceError) return jsonError(invoiceError.message, 500);
  if (!invoice) return jsonError('Invoice not found.', 404);

  const existing = await findExistingPayment(supabase, invoiceId);
  if (existing) {
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_payment_from_invoice', object_type: 'payment', object_id: existing.payment_id, after_data: { invoice_id: invoiceId, payment_id: existing.payment_id } });
    return NextResponse.json({ ok: true, payment: existing, existing: true });
  }

  const amount = Number(invoice.total_amount || 0);
  const paymentPayload = {
    invoice_id: invoiceId,
    customer_id: validUuid(invoice.customer_id) ? String(invoice.customer_id) : null,
    gateway: cleanText(body.gateway, 'manual'),
    transaction_id: cleanText(body.transaction_id) || transactionId(),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: cleanText(invoice.currency, 'SGD'),
    status: cleanText(body.status, 'pending'),
    reconciled_at: null
  };

  const { data: payment, error: paymentError } = await supabase.from('payments').insert(paymentPayload).select(paymentColumns).single();
  if (paymentError) {
    if (isUniqueConflict(paymentError)) {
      const concurrentExisting = await findExistingPayment(supabase, invoiceId);
      if (concurrentExisting) {
        await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_payment_from_invoice_conflict', object_type: 'payment', object_id: concurrentExisting.payment_id, after_data: { invoice_id: invoiceId, payment_id: concurrentExisting.payment_id } });
        return NextResponse.json({ ok: true, payment: concurrentExisting, existing: true, recovered_from_conflict: true });
      }
    }
    return jsonError(paymentError.message, 500);
  }

  const { data: updatedInvoice } = await supabase.from('invoices').update({ status: 'partially_paid' }).eq('invoice_id', invoiceId).select(invoiceColumns).maybeSingle();

  await auditLog({
    actor_id: context?.actorId,
    actor_role: context?.role,
    action: 'create_payment_from_invoice',
    object_type: 'payment',
    object_id: payment.payment_id,
    before_data: { invoice },
    after_data: { payment, invoice: updatedInvoice }
  });

  return NextResponse.json({ ok: true, payment, invoice: updatedInvoice, existing: false });
}
