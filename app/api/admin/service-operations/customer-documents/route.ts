export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance'] as const;
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanBoolean(value: unknown) {
  return value === true || value === 'true';
}

function cleanDate(value: unknown) {
  return cleanText(value, 80) || null;
}

async function findCustomers(search: string) {
  const supabase = createAdminClient();
  if (isUuid(search)) {
    const { data, error } = await supabase
      .from('customers')
      .select('customer_id,profile_id,name,phone,email,account_status,binding_status,created_at')
      .or(`customer_id.eq.${search},profile_id.eq.${search}`)
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const safe = search.replace(/[%,]/g, ' ').trim();
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id,profile_id,name,phone,email,account_status,binding_status,created_at')
    .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
    .limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function jobIdsForCustomers(customerIds: string[]) {
  const supabase = createAdminClient();
  if (!customerIds.length) return [];
  const { data, error } = await supabase.from('jobs').select('job_id').in('customer_id', customerIds).limit(300);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row) => row.job_id as string).filter(Boolean))];
}

async function loadDocuments(customerIds: string[], jobIds: string[]) {
  const supabase = createAdminClient();
  const [quotations, invoices, warranties, acceptances] = await Promise.all([
    jobIds.length ? supabase.from('quotations').select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,pdf_storage_path,public_ref,confirmed_warranty_years,warranty_terms,warranty_confirmed_at,created_at').in('job_id', jobIds).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    jobIds.length ? supabase.from('invoices').select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,pdf_storage_path,payment_url,public_ref,created_at').in('job_id', jobIds).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    customerIds.length ? supabase.from('warranties').select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,generated_at,terms_snapshot,metadata_json,created_at').in('customer_id', customerIds).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    customerIds.length ? supabase.from('quotation_acceptances').select('acceptance_id,quotation_id,job_id,customer_id,accepted_total,accepted_version,accepted_warranty_years,accepted_warranty_terms_snapshot,quotation_pdf_id,accepted_pdf_storage_path,acceptance_status,customer_note,customer_message,created_at').in('customer_id', customerIds).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null })
  ]);
  const errors = [quotations.error, invoices.error, warranties.error, acceptances.error].filter(Boolean).map((error) => error?.message ?? String(error));
  if (errors.length) throw new Error(errors.join('; '));
  return { quotations: quotations.data ?? [], invoices: invoices.data ?? [], warranties: warranties.data ?? [], acceptances: acceptances.data ?? [] };
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;
  const search = cleanText(request.nextUrl.searchParams.get('q') ?? request.nextUrl.searchParams.get('search'), 160);
  if (!search) return jsonError('Search query is required. Use customer ID, profile/account ID, phone, email or name.', 400);

  try {
    const customers = await findCustomers(search);
    const customerIds = customers.map((row) => row.customer_id as string).filter(Boolean);
    const jobIds = await jobIdsForCustomers(customerIds);
    const documents = await loadDocuments(customerIds, jobIds);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_customer_documents_search', objectType: 'customer_documents', after: { search, customer_count: customerIds.length, job_count: jobIds.length, counts: { quotations: documents.quotations.length, invoices: documents.invoices.length, warranties: documents.warranties.length, acceptances: documents.acceptances.length } }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, search, customers, job_ids: jobIds, ...documents });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const supabase = createAdminClient();

  if (action === 'update_customer_quotation') {
    const quotationId = cleanText(body.quotation_id, 120);
    if (!isUuid(quotationId)) return jsonError('Valid quotation_id is required.', 400);
    const total = cleanNumber(body.total, NaN);
    const patch: Record<string, unknown> = {
      approval_status: cleanText(body.approval_status, 80) || 'draft',
      confirmed_warranty_years: Math.min(Math.max(cleanNumber(body.confirmed_warranty_years ?? body.warranty_years, 0), 0), 30),
      warranty_terms: cleanText(body.warranty_terms, 1200),
      warranty_confirmed_by: auth.actor.profileId,
      warranty_confirmed_at: new Date().toISOString(),
      visible_to_customer: cleanBoolean(body.visible_to_customer),
      customer_visibility_notes: cleanText(body.customer_visibility_notes, 1000),
      pdf_storage_path: cleanText(body.pdf_storage_path, 500),
      public_ref: cleanText(body.public_ref, 160)
    };
    if (Number.isFinite(total)) patch.total = total;
    const { data: before } = await supabase.from('quotations').select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,confirmed_warranty_years,warranty_terms,pdf_storage_path,public_ref,created_at').eq('quotation_id', quotationId).maybeSingle();
    const { data, error } = await supabase.from('quotations').update(patch).eq('quotation_id', quotationId).select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,confirmed_warranty_years,warranty_terms,warranty_confirmed_at,pdf_storage_path,public_ref,created_at').single();
    if (error) return jsonError(error.message, 400);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_customer_quotation_update', objectType: 'quotation', objectId: quotationId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, quotation: data });
  }

  if (action === 'update_customer_invoice') {
    const invoiceId = cleanText(body.invoice_id, 120);
    if (!isUuid(invoiceId)) return jsonError('Valid invoice_id is required.', 400);
    const total = cleanNumber(body.total, NaN);
    const patch: Record<string, unknown> = {
      invoice_no: cleanText(body.invoice_no, 120),
      status: cleanText(body.status, 80) || 'draft',
      visible_to_customer: cleanBoolean(body.visible_to_customer),
      customer_visibility_notes: cleanText(body.customer_visibility_notes, 1000),
      pdf_storage_path: cleanText(body.pdf_storage_path, 500),
      payment_url: cleanText(body.payment_url, 500),
      public_ref: cleanText(body.public_ref, 160)
    };
    if (Number.isFinite(total)) patch.total = total;
    const { data: before } = await supabase.from('invoices').select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,pdf_storage_path,payment_url,public_ref,created_at').eq('invoice_id', invoiceId).maybeSingle();
    const { data, error } = await supabase.from('invoices').update(patch).eq('invoice_id', invoiceId).select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,pdf_storage_path,payment_url,public_ref,created_at').single();
    if (error) return jsonError(error.message, 400);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_customer_invoice_update', objectType: 'invoice', objectId: invoiceId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, invoice: data });
  }

  if (action === 'update_customer_warranty') {
    const warrantyId = cleanText(body.warranty_id, 120);
    if (!isUuid(warrantyId)) return jsonError('Valid warranty_id is required.', 400);
    const patch: Record<string, unknown> = {
      status: cleanText(body.status, 80) || 'active',
      coverage: cleanText(body.coverage, 1200),
      starts_at: cleanDate(body.starts_at),
      ends_at: cleanDate(body.ends_at),
      warranty_years: Math.min(Math.max(cleanNumber(body.warranty_years, 0), 0), 30),
      source_invoice_id: isUuid(cleanText(body.source_invoice_id, 120)) ? cleanText(body.source_invoice_id, 120) : null,
      terms_snapshot: cleanText(body.terms_snapshot, 1200),
      generation_source: 'admin_regenerated',
      generated_by: auth.actor.profileId,
      generated_at: new Date().toISOString()
    };
    const { data: before } = await supabase.from('warranties').select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,generated_at,terms_snapshot,created_at').eq('warranty_id', warrantyId).maybeSingle();
    const { data, error } = await supabase.from('warranties').update(patch).eq('warranty_id', warrantyId).select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,generated_at,terms_snapshot,created_at').single();
    if (error) return jsonError(error.message, 400);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_customer_warranty_update', objectType: 'warranty', objectId: warrantyId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, warranty: data });
  }

  return jsonError('Unsupported customer document control action.', 400);
}
