export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support'] as const;
type ApiPayload = Record<string, unknown>;
type ClaimRow = Record<string, unknown>;
type NotificationRule = {
  rule_id: string;
  title: string;
  zh: string;
  channel: 'internal' | 'customer_portal';
  severity: 'info' | 'amber' | 'red';
  enabled: boolean;
  predicate: (claim: ClaimRow) => boolean;
  subject: (claim: ClaimRow) => string;
  body: (claim: ClaimRow) => string;
};

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function ratingValue(value: unknown) {
  const rating = Number(value);
  return Number.isFinite(rating) ? rating : null;
}

function buildRules(): NotificationRule[] {
  return [
    {
      rule_id: 'WC-SAT-NOTIFY-001',
      title: 'Internal satisfaction confirmation notice',
      zh: '内部满意确认通知',
      channel: 'internal',
      severity: 'info',
      enabled: true,
      predicate: (claim) => ['satisfied', 'not_satisfied', 'reopened'].includes(text(claim.warranty_claim_customer_satisfaction_status)),
      subject: (claim) => `Warranty satisfaction confirmed: ${text(claim.warranty_claim_customer_satisfaction_status)}`,
      body: (claim) => text(claim.warranty_claim_customer_satisfaction_notes) || `Warranty claim ${text(claim.service_request_id)} satisfaction was confirmed.`
    },
    {
      rule_id: 'WC-SAT-NOTIFY-002',
      title: 'Not-satisfied internal red alert',
      zh: '不满意内部红色预警',
      channel: 'internal',
      severity: 'red',
      enabled: true,
      predicate: (claim) => text(claim.warranty_claim_customer_satisfaction_status) === 'not_satisfied',
      subject: () => 'Customer not satisfied with warranty repair result',
      body: (claim) => text(claim.warranty_claim_customer_satisfaction_notes) || 'Customer was not satisfied and requested follow-up.'
    },
    {
      rule_id: 'WC-SAT-NOTIFY-003',
      title: 'Customer confirmation receipt',
      zh: '客户确认回执',
      channel: 'customer_portal',
      severity: 'info',
      enabled: true,
      predicate: (claim) => ['satisfied', 'not_satisfied', 'reopened'].includes(text(claim.warranty_claim_customer_satisfaction_status)),
      subject: (claim) => text(claim.warranty_claim_customer_satisfaction_status) === 'satisfied' ? 'NANOFIX received your satisfaction confirmation' : 'NANOFIX received your follow-up request',
      body: (claim) => text(claim.warranty_claim_customer_satisfaction_status) === 'satisfied'
        ? 'Thank you. Your warranty repair satisfaction confirmation has been recorded.'
        : 'Thank you for your feedback. NANOFIX has recorded your follow-up request.'
    },
    {
      rule_id: 'WC-SAT-NOTIFY-004',
      title: 'Low rating internal amber alert',
      zh: '低评分内部黄色预警',
      channel: 'internal',
      severity: 'amber',
      enabled: true,
      predicate: (claim) => {
        const rating = ratingValue(claim.warranty_claim_customer_satisfaction_rating);
        return rating !== null && rating <= 2;
      },
      subject: (claim) => `Low warranty satisfaction rating: ${claim.warranty_claim_customer_satisfaction_rating}/5`,
      body: (claim) => text(claim.warranty_claim_customer_satisfaction_notes) || 'Warranty satisfaction rating is 1 or 2.'
    },
    {
      rule_id: 'WC-SAT-NOTIFY-005',
      title: 'Reopened warranty claim internal red alert',
      zh: '重新打开保修申请内部红色预警',
      channel: 'internal',
      severity: 'red',
      enabled: true,
      predicate: (claim) => text(claim.warranty_claim_customer_satisfaction_status) === 'reopened' || text(claim.warranty_claim_closure_status) === 'reopened',
      subject: () => 'Warranty claim reopened by customer feedback',
      body: (claim) => text(claim.warranty_claim_customer_reopen_reason) || text(claim.warranty_claim_customer_satisfaction_notes) || 'Customer feedback reopened this warranty claim.'
    },
    {
      rule_id: 'WC-SAT-NOTIFY-006',
      title: 'Follow-up resolved customer notice',
      zh: '跟进已解决客户通知',
      channel: 'customer_portal',
      severity: 'info',
      enabled: true,
      predicate: (claim) => text(claim.warranty_claim_routing_status) === 'follow_up_resolved',
      subject: () => 'NANOFIX updated your warranty claim follow-up',
      body: (claim) => text(claim.warranty_claim_next_action) || 'NANOFIX has updated the follow-up status for your warranty claim.'
    }
  ];
}

