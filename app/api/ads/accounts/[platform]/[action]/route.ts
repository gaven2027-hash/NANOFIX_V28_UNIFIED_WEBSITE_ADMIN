import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ platform: string; action: string }> };

type AdsPlatformConfig = {
  platform: string;
  label: string;
  credentialFields: string[];
  linkedModules: string[];
  tables: string[];
  providerData: string[];
};

const allowedActions = ['connect', 'test', 'sync'] as const;

const adConfigs: Record<string, AdsPlatformConfig> = {
  google: {
    platform: 'google',
    label: 'Google Ads',
    credentialFields: ['developer_token', 'client_id', 'client_secret', 'refresh_token', 'login_customer_id', 'customer_id'],
    linkedModules: ['dashboard', 'website_leads', 'service_requests', 'attribution_rules', 'campaign_performance', 'ai_ads_suggestions'],
    tables: ['ad_accounts', 'ad_campaigns', 'ad_leads', 'attribution_events', 'audit_logs'],
    providerData: ['campaigns', 'ad_groups', 'keywords', 'conversions', 'cost', 'clicks', 'calls', 'lead_forms']
  },
  meta: {
    platform: 'meta',
    label: 'Meta Ads / Facebook & Instagram Ads',
    credentialFields: ['app_id', 'app_secret', 'business_id', 'ad_account_id', 'access_token', 'pixel_id', 'webhook_verify_token'],
    linkedModules: ['dashboard', 'website_leads', 'social_inbox', 'organic_social_leads', 'attribution_rules', 'campaign_performance', 'ai_ads_suggestions'],
    tables: ['ad_accounts', 'ad_campaigns', 'ad_leads', 'attribution_events', 'social_connection_events', 'audit_logs'],
    providerData: ['campaigns', 'ad_sets', 'ads', 'lead_ads', 'pixel_events', 'messages', 'comments', 'cost']
  },
  tiktok: {
    platform: 'tiktok',
    label: 'TikTok Ads',
    credentialFields: ['client_key', 'client_secret', 'advertiser_id', 'access_token', 'pixel_id'],
    linkedModules: ['dashboard', 'website_leads', 'social_inbox', 'attribution_rules', 'campaign_performance', 'ai_ads_suggestions'],
    tables: ['ad_accounts', 'ad_campaigns', 'ad_leads', 'attribution_events', 'audit_logs'],
    providerData: ['campaigns', 'ad_groups', 'video_ads', 'lead_generation', 'pixel_events', 'cost', 'engagement']
  },
  linkedin: {
    platform: 'linkedin',
    label: 'LinkedIn Ads',
    credentialFields: ['client_id', 'client_secret', 'refresh_token', 'ad_account_id', 'organization_id'],
    linkedModules: ['dashboard', 'b2b_leads', 'attribution_rules', 'campaign_performance', 'ai_ads_suggestions'],
    tables: ['ad_accounts', 'ad_campaigns', 'ad_leads', 'attribution_events', 'audit_logs'],
    providerData: ['campaign_groups', 'campaigns', 'lead_gen_forms', 'cost', 'impressions', 'clicks']
  },
  microsoft: {
    platform: 'microsoft',
    label: 'Microsoft Advertising / Bing Ads',
    credentialFields: ['developer_token', 'client_id', 'client_secret', 'refresh_token', 'customer_id', 'account_id'],
    linkedModules: ['dashboard', 'website_leads', 'attribution_rules', 'campaign_performance', 'ai_ads_suggestions'],
    tables: ['ad_accounts', 'ad_campaigns', 'ad_leads', 'attribution_events', 'audit_logs'],
    providerData: ['campaigns', 'ad_groups', 'keywords', 'conversions', 'cost', 'clicks']
  },
  xiaohongshu: {
    platform: 'xiaohongshu',
    label: 'Xiaohongshu Ads / 小红书广告',
    credentialFields: ['account_handle', 'admin_owner', 'advertiser_id', 'api_token_or_manual_import_template'],
    linkedModules: ['dashboard', 'manual_ad_leads', 'customer_source_history', 'attribution_rules', 'campaign_performance', 'ai_ads_suggestions'],
    tables: ['ad_accounts', 'manual_ad_leads', 'ad_campaigns', 'attribution_events', 'audit_logs'],
    providerData: ['manual_campaign_import', 'manual_lead_import', 'cost', 'engagement', 'message_leads']
  }
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url: url.replace(/\/$/, ''), key, configured: Boolean(url && key) };
}

function maskSecret(value: unknown) {
  const text = typeof value === 'string' ? value : '';
  if (!text) return '';
  if (text.length <= 8) return '••••';
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

async function supabaseRequest(table: string, init: RequestInit) {
  const config = getSupabaseConfig();
  if (!config.configured) return { ok: false, skipped: true, status: null, error: 'Supabase service role is not configured.' };
  const response = await fetch(`${config.url}/rest/v1/${table}`, {
    ...init,
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      accept: 'application/json',
      'content-type': 'application/json',
      ...(init.headers || {})
    },
    cache: 'no-store'
  });
  const text = await response.text().catch(() => '');
  return { ok: response.ok, skipped: false, status: response.status, body: text ? text.slice(0, 800) : null };
}

async function checkTable(table: string) {
  return supabaseRequest(`${table}?select=*&limit=0`, { method: 'GET' });
}

async function insertEvent(table: string, payload: Record<string, unknown>) {
  return supabaseRequest(table, { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify(payload) });
}

