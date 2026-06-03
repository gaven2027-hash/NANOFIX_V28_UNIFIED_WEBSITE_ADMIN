import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireAdminApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

type DuplicateGroup = {
  match_key: string;
  match_type: 'phone' | 'email';
  customers: JsonRecord[];
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

function groupDuplicates(customers: JsonRecord[]) {
  const groups = new Map<string, DuplicateGroup>();
  for (const customer of customers) {
    const phone = digits(customer.phone) || digits(customer.whatsapp) || digits(customer.claim_phone);
    const email = normal(customer.email) || normal(customer.claim_email);
    const keys: Array<{ key: string; type: 'phone' | 'email' }> = [];
    if (phone.length >= 8) keys.push({ key: `phone:${phone.slice(-8)}`, type: 'phone' });
    if (email) keys.push({ key: `email:${email}`, type: 'email' });
    for (const item of keys) {
      const group = groups.get(item.key) || { match_key: item.key, match_type: item.type, customers: [] };
      group.customers.push(customer);
      groups.set(item.key, group);
    }
  }
  return [...groups.values()]
    .filter((group) => group.customers.length > 1)
    .sort((a, b) => b.customers.length - a.customers.length)
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'support', 'finance']);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data: customers, error } = await supabase
    .from('customers')
    .select('customer_id,name,phone,whatsapp,email,portal_status,binding_status,claim_phone,claim_email,address_json,created_source,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) return json({ ok: false, rows: [], error: error.message }, 500);
  const rows = groupDuplicates((customers || []) as JsonRecord[]);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_merge_candidates_read',
    objectType: 'customers',
    after: { groups: rows.length },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, rows });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const primaryCustomerId = cleanText(body.primary_customer_id, 120);
  const duplicateCustomerIds = Array.isArray(body.duplicate_customer_ids) ? body.duplicate_customer_ids.map((value) => cleanText(value, 120)).filter(Boolean) as string[] : [];
  const note = cleanText(body.note, 1000);
  if (!primaryCustomerId) return jsonError('primary_customer_id is required.', 400);
  if (!duplicateCustomerIds.length) return jsonError('duplicate_customer_ids are required.', 400);
  if (duplicateCustomerIds.includes(primaryCustomerId)) return jsonError('Primary customer cannot be in duplicate list.', 400);
  if (!note) return jsonError('Merge note is required for audit.', 400);

  const supabase = createAdminClient();
  const { data: beforeCustomers } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,portal_status,binding_status,metadata_json')
    .in('customer_id', [primaryCustomerId, ...duplicateCustomerIds]);

  const now = new Date().toISOString();
  const tablesToUpdate = ['service_requests', 'quotations', 'invoices', 'payments', 'warranties'];
  const updateResults: Record<string, unknown> = {};

  for (const table of tablesToUpdate) {
    const { data: updatedRows, error } = await supabase
      .from(table)
      .update({ customer_id: primaryCustomerId, updated_at: now })
      .in('customer_id', duplicateCustomerIds)
      .select('customer_id');
    const count = Array.isArray(updatedRows) ? updatedRows.length : 0;
    updateResults[table] = error ? { ok: false, error: error.message } : { ok: true, count };
  }

  for (const duplicateId of duplicateCustomerIds) {
    await supabase.from('customer_record_links').upsert({
      customer_id: primaryCustomerId,
      record_table: 'customers',
      record_id: duplicateId,
      link_status: 'linked',
      linked_by: auth.actor.profileId,
      linked_at: now,
      metadata_json: { flow: 'customer_merge_center', merged_from_customer_id: duplicateId, note },
      updated_at: now
    }, { onConflict: 'record_table,record_id,customer_id' });
  }

  const { data: updatedDuplicates, error: duplicateError } = await supabase
    .from('customers')
    .update({
      status: 'archived',
      binding_status: 'merged',
      portal_status: 'archived',
      metadata_json: {
        merged_into_customer_id: primaryCustomerId,
        merged_at: now,
        merged_by: auth.actor.profileId,
        merge_note: note
      },
      updated_at: now
    })
    .in('customer_id', duplicateCustomerIds)
    .select('customer_id,status,binding_status,portal_status,updated_at');

  if (duplicateError) return json({ ok: false, error: duplicateError.message, stage: 'archive_duplicates', updateResults }, 500);

  const { data: updatedPrimary, error: primaryError } = await supabase
    .from('customers')
    .update({
      binding_status: 'linked',
      metadata_json: {
        last_merge_at: now,
        last_merge_by: auth.actor.profileId,
        merged_customer_ids: duplicateCustomerIds,
        merge_note: note
      },
      updated_at: now
    })
    .eq('customer_id', primaryCustomerId)
    .select('customer_id,name,phone,email,binding_status,portal_status,updated_at')
    .single();

  if (primaryError) return json({ ok: false, error: primaryError.message, stage: 'update_primary', updateResults }, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_records_merged',
    objectType: 'customers',
    objectId: primaryCustomerId,
    before: { customers: beforeCustomers || [] },
    after: { primary: updatedPrimary, duplicates: updatedDuplicates || [], updateResults, note },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, primary: updatedPrimary, duplicates: updatedDuplicates || [], updateResults });
}
