export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireWebhookSecret, cleanText } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';

function numeric(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function POST(request: NextRequest) {
  const webhookAuth = requireWebhookSecret(request, 'PAYMENT_WEBHOOK_SECRET');
  if (!webhookAuth.ok) return webhookAuth.response;

  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('reconcile_payment_webhook_tx', {
    p_provider: cleanText(body.provider, 80) ?? 'payment_gateway',
    p_event_type: cleanText(body.event_type, 120) ?? 'payment.updated',
    p_external_id: cleanText(body.transaction_id ?? body.id, 180),
    p_invoice_id: cleanText(body.invoice_id, 80),
    p_invoice_no: cleanText(body.invoice_no, 80),
    p_amount: numeric(body.amount),
    p_status: cleanText(body.status, 40) ?? 'processing',
    p_payload: body
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, reconciliation: data, data_loop: 'webhook_events -> payments -> payment_transactions -> invoices -> receipts -> audit_logs' });
}
