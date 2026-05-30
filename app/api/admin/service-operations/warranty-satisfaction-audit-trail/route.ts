export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance'] as const;
type Row = Record<string, unknown>;
type EventRow = { event_time: string; event_type: string; title: string; actor: string; service_request_id: string; customer_id: string; status: string; rating: string; notes: string; source_table: string; source_id: string };

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function csvCell(value: unknown) {
  const raw = text(value).replace(/\r?\n/g, ' ');
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function makeCsv(rows: EventRow[]) {
  const headers = ['event_time','event_type','title','actor','service_request_id','customer_id','status','rating','notes','source_table','source_id'];
  return [headers.join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof EventRow])).join(','))].join('\n');
}

function addEvent(events: EventRow[], row: EventRow) {
  if (!row.event_time) return;
  events.push(row);
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const serviceRequestId = cleanText(request.nextUrl.searchParams.get('service_request_id'), 120);
  const format = cleanText(request.nextUrl.searchParams.get('format'), 20);
  if (serviceRequestId && !isUuid(serviceRequestId)) return jsonError('Valid service_request_id is required when provided.', 400);

  const supabase = createAdminClient();
  let claimQuery = supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,status,priority,request_origin,customer_portal_request_type,warranty_claim_closure_status,warranty_claim_customer_satisfaction_status,warranty_claim_customer_satisfaction_rating,warranty_claim_customer_satisfaction_notes,warranty_claim_customer_confirmed_at,warranty_claim_customer_reopened_at,warranty_claim_customer_reopen_reason,warranty_claim_next_action,warranty_claim_routing_status,created_at,updated_at')
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .neq('warranty_claim_customer_satisfaction_status', 'pending')
    .order('warranty_claim_customer_confirmed_at', { ascending: false })
    .limit(80);
  if (serviceRequestId) claimQuery = claimQuery.eq('service_request_id', serviceRequestId);
  const { data: claims, error: claimError } = await claimQuery;
  if (claimError) return jsonError(claimError.message, 500);

  const claimRows = claims ?? [];
  const ids = claimRows.map((claim) => text(claim.service_request_id)).filter(Boolean);
  let messages: Row[] = [];
  let notifications: Row[] = [];
  let transitions: Row[] = [];
  let audits: Row[] = [];

  if (ids.length) {
    const { data: msg, error: msgError } = await supabase
      .from('warranty_claim_messages')
      .select('message_id,service_request_id,customer_id,sender_profile_id,sender_type,sender_role,message_body,visible_to_customer,internal_only,created_at')
      .in('service_request_id', ids)
      .order('created_at', { ascending: false })
      .limit(200);
    if (msgError) return jsonError(msgError.message, 500);
    messages = msg ?? [];

    const { data: noti, error: notiError } = await supabase
      .from('notification_outbox')
      .select('notification_id,channel,recipient_role,recipient_customer_id,subject,body,delivery_status,related_object_type,related_object_id,payload_json,created_at')
      .eq('related_object_type', 'service_request')
      .in('related_object_id', ids)
      .order('created_at', { ascending: false })
      .limit(200);
    if (notiError) return jsonError(notiError.message, 500);
    notifications = noti ?? [];

    const { data: logs, error: logError } = await supabase
      .from('status_transition_logs')
      .select('log_id,object_type,object_id,from_status,to_status,actor_id,actor_role,reason,metadata_json,created_at')
      .eq('object_type', 'service_request')
      .in('object_id', ids)
      .order('created_at', { ascending: false })
      .limit(200);
    if (logError) return jsonError(logError.message, 500);
    transitions = logs ?? [];

    const { data: audit, error: auditError } = await supabase
      .from('audit_logs')
      .select('audit_id,actor_id,role,action,object_type,object_id,before_json,after_json,created_at')
      .eq('object_type', 'service_request')
      .in('object_id', ids)
      .order('created_at', { ascending: false })
      .limit(200);
    if (auditError) return jsonError(auditError.message, 500);
    audits = audit ?? [];
  }

  const events: EventRow[] = [];
  for (const claim of claimRows) {
    addEvent(events, { event_time: text(claim.warranty_claim_customer_confirmed_at), event_type: 'customer_satisfaction', title: 'Customer satisfaction confirmation', actor: 'customer', service_request_id: text(claim.service_request_id), customer_id: text(claim.customer_id), status: text(claim.warranty_claim_customer_satisfaction_status), rating: text(claim.warranty_claim_customer_satisfaction_rating), notes: text(claim.warranty_claim_customer_satisfaction_notes), source_table: 'service_requests', source_id: text(claim.service_request_id) });
    addEvent(events, { event_time: text(claim.warranty_claim_customer_reopened_at), event_type: 'customer_reopened', title: 'Customer requested follow-up', actor: 'customer', service_request_id: text(claim.service_request_id), customer_id: text(claim.customer_id), status: text(claim.warranty_claim_closure_status), rating: text(claim.warranty_claim_customer_satisfaction_rating), notes: text(claim.warranty_claim_customer_reopen_reason), source_table: 'service_requests', source_id: text(claim.service_request_id) });
  }
  for (const message of messages) addEvent(events, { event_time: text(message.created_at), event_type: 'message', title: text(message.message_body).slice(0, 120), actor: `${text(message.sender_type)}:${text(message.sender_role)}`, service_request_id: text(message.service_request_id), customer_id: text(message.customer_id), status: text(message.visible_to_customer) === 'true' ? 'customer_visible' : 'internal', rating: '', notes: text(message.message_body), source_table: 'warranty_claim_messages', source_id: text(message.message_id) });
  for (const n of notifications) addEvent(events, { event_time: text(n.created_at), event_type: 'notification', title: text(n.subject), actor: text(n.channel), service_request_id: text(n.related_object_id), customer_id: text(n.recipient_customer_id), status: text(n.delivery_status), rating: '', notes: text(n.body), source_table: 'notification_outbox', source_id: text(n.notification_id) });
  for (const tr of transitions) addEvent(events, { event_time: text(tr.created_at), event_type: 'status_transition', title: text(tr.reason), actor: text(tr.actor_role), service_request_id: text(tr.object_id), customer_id: '', status: `${text(tr.from_status)} -> ${text(tr.to_status)}`, rating: '', notes: JSON.stringify(tr.metadata_json ?? {}), source_table: 'status_transition_logs', source_id: text(tr.log_id) });
  for (const audit of audits) addEvent(events, { event_time: text(audit.created_at), event_type: 'audit_log', title: text(audit.action), actor: text(audit.role), service_request_id: text(audit.object_id), customer_id: '', status: text(audit.action), rating: '', notes: JSON.stringify(audit.after_json ?? {}), source_table: 'audit_logs', source_id: text(audit.audit_id) });

  events.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: format === 'csv' ? 'service_operations_warranty_satisfaction_audit_trail_export_csv' : 'service_operations_warranty_satisfaction_audit_trail_read',
    objectType: 'service_request',
    objectId: serviceRequestId || undefined,
    after: { claims: claimRows.length, events: events.length, format: format || 'json' },
    ip: getClientIp(request)
  }).catch(() => undefined);

  if (format === 'csv') {
    return new NextResponse(makeCsv(events), { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="nanofix-warranty-satisfaction-audit-${serviceRequestId || 'all'}.csv"` } });
  }

  return NextResponse.json({ ok: true, summary: { claims: claimRows.length, events: events.length, messages: messages.length, notifications: notifications.length, transitions: transitions.length, audit_logs: audits.length }, claims: claimRows, events });
}
