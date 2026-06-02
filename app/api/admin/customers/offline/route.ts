import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
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

function actorFromRequest(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  return {
    hasBearer: auth.toLowerCase().startsWith('bearer '),
    tokenPreview: auth.toLowerCase().startsWith('bearer ') ? `${auth.slice(7, 15)}…` : null
  };
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return json({ ok: false, error: 'Supabase service role is not configured.' }, 503);

  const body = await request.json().catch(() => null) as { customer?: JsonRecord; order?: JsonRecord } | null;
  if (!body) return json({ ok: false, error: 'Invalid JSON body.' }, 400);

  const customer = body.customer || {};
  const order = body.order || {};
  const name = text(customer.name);
  const phone = text(customer.phone);
  const email = text(customer.email).toLowerCase();
  const address = text(customer.address);
  const phoneCountryCode = text(customer.phone_country_code, '+65');
  const phoneLocalNumber = text(customer.phone_local_number);

  if (!name || !phone) return json({ ok: false, error: 'Customer name and phone are required.' }, 400);

  const now = new Date().toISOString();
  const actor = actorFromRequest(request);

  const customerPayload = {
    name,
    phone,
    whatsapp: phone,
    email: email || null,
    address_text: address || null,
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
      actor_token_present: actor.hasBearer,
      actor_token_preview: actor.tokenPreview
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

  const customerId = String(customerRow.customer_id);
  const serviceCategory = text(order.service_category, 'Offline Repair');
  const issueType = text(order.issue_type, 'Offline repair record');
  const serviceDate = text(order.service_date);
  const warrantyMonths = money(order.warranty_months);
  const amount = money(order.amount);
  const paymentStatus = text(order.payment_status, 'pending');
  const notes = text(order.notes);

  const serviceRequestPayload = {
    customer_id: customerId,
    issue_type: issueType,
    service_category: serviceCategory,
    status: 'completed_offline_record',
    binding_status: 'linked',
    source: 'admin_offline_entry',
    preferred_date: serviceDate || null,
    address_text: address || null,
    customer_name: name,
    customer_phone: phone,
    customer_email: email || null,
    metadata_json: {
      portal_status: 'unclaimed',
      warranty_months: warrantyMonths,
      payment_status: paymentStatus,
      amount_sgd: amount,
      internal_notes: notes,
      created_by_flow: 'customer_center_add_offline_customer'
    },
    created_at: now,
    updated_at: now
  };

  const { data: serviceRequest, error: serviceError } = await supabase
    .from('service_requests')
    .insert(serviceRequestPayload)
    .select('service_request_id,customer_id,issue_type,status,binding_status,created_at')
    .single();
  if (serviceError) return json({ ok: false, error: serviceError.message, stage: 'insert_service_request', customer_id: customerId }, 500);

  await auditLog({
    actor_role: 'super_admin_or_internal_admin',
    action: existingByPhone?.customer_id ? 'offline_customer_updated' : 'offline_customer_created',
    object_type: 'customers',
    object_id: customerId,
    metadata: { customer_id: customerId, service_request_id: serviceRequest.service_request_id, portal_status: 'unclaimed', created_source: 'admin_offline_entry' }
  });

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
