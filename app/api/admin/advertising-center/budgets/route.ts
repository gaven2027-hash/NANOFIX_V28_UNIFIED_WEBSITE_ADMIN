import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { auditActor, isSuperAdmin, requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const campaignColumns = 'campaign_id,platform,campaign_name,daily_budget,monthly_budget,spend_amount,leads_count,revenue_amount,gross_profit_amount,status,approval_status';
const budgetColumns = 'budget_change_id,campaign_id,current_daily_budget,requested_daily_budget,current_monthly_budget,requested_monthly_budget,reason,status,requested_by,finance_reviewed_by,super_admin_approved_by,rejected_by,decision_note,created_at,updated_at,ad_campaigns(campaign_name,platform,spend_amount,leads_count,revenue_amount,gross_profit_amount)';
const statuses = ['submitted','finance_review','super_admin_review','approved','rejected','archived'];

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function cleanText(value: unknown, fallback = '', max = 2000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function num(value: unknown) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:advertising');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const { data: campaigns } = await supabase.from('ad_campaigns').select(campaignColumns).order('created_at', { ascending: false }).limit(120);
  const { data: requests, error } = await supabase.from('ad_budget_change_requests').select(budgetColumns).order('created_at', { ascending: false }).limit(120);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, campaigns: campaigns || [], budgetRequests: requests || [], statuses });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:advertising_strategy');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase || !context) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const campaignId = String(body.campaign_id || '');
  if (!validUuid(campaignId)) return jsonError('Valid campaign_id is required.');
  const payload = {
    campaign_id: campaignId,
    current_daily_budget: num(body.current_daily_budget),
    requested_daily_budget: num(body.requested_daily_budget),
    current_monthly_budget: num(body.current_monthly_budget),
    requested_monthly_budget: num(body.requested_monthly_budget),
    reason: cleanText(body.reason, '', 2000) || null,
    status: 'submitted',
    requested_by: context.actorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('ad_budget_change_requests').insert(payload).select(budgetColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ ...auditActor(context), action: 'create_ad_budget_strategy_request', object_type: 'ad_budget_change_request', object_id: data.budget_change_id, after_data: data });
  return NextResponse.json({ ok: true, budgetRequest: data });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'ad_budget.review');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase || !context) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const id = String(body.budget_change_id || '');
  const action = cleanText(body.action, '', 80);
  if (!validUuid(id)) return jsonError('Valid budget_change_id is required.');
  const { data: before } = await supabase.from('ad_budget_change_requests').select(budgetColumns).eq('budget_change_id', id).maybeSingle();
  if (!before) return jsonError('Budget request not found.', 404);
  let patch: Payload = { updated_at: new Date().toISOString(), decision_note: cleanText(body.decision_note, '', 2000) || null };
  if (action === 'finance_review') patch = { ...patch, status: 'finance_review', finance_reviewed_by: context.actorId };
  else if (action === 'send_to_super_admin') patch = { ...patch, status: 'super_admin_review', finance_reviewed_by: context.actorId };
  else if (action === 'reject') patch = { ...patch, status: 'rejected', rejected_by: context.actorId };
  else if (action === 'super_admin_approve') {
    if (!isSuperAdmin(context)) return jsonError('Only Super Admin can approve advertising budget changes.', 403);
    patch = { ...patch, status: 'approved', super_admin_approved_by: context.actorId };
  } else return jsonError('Unsupported budget action.');
  const { data, error } = await supabase.from('ad_budget_change_requests').update(patch).eq('budget_change_id', id).select(budgetColumns).single();
  if (error) return jsonError(error.message, 500);
  if (action === 'super_admin_approve') {
    await supabase.from('ad_campaigns').update({ daily_budget: data.requested_daily_budget, monthly_budget: data.requested_monthly_budget, updated_at: new Date().toISOString() }).eq('campaign_id', data.campaign_id);
  }
  await auditLog({ ...auditActor(context), action: `advertising_budget_${action}`, object_type: 'ad_budget_change_request', object_id: id, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, budgetRequest: data });
}
