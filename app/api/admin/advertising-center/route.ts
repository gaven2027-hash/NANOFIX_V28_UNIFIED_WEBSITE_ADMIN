import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { auditActor, isSuperAdmin, requireAdmin } from '@/lib/nanofix/auth';
import { sampleAdCampaignRows } from '@/lib/nanofix/advertising-center';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const campaignColumns = 'campaign_id,platform,campaign_name,service_category,status,approval_status,daily_budget,monthly_budget,spend_amount,leads_count,bookings_count,quotations_count,jobs_count,revenue_amount,gross_profit_amount,landing_page_url,utm_source,utm_medium,utm_campaign,headline,primary_text,owner_id,created_by,approved_by,created_at,updated_at';
const suggestionColumns = 'suggestion_id,campaign_id,suggestion_type,title,summary,editable_text,status,created_by,created_at,updated_at';
const platforms = ['google_ads','ga4','google_business_profile','meta_ads','tiktok_ads','youtube_ads','xiaohongshu','manual_import'];
const statuses = ['draft','pending_review','approved','active','paused','rejected','archived'];
const approvalStatuses = ['draft','submitted','finance_review','super_admin_review','approved','rejected'];

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function cleanText(value: unknown, fallback = '', max = 2000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function oneOf(value: unknown, allowed: string[], fallback: string) { const next = cleanText(value, fallback, 120); return allowed.includes(next) ? next : fallback; }
function num(value: unknown) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function sampleRows() {
  return sampleAdCampaignRows.map((row, index) => ({
    campaign_id: `sample-${index + 1}`,
    platform: String(row.platform).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    campaign_name: row.campaign,
    service_category: row.service,
    status: row.status,
    approval_status: row.status,
    spend_amount: row.spend,
    leads_count: row.leads,
    bookings_count: row.bookings,
    revenue_amount: row.revenue,
    gross_profit_amount: row.revenue,
    sample: true
  }));
}

export async function GET(request: Request) {
  const { context, response } = requireAdmin(request, 'read:advertising');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: true, campaigns: sampleRows(), suggestions: [], context, super_admin_full_access: isSuperAdmin(context), fallback: 'supabase_not_configured' });
  const { data: campaigns, error } = await supabase.from('ad_campaigns').select(campaignColumns).order('created_at', { ascending: false }).limit(100);
  if (error) {
    return NextResponse.json({ ok: true, campaigns: sampleRows(), suggestions: [], context, super_admin_full_access: isSuperAdmin(context), fallback: 'ad_tables_not_ready', table_error: error.message });
  }
  const { data: suggestions } = await supabase.from('ad_ai_suggestions').select(suggestionColumns).order('created_at', { ascending: false }).limit(20);
  return NextResponse.json({ ok: true, campaigns: campaigns || [], suggestions: suggestions || [], context, super_admin_full_access: isSuperAdmin(context), fallback: null });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'ad_campaign.draft');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase || !context) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = cleanText(body.action, 'create_campaign', 80);
  if (action !== 'create_campaign') return jsonError('Unsupported advertising action.');
  const payload = {
    platform: oneOf(body.platform, platforms, 'manual_import'),
    campaign_name: cleanText(body.campaign_name, 'Untitled Campaign', 240),
    service_category: cleanText(body.service_category, 'General', 180),
    status: oneOf(body.status, statuses, 'draft'),
    approval_status: oneOf(body.approval_status, approvalStatuses, 'draft'),
    daily_budget: num(body.daily_budget),
    monthly_budget: num(body.monthly_budget),
    spend_amount: 0,
    leads_count: 0,
    bookings_count: 0,
    quotations_count: 0,
    jobs_count: 0,
    revenue_amount: 0,
    gross_profit_amount: 0,
    landing_page_url: cleanText(body.landing_page_url, '', 1000) || null,
    utm_source: cleanText(body.platform, '', 120) || null,
    utm_medium: 'paid',
    utm_campaign: cleanText(body.utm_campaign || body.campaign_name, '', 240) || null,
    headline: cleanText(body.headline, '', 240) || null,
    primary_text: cleanText(body.primary_text, '', 2000) || null,
    owner_id: context.actorId,
    created_by: context.actorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('ad_campaigns').insert(payload).select(campaignColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ ...auditActor(context), action: 'create_ad_campaign_draft', object_type: 'ad_campaign', object_id: data.campaign_id, after_data: data });
  return NextResponse.json({ ok: true, campaign: data });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:advertising_strategy');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase || !context) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const campaignId = String(body.campaign_id || '');
  const action = cleanText(body.action, '', 80);
  if (!validUuid(campaignId)) return jsonError('Valid campaign_id is required.');
  const { data: before } = await supabase.from('ad_campaigns').select(campaignColumns).eq('campaign_id', campaignId).maybeSingle();
  if (!before) return jsonError('Campaign not found.', 404);
  let patch: Payload;
  if (action === 'submit_for_review') patch = { approval_status: 'submitted', status: 'pending_review', updated_at: new Date().toISOString() };
  else if (action === 'super_admin_approve') {
    if (!isSuperAdmin(context)) return jsonError('Only Super Admin can approve or take over advertising campaigns.', 403);
    patch = { approval_status: 'approved', status: 'approved', approved_by: context.actorId, updated_at: new Date().toISOString() };
  } else return jsonError('Unsupported advertising update action.');
  const { data, error } = await supabase.from('ad_campaigns').update(patch).eq('campaign_id', campaignId).select(campaignColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ ...auditActor(context), action: `advertising_${action}`, object_type: 'ad_campaign', object_id: campaignId, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, campaign: data });
}
