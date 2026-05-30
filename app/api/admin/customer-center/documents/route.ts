export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance'] as const;
type ApiPayload = Record<string, unknown>;

type CustomerRow = { customer_id: string; profile_id?: string | null; name?: string | null; phone?: string | null; email?: string | null };

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanNumber(value: unknown, fallback: number | null = null) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function findCustomers(query: string) {
  const supabase = createAdminClient();
  const text = query.trim();
  if (!text) return [] as CustomerRow[];
  if (isUuid(text)) {
    const { data, error } = await supabase
      .from('customers')
      .select('customer_id,profile_id,name,phone,email,account_status,binding_status,created_at')
      .or(`customer_id.eq.${text},profile_id.eq.${text}`)
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []) as CustomerRow[];
  }
  const escaped = text.replace(/[%_]/g, '');
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id,profile_id,name,phone,email,account_status,binding_status,created_at')
    .or(`name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`)
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerRow[];
}

async function customerDocuments(customerIds: string[]) {
  const supabase = createAdminClient();
  if (!customerIds.length) return { jobs: [], quotations: [], invoices: [], warranties: [] };
  const { data: jobs, error: jobError } = await supabase
    .from('jobs')
    .select('job_id,service_request_id,customer_id,status,scheduled_at,confirmed_warranty_years,confirmed_warranty_terms,repair_completed_at,warranty_generated_at,created_at,updated_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(100);
  if (jobError) throw new Error(jobError.message);
  const jobIds = [...new Set((jobs ?? []).map((row) => row.job_id as string).filter(Boolean))];

  const [quotationsResult, invoicesResult, warrantiesResult] = await Promise.all([
    jobIds.length ? supabase.from('quotations').select('quotation_id,job_id,current_version,total,approval_status,warranty_years,warranty_terms,visible_to_customer,pdf_storage_path,public_ref,created_at').in('job_id', jobIds).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    supabase.from('invoices').select('invoice_id,invoice_no,job_id,customer_id,quotation_id,total,status,visible_to_customer,pdf_storage_path,payment_url,public_ref,created_at').in('customer_id', customerIds).order('created_at', { ascending: false }).limit(100),
    supabase.from('warranties').select('warranty_id,warranty_no,job_id,customer_id,quotation_id,invoice_id,status,coverage,warranty_years,warranty_terms,starts_at,ends_at,generated_from,visible_to_customer,pdf_storage_path,created_at').in('customer_id', customerIds).order('created_at', { ascending: false }).limit(100)
  ]);
  if (quotationsResult.error) throw new Error(quotationsResult.error.message);
  if (invoicesResult.error) throw new Error(invoicesResult.error.message);
  if (warrantiesResult.error) throw new Error(warrantiesResult.error.message);
  return { jobs: jobs ?? [], quotations: quotationsResult.data ?? [], invoices: invoicesResult.data ?? [], warranties: warrantiesResult.data ?? [] };
}

function cleanPatch(type: string, body: ApiPayload, actorId: string) {
  if (type === 'quotation') {
    const patch: Record<string, unknown> = {};
    if ('total' in body) patch.total = cleanNumber(body.total, 0);
    if ('approval_status' in body) patch.approval_status = cleanText(body.approval_status, 80);
    if ('warranty_years' in body) patch.warranty_years = cleanNumber(body.warranty_years, null);
    if ('warranty_terms' in body) patch.warranty_terms = cleanText(body.warranty_terms, 1200);
    if ('visible_to_customer' in body) {
      const visible = body.visible_to_customer === true;
      patch.visible_to_customer = visible;
      patch.customer_visible_at = visible ? new Date().toISOString() : null;
      patch.customer_visible_by = visible ? actorId : null;
    }
    if ('pdf_storage_path' in body) patch.pdf_storage_path = cleanText(body.pdf_storage_path, 700);
    if ('public_ref' in body) patch.public_ref = cleanText(body.public_ref, 160);
    return patch;
  }
  if (type === 'invoice') {
    const patch: Record<string, unknown> = {};
    if ('invoice_no' in body) patch.invoice_no = cleanText(body.invoice_no, 120);
    if ('total' in body) patch.total = cleanNumber(body.total, 0);
    if ('status' in body) patch.status = cleanText(body.status, 80);
    if ('payment_url' in body) patch.payment_url = cleanText(body.payment_url, 700);
    if ('visible_to_customer' in body) {
      const visible = body.visible_to_customer === true;
      patch.visible_to_customer = visible;
      patch.customer_visible_at = visible ? new Date().toISOString() : null;
      patch.customer_visible_by = visible ? actorId : null;
    }
    if ('pdf_storage_path' in body) patch.pdf_storage_path = cleanText(body.pdf_storage_path, 700);
    if ('public_ref' in body) patch.public_ref = cleanText(body.public_ref, 160);
    return patch;
  }
  if (type === 'warranty') {
    const patch: Record<string, unknown> = {};
    if ('warranty_no' in body) patch.warranty_no = cleanText(body.warranty_no, 120);
    if ('status' in body) patch.status = cleanText(body.status, 80);
    if ('coverage' in body) patch.coverage = cleanText(body.coverage, 1200);
    if ('warranty_years' in body) patch.warranty_years = cleanNumber(body.warranty_years, null);
    if ('warranty_terms' in body) patch.warranty_terms = cleanText(body.warranty_terms, 1200);
    if ('starts_at' in body) patch.starts_at = cleanText(body.starts_at, 80);
    if ('ends_at' in body) patch.ends_at = cleanText(body.ends_at, 80);
    if ('visible_to_customer' in body) {
      const visible = body.visible_to_customer === true;
      patch.visible_to_customer = visible;
      patch.customer_visible_at = visible ? new Date().toISOString() : null;
      patch.customer_visible_by = visible ? actorId : null;
    }
    if ('pdf_storage_path' in body) patch.pdf_storage_path = cleanText(body.pdf_storage_path, 700);
    return patch;
  }
  return {};
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;
  const query = cleanText(request.nextUrl.searchParams.get('q'), 180);
  if (!query) return jsonError('q is required. Search by customer ID, account/profile ID, phone, email or name.', 400);
  try {
    const customers = await findCustomers(query);
    const customerIds = customers.map((customer) => customer.customer_id).filter(Boolean);
    const documents = await customerDocuments(customerIds);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'admin_customer_documents_lookup', objectType: 'customer_documents', after: { query, customer_count: customers.length, counts: { jobs: documents.jobs.length, quotations: documents.quotations.length, invoices: documents.invoices.length, warranties: documents.warranties.length } }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, query, customers, ...documents });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as ApiPayload;
  const type = cleanText(body.type, 80);
  const id = cleanText(body.id, 120);
  if (!['quotation', 'invoice', 'warranty'].includes(type ?? '')) return jsonError('type must be quotation, invoice or warranty.', 400);
  if (!isUuid(id)) return jsonError('Valid id is required.', 400);
  const table = type === 'quotation' ? 'quotations' : type === 'invoice' ? 'invoices' : 'warranties';
  const idColumn = type === 'quotation' ? 'quotation_id' : type === 'invoice' ? 'invoice_id' : 'warranty_id';
  const patch = cleanPatch(type as string, body, auth.actor.profileId);
  if (!Object.keys(patch).length) return jsonError('No supported fields to update.', 400);
  const supabase = createAdminClient();
  const { data: before } = await supabase.from(table).select('*').eq(idColumn, id).maybeSingle();
  const { data, error } = await supabase.from(table).update(patch).eq(idColumn, id).select('*').single();
  if (error) return jsonError(error.message, 400);
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'admin_customer_document_update', objectType: type as string, objectId: id, before: before as Record<string, unknown> | null, after: data as Record<string, unknown>, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, type, id, record: data });
}