function credentialSummary(body: Record<string, unknown>) {
  const summary: Record<string, string> = {};
  const credentials = typeof body.credentials === 'object' && body.credentials ? body.credentials as Record<string, unknown> : {};
  for (const [key, value] of Object.entries(credentials)) summary[key] = maskSecret(value);
  return summary;
}

async function writeAdConnectionEvent(platform: string, action: string, body: Record<string, unknown>, request: NextRequest, config: AdsPlatformConfig) {
  const eventPayload = {
    platform,
    action,
    account_name: body.account_name || body.accountName || null,
    external_account_id: body.account_id || body.accountId || body.customer_id || body.customerId || null,
    credential_summary: credentialSummary(body),
    linked_modules: config.linkedModules,
    provider_data: config.providerData,
    status: action === 'connect' ? 'ad_binding_saved' : action === 'test' ? 'ad_bridge_test_requested' : 'ad_sync_requested',
    source_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
    user_agent: request.headers.get('user-agent') || null,
    created_at: new Date().toISOString()
  };
  const primary = await insertEvent('ad_connection_events', eventPayload);
  if (primary.ok) return { table: 'ad_connection_events', result: primary };
  const fallback = await insertEvent('social_connection_events', eventPayload);
  return { table: fallback.ok ? 'social_connection_events' : 'ad_connection_events', result: primary, fallback_result: fallback };
}

function guide(platform: string, action: string, origin: string, config: AdsPlatformConfig) {
  return {
    ok: true,
    route_ready: true,
    platform,
    platform_label: config.label,
    action,
    endpoint: `${origin}/api/ads/accounts/${platform}/${action}`,
    methods: ['GET', 'POST'],
    credential_fields: config.credentialFields,
    provider_data: config.providerData,
    linked_modules: config.linkedModules,
    database_tables: config.tables,
    data_bridge_checks: {
      account_binding: 'ad_accounts',
      campaign_sync: 'ad_campaigns',
      lead_sync: 'ad_leads or manual_ad_leads',
      attribution: 'attribution_events',
      dashboard: 'dashboard channel performance snapshot',
      audit: 'ad_connection_events and audit_logs'
    },
    instructions: {
      en: 'Use POST with account_name, account_id/customer_id and credentials. This route masks secrets, records an ad connection event when the table exists and returns table bridge check results for test/sync.',
      zh: '使用 POST 提交 account_name、account_id/customer_id 和 credentials。本接口会遮蔽密钥，在数据表存在时写入广告账号接入事件，并返回广告数据衔接测试结果。'
    },
    example_payload: {
      account_name: `NANOFIX ${config.label}`,
      account_id: 'external-ad-account-id',
      credentials: Object.fromEntries(config.credentialFields.map((field) => [field, '<paste_here>']))
    },
    related_endpoints: {
      connect: `${origin}/api/ads/accounts/${platform}/connect`,
      test: `${origin}/api/ads/accounts/${platform}/test`,
      sync: `${origin}/api/ads/accounts/${platform}/sync`
    }
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { platform, action } = await context.params;
  const config = adConfigs[platform];
  if (!config) return json({ ok: false, error: 'Unsupported advertising platform.', supported_platforms: Object.keys(adConfigs) }, 404);
  if (!allowedActions.includes(action as typeof allowedActions[number])) return json({ ok: false, error: 'Unsupported action.', supported_actions: allowedActions }, 404);
  return json(guide(platform, action, request.nextUrl.origin, config));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { platform, action } = await context.params;
  const config = adConfigs[platform];
  if (!config) return json({ ok: false, error: 'Unsupported advertising platform.', supported_platforms: Object.keys(adConfigs) }, 404);
  if (!allowedActions.includes(action as typeof allowedActions[number])) return json({ ok: false, error: 'Unsupported action.', supported_actions: allowedActions }, 404);

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON body.' }, 400); }

  const event = await writeAdConnectionEvent(platform, action, body, request, config);
  const bridgeChecks = await Promise.all(config.tables.map(async (table) => ({ table, ...(await checkTable(table)) })));
  const requiredBridgeReady = bridgeChecks.filter((check) => ['ad_accounts', 'ad_campaigns', 'ad_leads', 'manual_ad_leads', 'attribution_events'].includes(check.table)).every((check) => check.ok || check.table === 'manual_ad_leads');

  return json({
    ok: Boolean(event.result?.ok || event.fallback_result?.ok),
    route_ready: true,
    platform,
    platform_label: config.label,
    action,
    event_insert: event,
    bridge_ready: requiredBridgeReady,
    bridge_checks: bridgeChecks,
    linked_modules: config.linkedModules,
    provider_data: config.providerData,
    next_step: action === 'connect'
      ? 'Run Test Connection after saving the ad account API credentials. / 保存广告账号 API 后执行测试连接。'
      : action === 'test'
        ? 'Review bridge_checks. If ad_accounts, ad_campaigns, ad_leads and attribution_events are ready, run Sync Data. / 检查 bridge_checks，核心广告表可用后执行同步。'
        : 'Check Dashboard, Leads, Attribution Rules, Campaign Performance and AI Ads Suggestions for imported ad data. / 检查仪表盘、线索、归因规则、广告表现和 AI 广告建议。',
    warning: event.result?.ok || event.fallback_result?.ok ? null : 'API route is available, but event insert failed. Apply the advertising connection migration before declaring this connector fully live. / 接口已可用，但事件写入失败；需先执行广告接入数据库迁移。'
  }, event.result?.ok || event.fallback_result?.ok ? 200 : 207);
}
