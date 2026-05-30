export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance'] as const;
type ApiPayload = Record<string, unknown>;
type LineItem = { description: string; qty: number; unit_price: number; amount: number };

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 30), 1), 100);
  const status = cleanText(request.nextUrl.searchParams.get('status'), 80);
  const supabase = createAdminClient();
  const query = supabase
    .from('quotation_customer_responses')
    .select('response_id,quotation_id,quotation_version,quotation_pdf_id,customer_id,response_type,response_status,quoted_total,quoted_pdf_storage_path,customer_message,internal_review_notes,reviewed_by,reviewed_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) query.eq('response_status', status);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_quote_responses_read', objectType: 'quotation_customer_responses', after: { count: data?.length ?? 0, status: status ?? 'all' }, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, responses: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const responseId = cleanText(body.response_id, 120);
  if (!isUuid(responseId)) return jsonError('Valid response_id is required.', 400);
  const supabase = createAdminClient();

  const { data: response, error: responseError } = await supabase
    .from('quotation_customer_responses')
    .select('response_id,quotation_id,quotation_version,quotation_pdf_id,customer_id,response_type,response_status,quoted_total,customer_message')
    .eq('response_id', responseId)
    .maybeSingle();
  if (responseError) return jsonError(responseError.message, 400);
  if (!response) return jsonError('Quotation customer response not found.', 404);

  if (action === 'review_quote_response' || action === 'resolve_quote_response') {
    const patch = {
      response_status: action === 'resolve_quote_response' ? 'resolved' : 'reviewed',
      internal_review_notes: cleanText(body.internal_review_notes, 1200),
      reviewed_by: auth.actor.profileId,
      reviewed_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('quotation_customer_responses')
      .update(patch)
      .eq('response_id', responseId)
      .select('response_id,quotation_id,response_type,response_status,internal_review_notes,reviewed_by,reviewed_at,created_at')
      .single();
    if (error) return jsonError(error.message, 400);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: `service_operations_${action}`, objectType: 'quotation_customer_response', objectId: responseId, before: response, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, response: data });
  }

  if (action === 'create_revised_quotation_version') {
    const parsed = parseLineItems(body.line_items);
    if (!parsed.ok) return jsonError(parsed.error, 400);
    const quotationId = response.quotation_id as string;
    const { data: existingVersions, error: versionError } = await supabase
      .from('quotation_versions')
      .select('version')
      .eq('quotation_id', quotationId)
      .order('version', { ascending: false })
      .limit(1);
    if (versionError) return jsonError(versionError.message, 400);
    const nextVersion = Number(existingVersions?.[0]?.version ?? 0) + 1;
    const revisionNotes = cleanText(body.internal_review_notes, 1200) || 'Revised quotation based on customer feedback.';

    const { data: version, error: insertError } = await supabase
      .from('quotation_versions')
      .insert({ quotation_id: quotationId, version: nextVersion, line_items: parsed.items, total: parsed.total, created_by: auth.actor.profileId, approval_log: { source: 'customer_revision_request', response_id: responseId, customer_message: response.customer_message, notes: revisionNotes } })
      .select('version_id,quotation_id,version,line_items,total,created_by,approval_log,created_at')
      .single();
    if (insertError) return jsonError(insertError.message, 400);

    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .update({ current_version: nextVersion, total: parsed.total, approval_status: 'revised_pending_customer', visible_to_customer: true, customer_visible_at: new Date().toISOString(), customer_visible_by: auth.actor.profileId, customer_visibility_notes: 'Revised quotation pushed for customer confirmation.' })
      .eq('quotation_id', quotationId)
      .select('quotation_id,job_id,current_version,total,approval_status,visible_to_customer,customer_visible_at,customer_visible_by,customer_visibility_notes,pdf_storage_path,public_ref,created_at')
      .single();
    if (quotationError) return jsonError(quotationError.message, 400);

    const { data: reviewedResponse, error: updateResponseError } = await supabase
      .from('quotation_customer_responses')
      .update({ response_status: 'resolved', internal_review_notes: revisionNotes, reviewed_by: auth.actor.profileId, reviewed_at: new Date().toISOString() })
      .eq('response_id', responseId)
      .select('response_id,quotation_id,response_type,response_status,internal_review_notes,reviewed_by,reviewed_at,created_at')
      .single();
    if (updateResponseError) return jsonError(updateResponseError.message, 400);

    const { data: task, error: taskError } = await supabase.from('unified_tasks').insert({
      source_module: 'service_operations',
      source_table: 'quotation_versions',
      source_id: version.version_id,
      title: 'Revised quotation pushed to customer',
      description: `Quotation ${quotationId} revised to version ${nextVersion} based on customer response ${responseId}.`,
      priority: 'P2',
      assignee_role: 'finance',
      status: 'open',
      metadata_json: { quotation_id: quotationId, response_id: responseId, version: nextVersion, total: parsed.total }
    }).select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at').single();
    if (taskError) return jsonError(taskError.message, 400);
    await supabase.from('task_events').insert({ task_id: task.task_id, action: 'revised_quotation_version_created', after_json: { quotation, version, response: reviewedResponse } }).throwOnError();
    await supabase.from('internal_inbox_messages').insert({
      recipient_role: 'finance',
      subject: 'Revised quotation pushed to customer',
      body: `Quotation ${quotationId} version ${nextVersion} is visible to customer for confirmation. Generate a new quotation PDF if required.`,
      category: 'quote_revision',
      priority: 'P2',
      related_object_type: 'quotation',
      related_object_id: quotationId,
      task_id: task.task_id
    }).throwOnError();
    if (response.customer_id) {
      await supabase.from('notification_outbox').insert({
        channel: 'internal',
        recipient_customer_id: response.customer_id,
        subject: 'NANOFIX revised quotation is ready',
        body: 'Your revised NANOFIX quotation is ready in Customer Portal. Please review and confirm.',
        payload_json: { quotation_id: quotationId, response_id: responseId, version: nextVersion, source: 'quote_revision' },
        delivery_status: 'queued',
        related_object_type: 'quotation',
        related_object_id: quotationId
      }).throwOnError();
    }

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_revised_quotation_version_create', objectType: 'quotation', objectId: quotationId, before: response, after: { quotation, version, response: reviewedResponse, task }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, quotation, version, response: reviewedResponse, task }, { status: 201 });
  }

  return jsonError('Unsupported quote response action.', 400);
}
