import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

type Summary = {
  key: string;
  spend: number;
  leads: number;
  bookings: number;
  jobs: number;
  revenue: number;
  grossProfit: number;
  clicks: number;
  impressions: number;
};

const performanceColumns = 'performance_id,performance_date,campaign_id,platform,impressions,clicks,spend_amount,leads_count,whatsapp_clicks,phone_clicks,form_submits,bookings_count,quotations_count,jobs_count,invoice_amount,payment_amount,gross_profit_amount,created_at';

function num(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}
function add(target: Summary, row: Row) {
  target.spend += num(row.spend_amount);
  target.leads += num(row.leads_count);
  target.bookings += num(row.bookings_count);
  target.jobs += num(row.jobs_count);
  target.revenue += num(row.payment_amount || row.invoice_amount);
  target.grossProfit += num(row.gross_profit_amount || row.payment_amount || row.invoice_amount);
  target.clicks += num(row.clicks);
  target.impressions += num(row.impressions);
}
function empty(key: string): Summary {
  return { key, spend: 0, leads: 0, bookings: 0, jobs: 0, revenue: 0, grossProfit: 0, clicks: 0, impressions: 0 };
}
function finalize(item: Summary) {
  const cpl = item.leads > 0 ? item.spend / item.leads : 0;
  const cpb = item.bookings > 0 ? item.spend / item.bookings : 0;
  const roas = item.spend > 0 ? item.revenue / item.spend : 0;
  const roi = item.spend > 0 ? (item.grossProfit - item.spend) / item.spend : 0;
  const ctr = item.impressions > 0 ? item.clicks / item.impressions : 0;
  const conversionRate = item.clicks > 0 ? item.leads / item.clicks : 0;
  return { ...item, cpl, cpb, roas, roi, ctr, conversionRate };
}
function buildAlerts(rows: Row[]) {
  return rows.flatMap((row) => {
    const alerts: Row[] = [];
    const spend = num(row.spend_amount);
    const leads = num(row.leads_count);
    const clicks = num(row.clicks);
    const revenue = num(row.payment_amount || row.invoice_amount);
    const cpl = leads > 0 ? spend / leads : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    const base = { performance_id: row.performance_id, date: row.performance_date, platform: row.platform, campaign_id: row.campaign_id };
    if (spend >= 80 && leads === 0) alerts.push({ ...base, level: 'high', type: 'high_spend_no_leads', message: 'High spend but no leads / 高花费但无线索', spend, leads });
    if (cpl >= 80) alerts.push({ ...base, level: 'watch', type: 'high_cpl', message: 'CPL is high / 单线索成本偏高', spend, leads, cpl });
    if (clicks >= 50 && leads / clicks < 0.02) alerts.push({ ...base, level: 'watch', type: 'low_click_to_lead', message: 'Low click-to-lead conversion / 点击转线索偏低', clicks, leads });
    if (spend >= 50 && roas > 0 && roas < 1.5) alerts.push({ ...base, level: 'high', type: 'low_roas', message: 'Low ROAS after spend / 花费后 ROAS 偏低', spend, revenue, roas });
    return alerts;
  }).slice(0, 50);
}
function sampleRows() {
  return [
    { performance_date: '2026-05-25', platform: 'google_ads', impressions: 1200, clicks: 84, spend_amount: 45.5, leads_count: 6, bookings_count: 2, jobs_count: 1, payment_amount: 580, gross_profit_amount: 390 },
    { performance_date: '2026-05-26', platform: 'meta_ads', impressions: 2400, clicks: 96, spend_amount: 58, leads_count: 3, bookings_count: 1, jobs_count: 0, payment_amount: 0, gross_profit_amount: 0 },
    { performance_date: '2026-05-27', platform: 'tiktok_ads', impressions: 4800, clicks: 130, spend_amount: 120, leads_count: 1, bookings_count: 0, jobs_count: 0, payment_amount: 0, gross_profit_amount: 0 }
  ];
}
function summarize(rows: Row[]) {
  const platformMap = new Map<string, Summary>();
  const dailyMap = new Map<string, Summary>();
  const total = empty('total');
  for (const row of rows) {
    const platform = String(row.platform || 'manual_import');
    const date = String(row.performance_date || '').slice(0, 10) || 'unknown';
    if (!platformMap.has(platform)) platformMap.set(platform, empty(platform));
    if (!dailyMap.has(date)) dailyMap.set(date, empty(date));
    add(platformMap.get(platform)!, row);
    add(dailyMap.get(date)!, row);
    add(total, row);
  }
  return {
    total: finalize(total),
    byPlatform: Array.from(platformMap.values()).map(finalize).sort((a, b) => b.spend - a.spend),
    byDate: Array.from(dailyMap.values()).map(finalize).sort((a, b) => a.key.localeCompare(b.key)),
    alerts: buildAlerts(rows)
  };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:advertising');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: true, ...summarize(sampleRows()), fallback: 'supabase_not_configured' });
  const { data, error } = await supabase.from('ad_performance_daily').select(performanceColumns).order('performance_date', { ascending: false }).limit(365);
  if (error) return NextResponse.json({ ok: true, ...summarize(sampleRows()), fallback: 'performance_table_not_ready', table_error: error.message });
  return NextResponse.json({ ok: true, ...summarize(data || []), rows: data || [], fallback: null });
}
