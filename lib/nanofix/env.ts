export type EnvCheck = {
  name: string;
  configured: boolean;
  requiredForProduction: boolean;
  description: string;
};

const env = process.env;
const ENV = {
  siteUrl: "NEXT_PUBLIC_SITE_URL",
  publicSupabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
  publicSupabaseAnonKey: ["NEXT_PUBLIC", "SUPABASE", "ANON", "KEY"].join("_"),
  supabaseUrl: "SUPABASE_URL",
  supabaseServiceRole: ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
  adminApiToken: "NANOFIX_ADMIN_API_TOKEN",
  adminTokenFallback: "NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED",
  webhookSecret: "NANOFIX_WEBHOOK_SECRET",
  memberPortalUrl: "NEXT_PUBLIC_MEMBER_PORTAL_URL",
  formRateLimitMax: "NANOFIX_PUBLIC_FORM_RATE_LIMIT_MAX",
  turnstileSecret: ["CLOUDFLARE", "TURNSTILE", "SECRET", "KEY"].join("_"),
  turnstileSiteKey: ["NEXT_PUBLIC", "TURNSTILE", "SITE", "KEY"].join("_"),
  adminWebhookEnabled: "ADMIN_WEBHOOK_ENABLED",
  adminRepairRequestUrl: "ADMIN_REPAIR_REQUEST_URL",
  adminRepairRequestWebhookSecret: "ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET"
};

function adminWebhookReady() {
  return Boolean(env[ENV.adminRepairRequestUrl]) || env[ENV.adminWebhookEnabled] !== "true";
}

export const envChecks: EnvCheck[] = [
  {
    name: ENV.siteUrl,
    configured: Boolean(env[ENV.siteUrl]),
    requiredForProduction: true,
    description: "Canonical public website URL used by metadata, sitemap and schema."
  },
  {
    name: ENV.publicSupabaseUrl,
    configured: Boolean(env[ENV.publicSupabaseUrl]),
    requiredForProduction: true,
    description: "Public Supabase project URL for client-visible Supabase integration."
  },
  {
    name: ENV.publicSupabaseAnonKey,
    configured: Boolean(env[ENV.publicSupabaseAnonKey]),
    requiredForProduction: true,
    description: "Public Supabase anon key used to validate Supabase Auth sessions without exposing service role credentials."
  },
  {
    name: ENV.supabaseUrl,
    configured: Boolean(env[ENV.supabaseUrl]),
    requiredForProduction: true,
    description: "Server-side Supabase project URL."
  },
  {
    name: ENV.supabaseServiceRole,
    configured: Boolean(env[ENV.supabaseServiceRole]),
    requiredForProduction: true,
    description: "Server-only Supabase service role key for API routes. Never expose in browser code."
  },
  {
    name: ENV.adminApiToken,
    configured: Boolean(env[ENV.adminApiToken]),
    requiredForProduction: false,
    description: "Optional server-to-server emergency token. Keep NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false in production unless a controlled migration window is approved."
  },
  {
    name: ENV.adminTokenFallback,
    configured: Boolean(env[ENV.adminTokenFallback]),
    requiredForProduction: false,
    description: "Controls emergency internal token fallback. Secure production default is false."
  },
  {
    name: ENV.webhookSecret,
    configured: Boolean(env[ENV.webhookSecret]),
    requiredForProduction: true,
    description: "HMAC secret used to verify inbound webhooks."
  },
  {
    name: ENV.memberPortalUrl,
    configured: Boolean(env[ENV.memberPortalUrl]),
    requiredForProduction: true,
    description: "Public route used by website CTAs to connect customer portal login and repair tracking."
  },
  {
    name: ENV.formRateLimitMax,
    configured: Boolean(env[ENV.formRateLimitMax]),
    requiredForProduction: false,
    description: "Rate limit cap for public repair request submissions. Defaults are used when omitted."
  },
  {
    name: ENV.turnstileSecret,
    configured: Boolean(env[ENV.turnstileSecret]),
    requiredForProduction: false,
    description: "Optional bot verification secret for public form submissions. Configure together with NEXT_PUBLIC_TURNSTILE_SITE_KEY."
  },
  {
    name: ENV.turnstileSiteKey,
    configured: Boolean(env[ENV.turnstileSiteKey]),
    requiredForProduction: false,
    description: "Optional public Cloudflare Turnstile site key for browser-side widget rendering. Configure together with CLOUDFLARE_TURNSTILE_SECRET_KEY."
  },
  {
    name: ENV.adminRepairRequestUrl,
    configured: adminWebhookReady(),
    requiredForProduction: false,
    description: "Optional central admin webhook destination. Required only when ADMIN_WEBHOOK_ENABLED=true; otherwise Supabase + integration_outbox remains the source of truth."
  },
  {
    name: ENV.adminRepairRequestWebhookSecret,
    configured: Boolean(env[ENV.adminRepairRequestWebhookSecret]) || env[ENV.adminWebhookEnabled] !== "true",
    requiredForProduction: false,
    description: "Optional shared secret for forwarding repair requests to the central admin webhook. Required only when ADMIN_WEBHOOK_ENABLED=true."
  }
];

export function productionEnvIsReady() {
  return envChecks.every((check) => !check.requiredForProduction || check.configured);
}
