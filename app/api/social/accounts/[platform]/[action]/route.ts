import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ platform: string; action: string }> };

type PlatformConfig = {
  label: string;
  credentialFields: string[];
  linkedModules: string[];
  tables: string[];
};

const configs: Record<string, PlatformConfig> = {
  meta: {
    label: 'Facebook / Instagram Meta Business',
    credentialFields: ['app_id', 'app_secret', 'page_id', 'ig_business_id', 'access_token', 'webhook_verify_token'],
    linkedModules: ['unified_social_inbox', 'review_comment_management', 'organic_social_leads', 'ai_social_content_studio', 'campaign_posting_queue', 'social_performance'],
    tables: ['social_accounts', 'social_tokens', 'social_webhook_events']
  },
  'google-business': {
    label: 'Google Business Profile',
    credentialFields: ['client_id', 'client_secret', 'refresh_token', 'account_id', 'location_id'],
    linkedModules: ['google_business_profile', 'google_reviews', 'review_comment_management', 'ai_review_reply', 'organic_social_leads', 'social_performance'],
    tables: ['social_accounts', 'google_business_locations', 'social_reviews']
  },
  whatsapp: {
    label: 'WhatsApp Business Cloud API',
    credentialFields: ['phone_number_id', 'waba_id', 'access_token', 'app_secret', 'webhook_verify_token'],
    linkedModules: ['internal_inbox_messages', 'whatsapp_ai_reply', 'transfer_to_human', 'customer_portal_intake', 'service_requests'],
    tables: ['social_accounts', 'whatsapp_threads', 'internal_inbox_messages']
  },
  tiktok: {
    label: 'TikTok Business',
    credentialFields: ['client_key', 'client_secret', 'advertiser_id', 'access_token', 'manual_owner'],
    linkedModules: ['ai_social_content_studio', 'multi_platform_preview_review', 'schedule_publish_approval', 'social_performance'],
    tables: ['social_accounts', 'social_content_drafts', 'campaign_posting_queue']
  },
  youtube: {
    label: 'YouTube Shorts',
    credentialFields: ['client_id', 'client_secret', 'refresh_token', 'channel_id'],
    linkedModules: ['ai_social_content_studio', 'multi_platform_preview_review', 'campaign_posting_queue', 'social_performance'],
    tables: ['social_accounts', 'social_content_drafts', 'campaign_posting_queue']
  },
  xiaohongshu: {
    label: 'Xiaohongshu Manual / API Mode',
    credentialFields: ['account_handle', 'admin_owner', 'manual_import_template', 'optional_api_token'],
    linkedModules: ['manual_social_messages', 'ai_social_content_studio', 'attribution_rules', 'customer_source_history'],
    tables: ['social_accounts', 'manual_social_messages', 'social_content_drafts']
  }
};

const allowedActions = ['connect', 'test', 'sync'] as const;

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

async function writeConnectionEvent(platform: string, action: string, body: Record<string, unknown>, request: NextRequest) {
  const credentialSummary: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.credentials || {})) credentialSummary[key] = maskSecret(value);
  return supabaseInsert('social_connection_events', {
    platform,
    action,
    account_name: body.account_name || body.accountName || null,
    external_account_id: body.account_id || body.accountId || body.customer_id || null,
    credential_summary: credentialSummary,
    linked_modules: configs[platform]?.linkedModules || [],
    status: action === 'connect' ? 'binding_saved' : action === 'test' ? 'test_requested' : 'sync_requested',
    source_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
    user_agent: request.headers.get('user-agent') || null,
    created_at: new Date().toISOString()
  });
}

function connectionGuide(platform: string, action: string, origin: string) {
  const config = configs[platform];
  return {
    ok: true,
    route_ready: true,
    platform,
    platform_label: config.label,
    action,
    endpoint: `${origin}/api/social/accounts/${platform}/${action}`,
    methods: ['GET', 'POST'],
    credential_fields: config.credentialFields,
    linked_modules: config.linkedModules,
    database_tables: config.tables,
    instructions: {
      en: 'Use POST with account_name, account_id and credentials. Secrets are never returned in full. The route records a social_connection_events audit row when the table exists.',
      zh: '使用 POST 提交 account_name、account_id 和 credentials。密钥不会完整返回；当 social_connection_events 表存在时，本接口会写入社媒接入事件审计记录。'
    },
    example_payload: {
      account_name: 'NANOFIX Official',
      account_id: 'external-account-id',
      credentials: Object.fromEntries(config.credentialFields.map((field) => [field, '<paste_here>']))
    },
    related_endpoints: {
      connect: `${origin}/api/social/accounts/${platform}/connect`,
      test: `${origin}/api/social/accounts/${platform}/test`,
      sync: `${origin}/api/social/accounts/${platform}/sync`
    }
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { platform, action } = await context.params;
  if (!configs[platform]) return json({ ok: false, error: 'Unsupported social platform.', supported_platforms: Object.keys(configs) }, 404);
  if (!allowedActions.includes(action as typeof allowedActions[number])) return json({ ok: false, error: 'Unsupported action.', supported_actions: allowedActions }, 404);
  return json(connectionGuide(platform, action, request.nextUrl.origin));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { platform, action } = await context.params;
  if (!configs[platform]) return json({ ok: false, error: 'Unsupported social platform.', supported_platforms: Object.keys(configs) }, 404);
  if (!allowedActions.includes(action as typeof allowedActions[number])) return json({ ok: false, error: 'Unsupported action.', supported_actions: allowedActions }, 404);
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON body.' }, 400); }
  const eventResult = await writeConnectionEvent(platform, action, body, request);
  return json({
    ok: eventResult.ok,
    route_ready: true,
    platform,
    platform_label: configs[platform].label,
    action,
    saved_event: eventResult,
    linked_modules: configs[platform].linkedModules,
    next_step: action === 'connect' ? 'Run /test, then /sync after the account credentials are verified.' : action === 'test' ? 'Review provider API result and enable sync if valid.' : 'Check inbox/leads/content/analytics modules for imported data.',
    warning: eventResult.ok ? null : 'API route is available, but the database event insert failed or was skipped. Apply the social connection migration before declaring this connector fully live.'
  }, eventResult.ok ? 200 : 207);
}
