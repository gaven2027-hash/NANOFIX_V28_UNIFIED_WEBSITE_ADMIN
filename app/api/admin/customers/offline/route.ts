import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireAdminApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  return cleanText(value, 500) ?? fallback;
}

function money(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'support']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null) as { customer?: JsonRecord; order?: JsonRecord } | null;
  if (!body) return jsonError('Invalid JSON body.', 400);

  const customer = body.customer || {};
  const order = body.order || {};
  const name = text(customer.name);
  const phone = text(customer.phone);
  const email = text(customer.email).toLowerCase();
  const address = text(customer.address);
  const phoneCountryCode = text(customer.phone_country_code, '+65');
  const phoneLocalNumber = text(customer.phone_local_number);

  if (!name || !phone) return jsonError('Customer name and phone are required.', 400);

  const now = new Date().toISOString();
  const supabase = createAdminClient();

  const customerPayload = {
    name,
    phone,
    whatsapp: phone,
    email: email || null,
    address_json: address ? { full_address: address } : null,
    status: 'active',
    binding_status: 'linked',
    portal_status: 'unclaimed',
    created_source: 'admin_offline_entry',
    claim_phone: phone,
    claim_email: email || null,
    metadata_json: {
      phone_country_code: phoneCountryCode,
      phone_local_number: phoneLocalNumber,
      unclaimed_reason: 'customer_not_ready_to_register',
      created_by_flow: 'customer_center_add_offline_customer',
      created_by_actor_id: auth.actor.profileId,
      created_by_actor_role: auth.role,
      password_created_by_admin: false,
      customer_must_claim_with_otp_or_admin_verified_request: true
    },
    created_at: now,
    updated_at: now
  };

  let customerRow: JsonRecord | null = null;
  const { data: existingByPhone } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,portal_status,binding_status,created_source')
    .eq('phone', phone)
    .maybeSingle();

  if (existingByPhone?.customer_id) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        ...customerPayload,
        portal_status: existingByPhone.portal_status || 'unclaimed',
        updated_at: now
      })
      .eq('customer_id', existingByPhone.customer_id)
      .select('customer_id,name,phone,email,portal_status,binding_status,created_source')
      .single();
    if (error) return json({ ok: false, error: error.message, stage: 'update_customer' }, 500);
    customerRow = data as JsonRecord;
  } else {
    const { data, error } = await supabase
      .from('customers')
      .insert(customerPayload)
      .select('customer_id,name,phone,email,portal_status,binding_status,created_source')
      .single();
    if (error) return json({ ok: false, error: error.message, stage: 'insert_customer' }, 500);
    customerRow = data as JsonRecord;
  }

  if (!customerRow?.customer_id) return json({ ok: false, error: 'Customer row missing customer_id.', stage: 'customer_result' }, 500);

  const customerId = String(customerRow.customer_id);
  const serviceCategory = text(order.service_category, 'Offline Repair');
  const issueType = text(order.issue_type, 'Offline repair record');
  const serviceDate = text(order.service_date);
  const warrantyMonths = money(order.warranty_months);
  const amount = money(order.amount);
  const paymentStatus = text(order.payment_status, 'pending');
  const notes = text(order.notes);
  const descriptionParts = [serviceCategory, notes, amount ? `Amount SGD ${amount}` : '', warrantyMonths ? `Warranty months ${warrantyMonths}` : '', paymentStatus ? `Payment ${paymentStatus}` : ''].filter(Boolean);

  const serviceRequestPayload = {
    customer_id: customerId,
    issue_type: issueType,
    address_text: address || null,
    binding_status: 'linked',
    priority: 'P2',
    source_platform: 'admin_offline_entry',
    status: 'pending_review',
    contact_name: name,
    phone,
    whatsapp: phone,
    email: email || null,
    issue_description: descriptionParts.join(' | ') || 'Offline customer repair record',
    preferred_time_text: serviceDate || null,
    consent: true,
    admin_approval_required: false,
    request_origin: 'admin',
    portal_customer_notes: notes || null,
    portal_attachment_urls: [],
    created_at: now,
    updated_at: now
  };

  const { data: serviceRequest, error: serviceError } = await supabase
    .from('service_requests')
    .insert(serviceRequestPayload)
    .select('service_request_id,customer_id,issue_type,status,binding_status,created_at')
    .single();
  if (serviceError) return json({ ok: false, error: serviceError.message, stage: 'insert_service_request', customer_id: customerId }, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: existingByPhone?.customer_id ? 'offline_customer_updated' : 'offline_customer_created',
    objectType: 'customers',
    objectId: customerId,
    after: { customer_id: customerId, service_request_id: serviceRequest.service_request_id, portal_status: 'unclaimed', created_source: 'admin_offline_entry' },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({
    ok: true,
    message: 'Unclaimed Customer Profile created and linked to an offline service record. / 未认领客户档案已创建，并已关联后台代录维修记录。',
    customer_id: customerId,
    service_request_id: serviceRequest.service_request_id,
    portal_status: String(customerRow.portal_status || 'unclaimed'),
    customer: customerRow,
    service_request: serviceRequest
  });
}
