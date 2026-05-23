export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, ['customer', 'super_admin', 'operations_admin', 'support']);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('customer_id,name,phone,whatsapp,email,binding_status,created_at')
    .eq('profile_id', auth.actor.profileId)
    .order('created_at', { ascending: false });

  if (customerError) return NextResponse.json({ ok: false, error: customerError.message }, { status: 500 });

  const customerIds = (customers ?? []).map((item) => item.customer_id);
  if (customerIds.length === 0) {
    return NextResponse.json({ ok: true, customers: [], service_requests: [], quotations: [], invoices: [], payments: [], warranties: [], data_loop: 'profile_id -> customers -> linked operations' });
  }

  const [serviceRequests, invoices, warranties] = await Promise.all([
    supabase.from('service_requests').select('service_request_id,customer_id,issue_type,binding_status,status,created_at,updated_at').in('customer_id', customerIds).order('created_at', { ascending: false }).limit(50),
    supabase.from('invoices').select('invoice_id,invoice_no,customer_id,job_id,total,status,due_date,created_at').in('customer_id', customerIds).order('created_at', { ascending: false }).limit(50),
    supabase.from('warranties').select('warranty_id,job_id,customer_id,starts_at,ends_at,coverage,status,created_at').in('customer_id', customerIds).order('created_at', { ascending: false }).limit(50)
  ]);

  const invoiceIds = (invoices.data ?? []).map((item) => item.invoice_id);
  const payments = invoiceIds.length > 0
    ? await supabase.from('payments').select('payment_id,invoice_id,gateway,transaction_id,amount,fee,status,reconciled_at,created_at').in('invoice_id', invoiceIds).order('created_at', { ascending: false }).limit(50)
    : { data: [], error: null };

  const serviceRequestIds = (serviceRequests.data ?? []).map((item) => item.service_request_id);
  const quotations = serviceRequestIds.length > 0
    ? await supabase.from('quotations').select('quotation_id,service_request_id,total,valid_until,approval_status,created_at').in('service_request_id', serviceRequestIds).order('created_at', { ascending: false }).limit(50)
    : { data: [], error: null };

  const firstError = serviceRequests.error ?? invoices.error ?? warranties.error ?? payments.error ?? quotations.error;
  if (firstError) return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    customers,
    service_requests: serviceRequests.data,
    quotations: quotations.data,
    invoices: invoices.data,
    payments: payments.data,
    warranties: warranties.data,
    data_loop: 'profile_id -> customers -> service_requests/quotations/invoices/payments/warranties'
  });
}
