export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance'] as const;
const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;

type ApiPayload = Record<string, unknown>;
type LineItem = { description: string; qty: number; unit_price: number; amount: number };

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanWarrantyYears(value: unknown) {
  const parsed = cleanNumber(value, 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 30);
}

function cleanDate(value: unknown) {
  const text = cleanText(value, 80);
  return text || null;
}

function cleanBoolean(value: unknown) {
  return value === true || value === 'true';
}

function financialVisibilityPayload(body: ApiPayload, actorId: string) {
  const visible = cleanBoolean(body.visible_to_customer);
  return {
    visible_to_customer: visible,
    customer_visible_at: visible ? new Date().toISOString() : null,
    customer_visible_by: visible ? actorId : null,
    customer_visibility_notes: cleanText(body.customer_visibility_notes, 1000),
    pdf_storage_path: cleanText(body.pdf_storage_path, 500),
    public_ref: cleanText(body.public_ref, 160)
  };
}

function parseLineItems(value: unknown): { ok: true; items: LineItem[]; total: number } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length === 0) return { ok: false, error: 'At least one line item is required.' };
  const items: LineItem[] = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { ok: false, error: `Line item ${index + 1} is invalid.` };
    const row = item as Record<string, unknown>;
    const description = cleanText(row.description, 240);
    const qty = cleanNumber(row.qty, NaN);
    const unitPrice = cleanNumber(row.unit_price, NaN);
    if (!description) return { ok: false, error: `Line item ${index + 1} description is required.` };
    if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: `Line item ${index + 1} qty must be greater than 0.` };
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return { ok: false, error: `Line item ${index + 1} unit_price must be 0 or greater.` };
    const amount = Number((qty * unitPrice).toFixed(2));
    items.push({ description, qty, unit_price: unitPrice, amount });
  }
  const total = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
  return { ok: true, items, total };
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const type = cleanText(request.nextUrl.searchParams.get('type'), 80);
  const id = cleanText(request.nextUrl.searchParams.get('id'), 120);
  if (!type || !isUuid(id)) return jsonError('type and valid id are required.', 400);

  const supabase = createAdminClient();
  let result: unknown = null;
  let errorMessage: string | null = null;

  if (type === 'quotation') {
    const { data, error } = await supabase
      .from('quotation_versions')
      .select('version_id,quotation_id,version,line_items,total,warranty_years,warranty_terms,created_by,approval_log,created_at')
      .eq('quotation_id', id)
      .order('version', { ascending: false })
      .limit(8);
    result = data ?? [];
    errorMessage = error?.message ?? null;
  } else if (type === 'invoice') {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('invoice_item_id,invoice_id,description,qty,unit_price,amount,created_at')
      .eq('invoice_id', id)
      .order('created_at', { ascending: false })
      .limit(30);
    result = data ?? [];
    errorMessage = error?.message ?? null;
  } else if (type === 'payment') {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('transaction_log_id,payment_id,provider,external_id,status,amount,payload,created_at')
      .eq('payment_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    result = data ?? [];
    errorMessage = error?.message ?? null;
  } else if (type === 'warranty') {
    const { data, error } = await supabase
      .from('warranties')
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,generated_at,terms_snapshot,metadata_json,created_at')
      .eq('warranty_id', id)
      .maybeSingle();
    result = data ?? null;
    errorMessage = error?.message ?? null;
  } else {
    return jsonError('Unsupported financial document type.', 400);
  }

  if (errorMessage) return jsonError(errorMessage, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_financial_document_read',
    objectType: type,
    objectId: id,
    after: { type, found: result !== null },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, type, id, result });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const supabase = createAdminClient();

  if (action === 'set_quotation_customer_visibility') {
    const quotationId = cleanText(body.quotation_id, 120);
    if (!isUuid(quotationId)) return jsonError('Valid quotation_id is required.', 400);
    const { data: before } = await supabase.from('quotations').select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,customer_visibility_notes,pdf_storage_path,public_ref,confirmed_warranty_years,warranty_terms,created_at').eq('quotation_id', quotationId).maybeSingle();
    const patch = financialVisibilityPayload(body, auth.actor.profileId);
    const { data, error } = await supabase
      .from('quotations')
      .update(patch)
      .eq('quotation_id', quotationId)
      .select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,customer_visible_at,customer_visible_by,customer_visibility_notes,pdf_storage_path,public_ref,confirmed_warranty_years,warranty_terms,created_at')
      .single();
    if (error) return jsonError(error.message, 400);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_quotation_customer_visibility_set', objectType: 'quotation', objectId: quotationId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, quotation: data });
  }

  if (action === 'set_invoice_customer_visibility') {
    const invoiceId = cleanText(body.invoice_id, 120);
    if (!isUuid(invoiceId)) return jsonError('Valid invoice_id is required.', 400);
    const { data: before } = await supabase.from('invoices').select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,customer_visibility_notes,pdf_storage_path,payment_url,public_ref,created_at').eq('invoice_id', invoiceId).maybeSingle();
    const patch = { ...financialVisibilityPayload(body, auth.actor.profileId), payment_url: cleanText(body.payment_url, 500) };
    const { data, error } = await supabase
      .from('invoices')
      .update(patch)
      .eq('invoice_id', invoiceId)
      .select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,customer_visible_at,customer_visible_by,customer_visibility_notes,pdf_storage_path,payment_url,public_ref,created_at')
      .single();
    if (error) return jsonError(error.message, 400);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_invoice_customer_visibility_set', objectType: 'invoice', objectId: invoiceId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, invoice: data });
  }

  if (action === 'set_payment_customer_visibility') {
    const paymentId = cleanText(body.payment_id, 120);
    if (!isUuid(paymentId)) return jsonError('Valid payment_id is required.', 400);
    const visible = cleanBoolean(body.visible_to_customer);
    const patch = { visible_to_customer: visible, payment_url: cleanText(body.payment_url, 500) };
    const { data: before } = await supabase.from('payments').select('payment_id,invoice_id,amount,status,fee,reconciled_at,payment_url,visible_to_customer,created_at').eq('payment_id', paymentId).maybeSingle();
    const { data, error } = await supabase
      .from('payments')
      .update(patch)
      .eq('payment_id', paymentId)
      .select('payment_id,invoice_id,amount,status,fee,reconciled_at,payment_url,visible_to_customer,created_at')
      .single();
    if (error) return jsonError(error.message, 400);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_payment_customer_visibility_set', objectType: 'payment', objectId: paymentId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, payment: data });
  }

  if (action === 'save_quotation_version') {
    const quotationId = cleanText(body.quotation_id, 120);
    if (!isUuid(quotationId)) return jsonError('Valid quotation_id is required.', 400);
    const parsed = parseLineItems(body.line_items);
    if (!parsed.ok) return jsonError(parsed.error, 400);
    const warrantyYears = cleanWarrantyYears(body.warranty_years ?? body.confirmed_warranty_years);
    const warrantyTerms = cleanText(body.warranty_terms, 1200) ?? 'NANOFIX warranty coverage is based on the confirmed quotation scope and completed repair works.';

    const { data: existingVersions, error: versionError } = await supabase
      .from('quotation_versions')
      .select('version')
      .eq('quotation_id', quotationId)
      .order('version', { ascending: false })
      .limit(1);
    if (versionError) return jsonError(versionError.message, 400);
    const nextVersion = Number(existingVersions?.[0]?.version ?? 0) + 1;

    const { data: version, error: insertError } = await supabase
      .from('quotation_versions')
      .insert({ quotation_id: quotationId, version: nextVersion, line_items: parsed.items, total: parsed.total, warranty_years: warrantyYears, warranty_terms: warrantyTerms, created_by: auth.actor.profileId, approval_log: { source: 'service_operations_financial_editor', warranty_years: warrantyYears } })
      .select('version_id,quotation_id,version,line_items,total,warranty_years,warranty_terms,created_by,approval_log,created_at')
      .single();
    if (insertError) return jsonError(insertError.message, 400);

    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .update({ current_version: nextVersion, total: parsed.total, approval_status: 'draft', confirmed_warranty_years: warrantyYears, warranty_terms: warrantyTerms, warranty_confirmed_by: auth.actor.profileId, warranty_confirmed_at: new Date().toISOString() })
      .eq('quotation_id', quotationId)
      .select('quotation_id,job_id,current_version,total,approval_status,confirmed_warranty_years,warranty_terms,warranty_confirmed_by,warranty_confirmed_at,visible_to_customer,pdf_storage_path,public_ref,created_at')
      .single();
    if (quotationError) return jsonError(quotationError.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_quotation_version_save', objectType: 'quotation', objectId: quotationId, after: { version, quotation }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, quotation, version }, { status: 201 });
  }

  if (action === 'save_invoice_items') {
    const invoiceId = cleanText(body.invoice_id, 120);
    if (!isUuid(invoiceId)) return jsonError('Valid invoice_id is required.', 400);
    const parsed = parseLineItems(body.line_items);
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
    if (deleteError) return jsonError(deleteError.message, 400);
    const rows = parsed.items.map((item) => ({ invoice_id: invoiceId, description: item.description, qty: item.qty, unit_price: item.unit_price }));
    const { data: items, error: itemError } = await supabase
      .from('invoice_items')
      .insert(rows)
      .select('invoice_item_id,invoice_id,description,qty,unit_price,amount,created_at');
    if (itemError) return jsonError(itemError.message, 400);

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .update({ total: parsed.total, status: cleanText(body.status, 80) ?? 'draft' })
      .eq('invoice_id', invoiceId)
      .select('invoice_id,invoice_no,job_id,total,status,visible_to_customer,pdf_storage_path,payment_url,public_ref,created_at')
      .single();
    if (invoiceError) return jsonError(invoiceError.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_invoice_items_save', objectType: 'invoice', objectId: invoiceId, after: { invoice, items }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, invoice, items }, { status: 201 });
  }

  if (action === 'reconcile_payment') {
    const paymentId = cleanText(body.payment_id, 120);
    if (!isUuid(paymentId)) return jsonError('Valid payment_id is required.', 400);
    const amount = cleanNumber(body.amount, NaN);
    if (!Number.isFinite(amount) || amount < 0) return jsonError('Valid amount is required.', 400);
    const fee = cleanNumber(body.fee, 0);
    const provider = cleanText(body.provider, 80) ?? 'manual';
    const externalId = cleanText(body.external_id, 160) ?? `manual-${Date.now()}`;
    const status = cleanText(body.status, 80) ?? 'reconciled';

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({ amount, fee, status, reconciled_at: new Date().toISOString(), payment_url: cleanText(body.payment_url, 500) })
      .eq('payment_id', paymentId)
      .select('payment_id,invoice_id,amount,status,fee,reconciled_at,payment_url,visible_to_customer,created_at')
      .single();
    if (paymentError) return jsonError(paymentError.message, 400);

    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({ payment_id: paymentId, provider, external_id: externalId, status, amount, payload: { source: 'service_operations_financial_editor', fee, payment_url: cleanText(body.payment_url, 500) } })
      .select('transaction_log_id,payment_id,provider,external_id,status,amount,payload,created_at')
      .single();
    if (transactionError) return jsonError(transactionError.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_payment_reconcile', objectType: 'payment', objectId: paymentId, after: { payment, transaction }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, payment, transaction }, { status: 201 });
  }

  if (action === 'issue_warranty') {
    const warrantyId = cleanText(body.warranty_id, 120);
    const jobId = cleanText(body.job_id, 120);
    if (warrantyId && !isUuid(warrantyId)) return jsonError('warranty_id must be a valid UUID when provided.', 400);
    if (!isUuid(jobId)) return jsonError('Valid job_id is required.', 400);
    const coverage = cleanText(body.coverage, 1000) ?? 'NANOFIX standard workmanship warranty.';
    const warrantyYears = cleanWarrantyYears(body.warranty_years);
    const startsAt = cleanDate(body.starts_at);
    const endsAt = cleanDate(body.ends_at);
    const status = cleanText(body.status, 80) ?? 'active';
    const payload = {
      job_id: jobId,
      customer_id: isUuid(cleanText(body.customer_id, 120)) ? cleanText(body.customer_id, 120) : null,
      coverage,
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      warranty_years: warrantyYears || null,
      source_quotation_id: isUuid(cleanText(body.source_quotation_id, 120)) ? cleanText(body.source_quotation_id, 120) : null,
      source_acceptance_id: isUuid(cleanText(body.source_acceptance_id, 120)) ? cleanText(body.source_acceptance_id, 120) : null,
      source_invoice_id: isUuid(cleanText(body.source_invoice_id, 120)) ? cleanText(body.source_invoice_id, 120) : null,
      auto_generated: false,
      generation_source: 'manual',
      generated_by: auth.actor.profileId,
      generated_at: new Date().toISOString(),
      terms_snapshot: cleanText(body.terms_snapshot, 1200) ?? coverage,
      metadata_json: { source: 'service_operations_financial_editor' }
    };

    const query = warrantyId
      ? supabase.from('warranties').update(payload).eq('warranty_id', warrantyId)
      : supabase.from('warranties').insert(payload);
    const { data: warranty, error: warrantyError } = await query
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,generated_at,terms_snapshot,metadata_json,created_at')
      .single();
    if (warrantyError) return jsonError(warrantyError.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_warranty_issue', objectType: 'warranty', objectId: warranty.warranty_id, after: warranty, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, warranty }, { status: warrantyId ? 200 : 201 });
  }

  return jsonError('Unsupported financial document action.', 400);
}
