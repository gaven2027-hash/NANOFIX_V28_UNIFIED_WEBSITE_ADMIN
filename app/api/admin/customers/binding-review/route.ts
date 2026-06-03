import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireAdminApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

type Candidate = {
  customer_id: string;
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  portal_status: string | null;
  binding_status: string | null;
  score: number;
  reasons: string[];
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}

function normal(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function digits(value: unknown) {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function scoreCandidate(request: JsonRecord, customer: JsonRecord): Candidate | null {
  const reasons: string[] = [];
  let score = 0;
  const requestPhone = digits(request.phone) || digits(request.whatsapp);
  const requestEmail = normal(request.email);
  const requestName = normal(request.contact_name);
  const requestAddress = normal(request.address_text) || normal(request.property_address);
  const customerPhone = digits(customer.phone) || digits(customer.whatsapp) || digits(customer.claim_phone);
  const customerEmail = normal(customer.email) || normal(customer.claim_email);
  const customerName = normal(customer.name);
  const customerAddress = normal((customer.address_json as JsonRecord | null)?.full_address);

  if (requestPhone && customerPhone && requestPhone.slice(-8) === customerPhone.slice(-8)) {
    score += 50;
    reasons.push('Phone / WhatsApp match');
  }
  if (requestEmail && customerEmail && requestEmail === customerEmail) {
    score += 40;
    reasons.push('Email match');
  }
  if (requestName && customerName && (requestName === customerName || requestName.includes(customerName) || customerName.includes(requestName))) {
    score += 20;
    reasons.push('Name similarity');
  }
  if (requestAddress && customerAddress && (requestAddress.includes(customerAddress) || customerAddress.includes(requestAddress))) {
    score += 20;
    reasons.push('Address similarity');
  }
  if (!score) return null;

  return {
    customer_id: String(customer.customer_id),
    name: asString(customer.name),
    phone: asString(customer.phone),
    whatsapp: asString(customer.whatsapp),
    email: asString(customer.email),
    portal_status: asString(customer.portal_status),
    binding_status: asString(customer.binding_status),
    score,
    reasons
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'support', 'finance']);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data: requests, error: requestError } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,whatsapp,email,address_text,property_address,issue_type,source_platform,binding_status,status,created_at')
    .or('customer_id.is.null,binding_status.in.(pending,pending_review,manual_review,unclaimed)')
    .order('created_at', { ascending: false })
    .limit(80);

  if (requestError) return json({ ok: false, rows: [], error: requestError.message }, 500);

  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('customer_id,name,phone,whatsapp,email,portal_status,binding_status,claim_phone,claim_email,address_json,created_source,created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (customerError) return json({ ok: false, rows: [], error: customerError.message }, 500);

  const customerRows = (customers || []) as JsonRecord[];
  const rows = ((requests || []) as JsonRecord[]).map((serviceRequest) => {
    const candidates = customerRows
      .map((customer) => scoreCandidate(serviceRequest, customer))
      .filter((candidate): candidate is Candidate => Boolean(candidate))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return { ...serviceRequest, candidates };
  });

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_binding_review_read',
    objectType: 'service_requests',
    after: { count: rows.length },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, rows });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'support']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = cleanText(body.action, 40);
  const serviceRequestId = cleanText(body.service_request_id, 120);
  const customerId = cleanText(body.customer_id, 120);
  const note = cleanText(body.note, 1000);
  if (!serviceRequestId) return jsonError('service_request_id is required.', 400);
  if (!['link', 'manual_review', 'reject'].includes(action || '')) return jsonError('Action must be link, manual_review or reject.', 400);
  if (action === 'link' && !customerId) return jsonError('customer_id is required when linking.', 400);
  if (action === 'reject' && !note) return jsonError('Reject note is required for audit.', 400);

  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,binding_status,status,contact_name,phone,whatsapp,email,address_text')
    .eq('service_request_id', serviceRequestId)
    .maybeSingle();

  if (!before?.service_request_id) return jsonError('Service request not found.', 404);

  const now = new Date().toISOString();
  const patch = action === 'link'
    ? { customer_id: customerId, binding_status: 'linked', updated_at: now }
    : action === 'manual_review'
      ? { binding_status: 'manual_review', updated_at: now }
      : { customer_id: null, binding_status: 'rejected', updated_at: now };

  const { data: updated, error: updateError } = await supabase
    .from('service_requests')
    .update(patch)
    .eq('service_request_id', serviceRequestId)
    .select('service_request_id,customer_id,binding_status,status,updated_at')
    .single();

  if (updateError) return json({ ok: false, error: updateError.message }, 500);

  if (action === 'link' && customerId) {
    await supabase.from('customer_record_links').upsert({
      customer_id: customerId,
      record_table: 'service_requests',
      record_id: serviceRequestId,
      link_status: 'linked',
      linked_by: auth.actor.profileId,
      linked_at: now,
      metadata_json: { flow: 'customer_binding_review', note: note || null },
      updated_at: now
    }, { onConflict: 'record_table,record_id,customer_id' });
  }

  if (action === 'manual_review' && before.customer_id) {
    await supabase.from('customer_record_links').upsert({
      customer_id: before.customer_id,
      record_table: 'service_requests',
      record_id: serviceRequestId,
      link_status: 'manual_review',
      linked_by: auth.actor.profileId,
      linked_at: now,
      metadata_json: { flow: 'customer_binding_review', note: note || null },
      updated_at: now
    }, { onConflict: 'record_table,record_id,customer_id' });
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: action === 'link' ? 'customer_binding_linked' : action === 'reject' ? 'customer_binding_rejected' : 'customer_binding_manual_review',
    objectType: 'service_requests',
    objectId: serviceRequestId,
    before: before as JsonRecord,
    after: { updated, customer_id: customerId || null, note: note || null },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, action, service_request: updated });
}