function publicRule(rule: NotificationRule) {
  return { rule_id: rule.rule_id, title: rule.title, zh: rule.zh, channel: rule.channel, severity: rule.severity, enabled: rule.enabled };
}

function notificationRow(rule: NotificationRule, claim: ClaimRow) {
  const customerId = text(claim.customer_id) || null;
  return {
    channel: rule.channel,
    recipient_role: rule.channel === 'internal' ? 'operations_admin' : null,
    recipient_customer_id: rule.channel === 'customer_portal' ? customerId : null,
    subject: rule.subject(claim),
    body: rule.body(claim),
    payload_json: {
      source: 'warranty_satisfaction_notification_rules',
      rule_id: rule.rule_id,
      severity: rule.severity,
      service_request_id: claim.service_request_id,
      satisfaction_status: claim.warranty_claim_customer_satisfaction_status,
      rating: claim.warranty_claim_customer_satisfaction_rating
    },
    delivery_status: 'queued',
    related_object_type: 'service_request',
    related_object_id: text(claim.service_request_id)
  };
}

async function loadClaims(serviceRequestId?: string | null) {
  const supabase = createAdminClient();
  let query = supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,status,priority,request_origin,customer_portal_request_type,warranty_claim_closure_status,warranty_claim_customer_satisfaction_status,warranty_claim_customer_satisfaction_rating,warranty_claim_customer_satisfaction_notes,warranty_claim_customer_confirmed_at,warranty_claim_customer_reopened_at,warranty_claim_customer_reopen_reason,warranty_claim_next_action,warranty_claim_routing_status,updated_at')
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .neq('warranty_claim_customer_satisfaction_status', 'pending')
    .order('warranty_claim_customer_confirmed_at', { ascending: false })
    .limit(80);
  if (serviceRequestId && isUuid(serviceRequestId)) query = query.eq('service_request_id', serviceRequestId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const serviceRequestId = cleanText(request.nextUrl.searchParams.get('service_request_id'), 120);
  const rules = buildRules();
  const claims = await loadClaims(serviceRequestId);
  const preview = claims.flatMap((claim) => rules.filter((rule) => rule.enabled && rule.predicate(claim)).map((rule) => ({ ...publicRule(rule), service_request_id: claim.service_request_id, customer_id: claim.customer_id, subject: rule.subject(claim), body: rule.body(claim) })));

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_warranty_satisfaction_notification_rules_read',
    objectType: 'notification_outbox',
    after: { rules: rules.length, claims: claims.length, preview: preview.length },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, rules: rules.map(publicRule), claims, preview });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const serviceRequestId = cleanText(body.service_request_id ?? body.serviceRequestId, 120);
  const dryRun = body.dry_run !== false;
  const ruleId = cleanText(body.rule_id ?? body.ruleId, 120);

  if (serviceRequestId && !isUuid(serviceRequestId)) return jsonError('Valid service_request_id is required when provided.', 400);

  const rules = buildRules().filter((rule) => !ruleId || rule.rule_id === ruleId);
  if (!rules.length) return jsonError('No matching notification rule found.', 400);

  const claims = await loadClaims(serviceRequestId);
  const rows = claims.flatMap((claim) => rules.filter((rule) => rule.enabled && rule.predicate(claim)).map((rule) => notificationRow(rule, claim)));

  if (!dryRun && rows.length) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('notification_outbox').insert(rows);
    if (error) return jsonError(error.message, 500);
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: dryRun ? 'service_operations_warranty_satisfaction_notification_rules_preview' : 'service_operations_warranty_satisfaction_notification_rules_apply',
    objectType: 'notification_outbox',
    objectId: serviceRequestId || undefined,
    after: { dry_run: dryRun, inserted: dryRun ? 0 : rows.length, matched: rows.length, rule_id: ruleId || null },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, dry_run: dryRun, matched: rows.length, inserted: dryRun ? 0 : rows.length, rows });
}
