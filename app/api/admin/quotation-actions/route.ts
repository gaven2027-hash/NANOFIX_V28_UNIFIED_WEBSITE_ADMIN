import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const quotationColumns = 'quotation_id,service_request_id,customer_id,version,total_amount,currency,valid_until,status,approved_by,created_at,updated_at';
const invoiceColumns = 'invoice_id,invoice_no,quotation_id,customer_id,job_id,total_amount,currency,due_date,status,source_json,created_at';
const versionColumns = 'version_id,quotation_id,version,line_items,total,created_by,approval_log,created_at';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 8000) : fallback;
}

function dueDate(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function invoiceNo() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NF-${stamp}-${suffix}`;
}

function isUniqueConflict(error: { code?: string; message?: string } | null) {
  return error?.code === '23505' || /duplicate key|unique/i.test(error?.message || '');
}

async function findExistingInvoice(supabase: ReturnType<typeof createSupabaseAdminClient>, quotationId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('invoices')
    .select(invoiceColumns)
    .eq('quotation_id', quotationId)
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
  const quotationId = String(body.quotation_id || '');

  if (action !== 'create_invoice') return jsonError('Unsupported action.', 400);
  if (!validUuid(quotationId)) return jsonError('A valid quotation_id is required.');

  const { data: quotation, error: quotationError } = await supabase.from('quotations').select(quotationColumns).eq('quotation_id', quotationId).maybeSingle();
  if (quotationError) return jsonError(quotationError.message, 500);
  if (!quotation) return jsonError('Quotation not found.', 404);

  const existing = await findExistingInvoice(supabase, quotationId);
  if (existing) {
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_invoice_from_quotation', object_type: 'invoice', object_id: existing.invoice_id, after_data: { quotation_id: quotationId, invoice_id: existing.invoice_id } });
    return NextResponse.json({ ok: true, invoice: existing, existing: true });
  }

  const { data: latestVersion } = await supabase
    .from('quotation_versions')
    .select(versionColumns)
    .eq('quotation_id', quotationId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const totalAmount = Number(quotation.total_amount || latestVersion?.total || 0);
  const invoicePayload = {
    invoice_no: invoiceNo(),
    quotation_id: quotationId,
    customer_id: validUuid(quotation.customer_id) ? String(quotation.customer_id) : null,
    job_id: null,
    total_amount: Number.isFinite(totalAmount) ? totalAmount : 0,
    currency: cleanText(quotation.currency, 'SGD'),
    due_date: dueDate(7),
    status: 'draft',
    source_json: {
      source: 'quotation_conversion',
      quotation_id: quotationId,
      service_request_id: quotation.service_request_id || null,
      quotation_version: quotation.version || null,
      quotation_version_id: latestVersion?.version_id || null,
      line_items: latestVersion?.line_items || [],
      created_at: new Date().toISOString()
    }
  };

  const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert(invoicePayload).select(invoiceColumns).single();
  if (invoiceError) {
    if (isUniqueConflict(invoiceError)) {
      const concurrentExisting = await findExistingInvoice(supabase, quotationId);
      if (concurrentExisting) {
        await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_invoice_from_quotation_conflict', object_type: 'invoice', object_id: concurrentExisting.invoice_id, after_data: { quotation_id: quotationId, invoice_id: concurrentExisting.invoice_id } });
        return NextResponse.json({ ok: true, invoice: concurrentExisting, existing: true, recovered_from_conflict: true });
      }
    }
    return jsonError(invoiceError.message, 500);
  }

  const { data: updatedQuotation } = await supabase.from('quotations').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('quotation_id', quotationId).select(quotationColumns).maybeSingle();

  await auditLog({
    actor_id: context?.actorId,
    actor_role: context?.role,
    action: 'create_invoice_from_quotation',
    object_type: 'invoice',
    object_id: invoice.invoice_id,
    before_data: { quotation, quotation_version: latestVersion || null },
    after_data: { invoice, quotation: updatedQuotation }
  });

  return NextResponse.json({ ok: true, invoice, quotation: updatedQuotation, existing: false });
}
