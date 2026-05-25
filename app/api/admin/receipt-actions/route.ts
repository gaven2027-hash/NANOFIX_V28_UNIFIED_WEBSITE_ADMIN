import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const receiptColumns = 'receipt_id,receipt_no,payment_id,invoice_id,status,issued_at,created_at';
const paymentColumns = 'payment_id,invoice_id,customer_id,gateway,transaction_id,amount,currency,status,reconciled_at,created_at';
const invoiceColumns = 'invoice_id,invoice_no,quotation_id,customer_id,job_id,total_amount,currency,due_date,status,source_json,created_at';
const warrantyColumns = 'warranty_id,receipt_id,payment_id,invoice_id,job_id,customer_id,coverage,starts_on,ends_on,status,source_json,created_at';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 8000) : fallback;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function plusYears(years = 1) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function isUniqueConflict(error: { code?: string; message?: string } | null) {
  return error?.code === '23505' || /duplicate key|unique/i.test(error?.message || '');
}

async function findExistingWarranty(supabase: ReturnType<typeof createSupabaseAdminClient>, receiptId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('warranties')
    .select(warrantyColumns)
    .eq('receipt_id', receiptId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:operations');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = cleanText(body.action);
  const receiptId = String(body.receipt_id || '');

  if (action !== 'create_warranty') return jsonError('Unsupported action.', 400);
  if (!validUuid(receiptId)) return jsonError('A valid receipt_id is required.');

  const { data: receipt, error: receiptError } = await supabase.from('receipts').select(receiptColumns).eq('receipt_id', receiptId).maybeSingle();
  if (receiptError) return jsonError(receiptError.message, 500);
  if (!receipt) return jsonError('Receipt not found.', 404);

  const existing = await findExistingWarranty(supabase, receiptId);
  if (existing) {
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_warranty_from_receipt', object_type: 'warranty', object_id: existing.warranty_id, after_data: { receipt_id: receiptId, warranty_id: existing.warranty_id } });
    return NextResponse.json({ ok: true, warranty: existing, existing: true });
  }

  let payment: Payload | null = null;
  let invoice: Payload | null = null;
  const paymentId = String(receipt.payment_id || '');
  const invoiceId = String(receipt.invoice_id || '');

  if (validUuid(paymentId)) {
    const { data, error } = await supabase.from('payments').select(paymentColumns).eq('payment_id', paymentId).maybeSingle();
    if (error) return jsonError(error.message, 500);
    payment = data as Payload | null;
  }
  if (validUuid(invoiceId)) {
    const { data, error } = await supabase.from('invoices').select(invoiceColumns).eq('invoice_id', invoiceId).maybeSingle();
    if (error) return jsonError(error.message, 500);
    invoice = data as Payload | null;
  }

  const customerId = validUuid(invoice?.customer_id) ? String(invoice?.customer_id) : validUuid(payment?.customer_id) ? String(payment?.customer_id) : null;
  const jobId = validUuid(invoice?.job_id) ? String(invoice?.job_id) : null;
  const warrantyPayload = {
    receipt_id: receiptId,
    payment_id: validUuid(paymentId) ? paymentId : null,
    invoice_id: validUuid(invoiceId) ? invoiceId : null,
    job_id: jobId,
    customer_id: customerId,
    coverage: cleanText(body.coverage) || 'Standard NANOFIX workmanship warranty based on approved service scope. / 按已确认施工范围提供标准 NANOFIX 施工保修。',
    starts_on: today(),
    ends_on: plusYears(1),
    status: 'active',
    source_json: {
      source: 'receipt_conversion',
      receipt_id: receiptId,
      receipt_no: receipt.receipt_no || null,
      payment_id: validUuid(paymentId) ? paymentId : null,
      invoice_id: validUuid(invoiceId) ? invoiceId : null,
      invoice_no: invoice?.invoice_no || null,
      created_at: new Date().toISOString()
    }
  };

  const { data: warranty, error: warrantyError } = await supabase.from('warranties').insert(warrantyPayload).select(warrantyColumns).single();
  if (warrantyError) {
    if (isUniqueConflict(warrantyError)) {
      const concurrentExisting = await findExistingWarranty(supabase, receiptId);
      if (concurrentExisting) {
        await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_warranty_from_receipt_conflict', object_type: 'warranty', object_id: concurrentExisting.warranty_id, after_data: { receipt_id: receiptId, warranty_id: concurrentExisting.warranty_id } });
        return NextResponse.json({ ok: true, warranty: concurrentExisting, existing: true, recovered_from_conflict: true });
      }
    }
    return jsonError(warrantyError.message, 500);
  }

  await auditLog({
    actor_id: context?.actorId,
    actor_role: context?.role,
    action: 'create_warranty_from_receipt',
    object_type: 'warranty',
    object_id: warranty.warranty_id,
    before_data: { receipt, payment, invoice },
    after_data: { warranty }
  });

  return NextResponse.json({ ok: true, warranty, receipt, payment, invoice, existing: false });
}
