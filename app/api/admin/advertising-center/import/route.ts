import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { auditActor, requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;
type ParsedRow = Record<string, string>;

type ImportRow = {
  performance_date: string;
  platform: string;
  campaign_name: string;
  campaign_id: string | null;
  impressions: number;
  clicks: number;
  spend_amount: number;
  leads_count: number;
  whatsapp_clicks: number;
  phone_clicks: number;
  form_submits: number;
  bookings_count: number;
  quotations_count: number;
  jobs_count: number;
  invoice_amount: number;
  payment_amount: number;
  gross_profit_amount: number;
  metadata_json: Payload;
};

const campaignColumns = 'campaign_id,platform,campaign_name,service_category,status,approval_status,daily_budget,monthly_budget,spend_amount,leads_count,bookings_count,quotations_count,jobs_count,revenue_amount,gross_profit_amount,landing_page_url,utm_source,utm_medium,utm_campaign,headline,primary_text,owner_id,created_by,approved_by,created_at,updated_at';
const templateColumns = [
  'date',
  'platform',
  'campaign_name',
  'campaign_id',
  'impressions',
  'clicks',
  'spend',
  'leads',
  'whatsapp_clicks',
  'phone_clicks',
  'form_submits',
  'bookings',
  'quotations',
  'jobs',
  'invoice_amount',
  'payment_amount',
  'gross_profit'
];
const sampleCsv = `${templateColumns.join(',')}\n2026-05-27,google_ads,HDB Ceiling Leak Search,,1200,84,45.5,6,3,1,2,2,1,1,580,580,390`;

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function cleanText(value: unknown, fallback = '', max = 2000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function num(value: unknown) { const n = Number(String(value ?? '').replace(/[$,]/g, '').trim() || 0); return Number.isFinite(n) ? n : 0; }
function dateOnly(value: unknown) {
  const text = cleanText(value, '', 40);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}
function splitCsvLine(line: string) {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') { current += '"'; i += 1; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { out.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  out.push(current.trim());
  return out;
}
function parseCsv(csv: string) {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<ParsedRow>((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });
}
function rowToImport(row: ParsedRow): ImportRow | null {
  const performanceDate = dateOnly(row.date || row.performance_date);
  const platform = cleanText(row.platform, 'manual_import', 80) || 'manual_import';
  const campaignName = cleanText(row.campaign_name || row.campaign, '', 240);
  if (!performanceDate || !campaignName) return null;
  return {
    performance_date: performanceDate,
    platform,
    campaign_name: campaignName,
    campaign_id: validUuid(row.campaign_id) ? row.campaign_id : null,
    impressions: Math.round(num(row.impressions)),
    clicks: Math.round(num(row.clicks)),
    spend_amount: num(row.spend || row.spend_amount),
    leads_count: Math.round(num(row.leads || row.leads_count)),
    whatsapp_clicks: Math.round(num(row.whatsapp_clicks)),
    phone_clicks: Math.round(num(row.phone_clicks)),
    form_submits: Math.round(num(row.form_submits)),
    bookings_count: Math.round(num(row.bookings || row.bookings_count)),
    quotations_count: Math.round(num(row.quotations || row.quotations_count)),
    jobs_count: Math.round(num(row.jobs || row.jobs_count)),
    invoice_amount: num(row.invoice_amount),
    payment_amount: num(row.payment_amount),
    gross_profit_amount: num(row.gross_profit || row.gross_profit_amount),
    metadata_json: { source: 'manual_csv_import', raw_campaign_name: campaignName }
  };
}
async function findOrCreateCampaign(supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, row: ImportRow, actorId: string) {
  if (row.campaign_id) {
    const { data } = await supabase.from('ad_campaigns').select(campaignColumns).eq('campaign_id', row.campaign_id).maybeSingle();
    if (data?.campaign_id) return data;
  }
  const { data: existing } = await supabase.from('ad_campaigns').select(campaignColumns).eq('platform', row.platform).eq('campaign_name', row.campaign_name).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (existing?.campaign_id) return existing;
  const { data, error } = await supabase.from('ad_campaigns').insert({ platform: row.platform, campaign_name: row.campaign_name, service_category: 'Manual Import / 手动导入', status: 'draft', approval_status: 'draft', spend_amount: 0, leads_count: 0, bookings_count: 0, quotations_count: 0, jobs_count: 0, revenue_amount: 0, gross_profit_amount: 0, owner_id: actorId, created_by: actorId, utm_source: row.platform, utm_medium: 'paid', utm_campaign: row.campaign_name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select(campaignColumns).single();
  if (error) throw new Error(error.message);
  return data;
}
async function refreshCampaignTotals(supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, campaignId: string) {
  const { data, error } = await supabase.from('ad_performance_daily').select('spend_amount,leads_count,bookings_count,quotations_count,jobs_count,payment_amount,gross_profit_amount').eq('campaign_id', campaignId);
  if (error) return;
  const totals = (data || []).reduce((acc, row: Payload) => ({
    spend_amount: acc.spend_amount + num(row.spend_amount),
    leads_count: acc.leads_count + Math.round(num(row.leads_count)),
    bookings_count: acc.bookings_count + Math.round(num(row.bookings_count)),
    quotations_count: acc.quotations_count + Math.round(num(row.quotations_count)),
    jobs_count: acc.jobs_count + Math.round(num(row.jobs_count)),
    revenue_amount: acc.revenue_amount + num(row.payment_amount),
    gross_profit_amount: acc.gross_profit_amount + num(row.gross_profit_amount)
  }), { spend_amount: 0, leads_count: 0, bookings_count: 0, quotations_count: 0, jobs_count: 0, revenue_amount: 0, gross_profit_amount: 0 });
  await supabase.from('ad_campaigns').update({ ...totals, updated_at: new Date().toISOString() }).eq('campaign_id', campaignId);
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:advertising');
  if (response) return response;
  return NextResponse.json({ ok: true, templateColumns, sampleCsv, notes: ['Use one row per platform/campaign/date.', 'Excel can export to CSV, then paste the CSV here.', 'campaign_id is optional; campaign_name + platform can auto-match or create draft campaign.'] });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'ad_campaign.draft');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase || !context) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const csv = cleanText(body.csv, '', 200000);
  if (!csv) return jsonError('CSV content is required.');
  const parsed = parseCsv(csv).map(rowToImport).filter(Boolean) as ImportRow[];
  if (!parsed.length) return jsonError('No valid rows found. Required: date, platform, campaign_name.');
  const syncStart = new Date().toISOString();
  const { data: syncLog } = await supabase.from('ad_sync_logs').insert({ platform: 'manual_import', sync_mode: 'csv_paste', status: 'running', started_at: syncStart, created_by: context.actorId, metadata_json: { rows_received: parsed.length } }).select('sync_log_id').single();
  const affected = new Set<string>();
  const inserted: Payload[] = [];
  try {
    for (const row of parsed) {
      const campaign = await findOrCreateCampaign(supabase, row, context.actorId);
      const payload = { ...row, campaign_id: campaign.campaign_id, metadata_json: { ...row.metadata_json, sync_log_id: syncLog?.sync_log_id || null } };
      const { data, error } = await supabase.from('ad_performance_daily').insert(payload).select('performance_id,campaign_id,performance_date,platform,spend_amount,leads_count,bookings_count,payment_amount,gross_profit_amount').single();
      if (error) throw new Error(error.message);
      inserted.push(data);
      affected.add(String(campaign.campaign_id));
    }
    for (const campaignId of affected) await refreshCampaignTotals(supabase, campaignId);
    if (syncLog?.sync_log_id) await supabase.from('ad_sync_logs').update({ status: 'success', rows_imported: inserted.length, finished_at: new Date().toISOString(), metadata_json: { rows_imported: inserted.length, affected_campaigns: Array.from(affected) } }).eq('sync_log_id', syncLog.sync_log_id);
    await auditLog({ ...auditActor(context), action: 'import_ad_performance_csv', object_type: 'ad_performance_daily', object_id: syncLog?.sync_log_id || null, after_data: { rows_imported: inserted.length, affected_campaigns: Array.from(affected) } });
    return NextResponse.json({ ok: true, rows_imported: inserted.length, affected_campaigns: Array.from(affected), inserted });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CSV import failed.';
    if (syncLog?.sync_log_id) await supabase.from('ad_sync_logs').update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() }).eq('sync_log_id', syncLog.sync_log_id);
    return jsonError(message, 500);
  }
}
