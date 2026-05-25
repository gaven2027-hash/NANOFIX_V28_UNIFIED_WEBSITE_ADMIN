import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const paymentColumns = 'payment_id,invoice_id,customer_id,gateway,transaction_id,amount,currency,status,reconciled_at,created_at';
const invoiceColumns = 'invoice_id,invoice_no,quotation_id,customer_id,job_id,total_amount,currency,due_date,status,source_json,created_at';
const receiptColumns = 'receipt_id,receipt_no,payment_id,invoice_id,status,issued_at,created_at';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function receiptNo() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RCPT-${stamp}-${suffix}`;
}

function isUniqueConflict(error: { code?: string; message?: string } | null) {
  return error?.code === '23505' || /duplicate key|unique/i.test(error?.message || '');
}

async function findExistingReceipt(supabase: ReturnType<typeof createSupabaseAdminClient>, paymentId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('receipts')
    .select(receiptColumns)
    .eq('payment_id', paymentId)
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
  const action = typeof body.action === 'string' ? body.action.trim() : '';
  const paymentId = String(body.payment_id || '');

  if (action !== 'create_receipt') return jsonError('Unsupported action.', 400);
  if (!validUuid(paymentId)) return jsonError('A valid payment_id is required.');

  const { data: payment, error: paymentError } = await supabase.from('payments').select(paymentColumns).eq('payment_id', paymentId).maybeSingle();
  if (paymentError) return jsonError(paymentError.message, 500);
  if (!payment) return jsonError('Payment not found.', 404);

  const invoiceId = String(payment.invoice_id || '');
  let invoice: Payload | null = null;
  if (validUuid(invoiceId)) {
    const { data: invoiceData, error: invoiceError } = await supabase.from('invoices').select(invoiceColumns).eq('invoice_id', invoiceId).maybeSingle();
    if (invoiceError) return jsonError(invoiceError.message, 500);
    invoice = invoiceData as Payload | null;
  }

  const existing = await findExistingReceipt(supabase, paymentId);
  if (existing) {
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_receipt_from_payment', object_type: 'receipt', object_id: existing.receipt_id, after_data: { payment_id: paymentId, receipt_id: existing.receipt_id } });
    return NextResponse.json({ ok: true, receipt: existing, payment, invoice, existing: true });
  }

  const now = new Date().toISOString();
  const receiptPayload = {
    receipt_no: receiptNo(),
    payment_id: paymentId,
    invoice_id: validUuid(invoiceId) ? invoiceId : null,
    status: 'issued',
    issued_at: now
  };

  const { data: receipt, error: receiptError } = await supabase.from('receipts').insert(receiptPayload).select(receiptColumns).single();
  if (receiptError) {
    if (isUniqueConflict(receiptError)) {
      const concurrentExisting = await findExistingReceipt(supabase, paymentId);
      if (concurrentExisting) {
        await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_receipt_from_payment_conflict', object_type: 'receipt', object_id: concurrentExisting.receipt_id, after_data: { payment_id: paymentId, receipt_id: concurrentExisting.receipt_id } });
        return NextResponse.json({ ok: true, receipt: concurrentExisting, payment, invoice, existing: true, recovered_from_conflict: true });
      }
    }
    return jsonError(receiptError.message, 500);
  }

  const { data: updatedPayment } = await supabase
    .from('payments')
    .update({ status: 'succeeded', reconciled_at: now })
    .eq('payment_id', paymentId)
    .select(paymentColumns)
    .maybeSingle();

  let updatedInvoice: Payload | null = invoice;
  if (validUuid(invoiceId)) {
    const { data } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('invoice_id', invoiceId)
      .select(invoiceColumns)
      .maybeSingle();
    updatedInvoice = data as Payload | null;
  }

  await auditLog({
    actor_id: context?.actorId,
    actor_role: context?.role,
    action: 'create_receipt_from_payment',
    object_type: 'receipt',
    object_id: receipt.receipt_id,
    before_data: { payment, invoice },
    after_data: { receipt, payment: updatedPayment, invoice: updatedInvoice }
  });

  return NextResponse.json({ ok: true, receipt, payment: updatedPayment, invoice: updatedInvoice, existing: false });
}
