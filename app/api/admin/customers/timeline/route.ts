import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireAdminApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;
type TimelineEvent = {
  event_id: string;
  event_type: string;
  title: string;
  description: string;
  happened_at: string;
  status?: string | null;
  source_table: string;
  source_id: string;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function dateValue(row: JsonRecord) {
  return str(row.created_at) || str(row.updated_at) || new Date(0).toISOString();
}

function event(table: string, row: JsonRecord, idKey: string, eventType: string, title: string, description: string): TimelineEvent {
  return {
    event_id: `${table}:${String(row[idKey])}`,
    event_type: eventType,
    title,
    description,
    happened_at: dateValue(row),
    status: str(row.status) || str(row.binding_status) || null,
    source_table: table,
    source_id: String(row[idKey])
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'support', 'finance']);
  if (!auth.ok) return auth.response;

  const customerId = cleanText(request.nextUrl.searchParams.get('customer_id'), 120);
  if (!customerId) return jsonError('customer_id is required.', 400);

  const supabase = createAdminClient();
  const events: TimelineEvent[] = [];

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,portal_status,binding_status,created_source,created_at,updated_at')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (customerError) return json({ ok: false, error: customerError.message, rows: [] }, 500);
  if (!customer?.customer_id) return jsonError('Customer not found.', 404);

  events.push(event('customers', customer as JsonRecord, 'customer_id', 'customer_profile', `Customer profile: ${str(customer.name, 'Unnamed Customer')}`, `Portal: ${str(customer.portal_status, '-')} · Binding: ${str(customer.binding_status, '-')}`));

  const [serviceRequests, quotations, invoices, payments, warranties, claims, links, audits] = await Promise.all([
    supabase.from('service_requests').select('service_request_id,issue_type,status,binding_status,source_platform,created_at,updated_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(80),
    supabase.from('quotations').select('quotation_id,quotation_no,status,total_amount,created_at,updated_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(80),
    supabase.from('invoices').select('invoice_id,invoice_no,status,total_amount,created_at,updated_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(80),
    supabase.from('payments').select('payment_id,status,amount,method,created_at,updated_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(80),
    supabase.from('warranties').select('warranty_id,status,warranty_no,start_date,end_date,created_at,updated_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(80),
    supabase.from('customer_account_claims').select('customer_account_claim_id,status,claim_method,claim_identifier,reviewed_at,created_at,updated_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(80),
    supabase.from('customer_record_links').select('customer_record_link_id,record_table,record_id,link_status,linked_at,created_at,updated_at,metadata_json').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(120),
    supabase.from('audit_logs').select('audit_log_id,action,object_type,object_id,created_at,metadata_json').or(`object_id.eq.${customerId},metadata_json->>customer_id.eq.${customerId}`).order('created_at', { ascending: false }).limit(120)
  ]);

  for (const row of ((serviceRequests.data || []) as JsonRecord[])) events.push(event('service_requests', row, 'service_request_id', 'service_request', `Service Request: ${str(row.issue_type, 'Repair Request')}`, `Source: ${str(row.source_platform, '-')} · Binding: ${str(row.binding_status, '-')}`));
  for (const row of ((quotations.data || []) as JsonRecord[])) events.push(event('quotations', row, 'quotation_id', 'quotation', `Quotation: ${str(row.quotation_no, String(row.quotation_id))}`, `Total: ${String(row.total_amount ?? '-')}`));
  for (const row of ((invoices.data || []) as JsonRecord[])) events.push(event('invoices', row, 'invoice_id', 'invoice', `Invoice: ${str(row.invoice_no, String(row.invoice_id))}`, `Total: ${String(row.total_amount ?? '-')}`));
  for (const row of ((payments.data || []) as JsonRecord[])) events.push(event('payments', row, 'payment_id', 'payment', `Payment: ${String(row.amount ?? '-')}`, `Method: ${str(row.method, '-')}`));
  for (const row of ((warranties.data || []) as JsonRecord[])) events.push(event('warranties', row, 'warranty_id', 'warranty', `Warranty: ${str(row.warranty_no, String(row.warranty_id))}`, `${str(row.start_date, '-')} → ${str(row.end_date, '-')}`));
  for (const row of ((claims.data || []) as JsonRecord[])) events.push(event('customer_account_claims', row, 'customer_account_claim_id', 'claim_existing_account', `Claim Existing Account: ${str(row.claim_method, '-')}`, `Identifier: ${str(row.claim_identifier, '-')}`));
  for (const row of ((links.data || []) as JsonRecord[])) events.push(event('customer_record_links', row, 'customer_record_link_id', 'record_link', `Record Link: ${str(row.record_table, '-')}`, `Record ID: ${str(row.record_id, '-')}`));
  for (const row of ((audits.data || []) as JsonRecord[])) events.push(event('audit_logs', row, 'audit_log_id', 'audit', `Audit: ${str(row.action, '-')}`, `${str(row.object_type, '-')} · ${str(row.object_id, '-')}`));

  const sorted = events.sort((a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime()).slice(0, 200);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_360_timeline_read',
    objectType: 'customers',
    objectId: customerId,
    after: { count: sorted.length },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, customer, rows: sorted });
}
