export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance', 'engineer'] as const;

type ClaimRow = Record<string, unknown>;
type AlertRule = {
  rule_id: string;
  title: string;
  zh: string;
  severity: 'red' | 'amber' | 'blue';
  count: number;
  href: string;
  description: string;
};

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function countWhere(rows: ClaimRow[], predicate: (row: ClaimRow) => boolean) {
  return rows.filter(predicate).length;
}

function buildRules(rows: ClaimRow[]): AlertRule[] {
  const notSatisfied = countWhere(rows, (row) => row.warranty_claim_customer_satisfaction_status === 'not_satisfied');
  const reopened = countWhere(rows, (row) => row.warranty_claim_customer_satisfaction_status === 'reopened' || row.warranty_claim_closure_status === 'reopened');
  const lowRating = countWhere(rows, (row) => {
    const rating = numberValue(row.warranty_claim_customer_satisfaction_rating);
    return rating !== null && rating <= 2;
  });
  const p1FollowUp = countWhere(rows, (row) => row.priority === 'P1' && ['not_satisfied', 'reopened'].includes(String(row.warranty_claim_customer_satisfaction_status ?? '')));
  const unresolved = countWhere(rows, (row) => ['not_satisfied', 'reopened'].includes(String(row.warranty_claim_customer_satisfaction_status ?? '')) && row.warranty_claim_routing_status !== 'follow_up_resolved');

  return [
    { rule_id: 'WC-SAT-RED-001', title: 'Not-satisfied warranty feedback', zh: '保修维修不满意反馈', severity: notSatisfied > 0 ? 'red' : 'blue', count: notSatisfied, href: '/service-operations#warranty-claim-satisfaction-followup', description: 'Customer marked a completed warranty repair as not satisfactory. / 客户对已完成保修维修标记为不满意。' },
    { rule_id: 'WC-SAT-RED-002', title: 'Reopened warranty claims', zh: '客户重新打开的保修申请', severity: reopened > 0 ? 'red' : 'blue', count: reopened, href: '/service-operations#warranty-claim-satisfaction-followup', description: 'Customer feedback reopened the warranty claim for follow-up. / 客户反馈导致保修申请重新进入跟进。' },
    { rule_id: 'WC-SAT-AMB-003', title: 'Low satisfaction rating', zh: '低满意度评分', severity: lowRating > 0 ? 'amber' : 'blue', count: lowRating, href: '/service-operations#warranty-claim-satisfaction-followup', description: 'Warranty satisfaction rating is 1 or 2. / 保修满意度评分为 1 或 2。' },
    { rule_id: 'WC-SAT-RED-004', title: 'P1 satisfaction follow-up', zh: 'P1 满意度跟进', severity: p1FollowUp > 0 ? 'red' : 'blue', count: p1FollowUp, href: '/service-operations#warranty-claim-satisfaction-followup', description: 'Not-satisfied or reopened warranty claims are still priority P1. / 不满意或重新打开的保修申请仍为 P1。' },
    { rule_id: 'WC-SAT-AMB-005', title: 'Unresolved warranty follow-up', zh: '未解决的保修跟进', severity: unresolved > 0 ? 'amber' : 'blue', count: unresolved, href: '/service-operations#warranty-claim-satisfaction-followup', description: 'Follow-up is not yet marked as resolved. / 跟进尚未标记为已解决。' }
  ];
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,email,status,priority,request_origin,customer_portal_request_type,warranty_claim_closure_status,warranty_claim_completed_at,warranty_claim_closed_at,warranty_claim_customer_satisfaction_status,warranty_claim_customer_satisfaction_rating,warranty_claim_customer_satisfaction_notes,warranty_claim_customer_confirmed_at,warranty_claim_customer_reopened_at,warranty_claim_customer_reopen_reason,warranty_claim_next_action,warranty_claim_routing_status,updated_at')
    .eq('request_origin', 'customer_portal')
    .eq('customer_portal_request_type', 'warranty_repair')
    .neq('warranty_claim_customer_satisfaction_status', 'pending')
    .order('warranty_claim_customer_confirmed_at', { ascending: false })
    .limit(120);

  if (error) return jsonError(error.message, 500);
  const rows = data ?? [];
  const rules = buildRules(rows);
  const summary = {
    confirmed_total: rows.length,
    satisfied_total: countWhere(rows, (row) => row.warranty_claim_customer_satisfaction_status === 'satisfied'),
    not_satisfied_total: countWhere(rows, (row) => row.warranty_claim_customer_satisfaction_status === 'not_satisfied'),
    reopened_total: countWhere(rows, (row) => row.warranty_claim_customer_satisfaction_status === 'reopened' || row.warranty_claim_closure_status === 'reopened'),
    low_rating_total: countWhere(rows, (row) => {
      const rating = numberValue(row.warranty_claim_customer_satisfaction_rating);
      return rating !== null && rating <= 2;
    }),
    red_alert_total: rules.filter((rule) => rule.severity === 'red').reduce((sum, rule) => sum + rule.count, 0),
    amber_alert_total: rules.filter((rule) => rule.severity === 'amber').reduce((sum, rule) => sum + rule.count, 0)
  };

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'dashboard_warranty_satisfaction_alerts_read',
    objectType: 'service_request',
    after: { summary, rules: rules.length },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, summary, alert_rules: rules, claims: rows.slice(0, 20) });
}
