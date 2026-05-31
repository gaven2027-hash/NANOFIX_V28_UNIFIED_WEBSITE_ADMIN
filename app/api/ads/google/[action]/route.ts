import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ action: string }> };

const allowedActions = ['connect', 'test', 'sync'] as const;

const googleAdsConfig = {
  platform: 'google-ads',
  platform_label: 'Google Ads',
  credential_fields: ['developer_token', 'client_id', 'client_secret', 'refresh_token', 'login_customer_id', 'customer_id'],
  linked_modules: ['dashboard', 'leads', 'attribution_rules', 'campaign_performance', 'ai_ads_suggestions'],
  database_tables: ['ad_accounts', 'ad_campaigns', 'ad_leads', 'attribution_events']
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

function maskSecret(value: unknown) {
  const text = typeof value === 'string' ? value : '';
  if (!text) return '';
  if (text.length <= 8) return '••••';
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url: url.replace(/\/$/, ''), key, configured: Boolean(url && key) };
}

async function supabaseInsert(table: string, payload: Record<string, unknown>) {
  const config = getSupabaseConfig();
  if (!config.configured) return { ok: false, skipped: true, error: 'Supabase service role is not configured.' };
  const response = await fetch(`${config.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      'content-type': 'application/json',
      prefer: 'return=representation'
    },
    body: JSON.stringify(payload),
    cache: 'no-store'
  });
  const body = await response.text().catch(() => '');
  return { ok: response.ok, status: response.status, body: body ? body.slice(0, 800) : null };
}

async function writeConnectionEvent(action: string, body: Record<string, unknown>, request: NextRequest) {
  const credentialSummary: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.credentials || {})) credentialSummary[key] = maskSecret(value);
  return supabaseInsert('social_connection_events', {
    platform: 'google-ads',
    action,
    account_name: body.account_name || body.accountName || null,
    external_account_id: body.customer_id || body.customerId || body.account_id || null,
    credential_summary: credentialSummary,
    linked_modules: googleAdsConfig.linked_modules,
    status: action === 'connect' ? 'binding_saved' : action === 'test' ? 'test_requested' : 'sync_requested',
    source_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
    user_agent: request.headers.get('user-agent') || null,
    created_at: new Date().toISOString()
  });
}

function guide(action: string, origin: string) {
  return {
    ok: true,
    route_ready: true,
    ...googleAdsConfig,
    action,
    endpoint: `${origin}/api/ads/google/${action}`,
    methods: ['GET', 'POST'],
    instructions: {
      en: 'Use POST with account_name, customer_id and credentials. Secrets are never returned in full. The route records a social_connection_events audit row when the table exists.',
      zh: '使用 POST 提交 account_name、customer_id 和 credentials。密钥不会完整返回；当 social_connection_events 表存在时，本接口会写入账号接入事件审计记录。'
    },
    example_payload: {
      account_name: 'NANOFIX Google Ads',
      customer_id: '123-456-7890',
      credentials: Object.fromEntries(googleAdsConfig.credential_fields.map((field) => [field, '<paste_here>']))
    },
    related_endpoints: {
      connect: `${origin}/api/ads/google/connect`,
      test: `${origin}/api/ads/google/test`,
      sync: `${origin}/api/ads/google/sync`
    }
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;
  if (!allowedActions.includes(action as typeof allowedActions[number])) return json({ ok: false, error: 'Unsupported action.', supported_actions: allowedActions }, 404);
  return json(guide(action, request.nextUrl.origin));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;
  if (!allowedActions.includes(action as typeof allowedActions[number])) return json({ ok: false, error: 'Unsupported action.', supported_actions: allowedActions }, 404);
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON body.' }, 400); }
  const eventResult = await writeConnectionEvent(action, body, request);
  return json({
    ok: eventResult.ok,
    route_ready: true,
    ...googleAdsConfig,
    action,
    saved_event: eventResult,
    next_step: action === 'connect' ? 'Run /test, then /sync after the Google Ads credentials are verified.' : action === 'test' ? 'Review Google Ads API result and enable sync if valid.' : 'Check Dashboard, Leads, Attribution Rules and Campaign Performance for imported data.',
    warning: eventResult.ok ? null : 'API route is available, but the database event insert failed or was skipped. Apply the social connection migration before declaring this connector fully live.'
  }, eventResult.ok ? 200 : 207);
}
