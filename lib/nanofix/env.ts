export type EnvCheck = {
  name: string;
  configured: boolean;
  requiredForProduction: boolean;
  description: string;
};

export const envChecks: EnvCheck[] = [
  {
    name: "NEXT_PUBLIC_SITE_URL",
    configured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    requiredForProduction: true,
    description: "Canonical public website URL used by metadata, sitemap and schema."
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    requiredForProduction: true,
    description: "Public Supabase project URL for client-visible Supabase integration."
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    requiredForProduction: true,
    description: "Public Supabase anon key used to validate Supabase Auth sessions without exposing service role credentials."
  },
  {
    name: "SUPABASE_URL",
    configured: Boolean(process.env.SUPABASE_URL),
    requiredForProduction: true,
    description: "Server-side Supabase project URL."
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    requiredForProduction: true,
    description: "Server-only Supabase service role key for API routes. Never expose in browser code."
  },
  {
    name: "NANOFIX_ADMIN_API_TOKEN",
    configured: Boolean(process.env.NANOFIX_ADMIN_API_TOKEN),
    requiredForProduction: false,
    description: "Optional server-to-server emergency token. Keep NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false in production unless a controlled migration window is approved."
  },
  {
    name: "NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED",
    configured: Boolean(process.env.NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED),
    requiredForProduction: false,
    description: "Controls emergency internal token fallback. Secure production default is false."
  },
  {
    name: "NANOFIX_WEBHOOK_SECRET",
    configured: Boolean(process.env.NANOFIX_WEBHOOK_SECRET),
    requiredForProduction: true,
    description: "HMAC secret used to verify inbound webhooks."
  },
  {
    name: "NEXT_PUBLIC_MEMBER_PORTAL_URL",
    configured: Boolean(process.env.NEXT_PUBLIC_MEMBER_PORTAL_URL),
    requiredForProduction: true,
    description: "Public route used by website CTAs to connect customer portal login and repair tracking."
  },
  {
    name: "NANOFIX_PUBLIC_FORM_RATE_LIMIT_MAX",
    configured: Boolean(process.env.NANOFIX_PUBLIC_FORM_RATE_LIMIT_MAX),
    requiredForProduction: false,
    description: "Rate limit cap for public repair request submissions."
  },
  {
    name: "CLOUDFLARE_TURNSTILE_SECRET_KEY",
    configured: Boolean(process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY),
    requiredForProduction: false,
    description: "Optional bot verification secret for public form submissions."
  },
  {
    name: "ADMIN_REPAIR_REQUEST_URL",
    configured: Boolean(process.env.ADMIN_REPAIR_REQUEST_URL),
    requiredForProduction: false,
    description: "Optional central admin webhook destination for public repair requests."
  },
  {
    name: "ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET",
    configured: Boolean(process.env.ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET),
    requiredForProduction: false,
    description: "Optional shared secret for forwarding repair requests to the central admin webhook."
  }
];

export function productionEnvIsReady() {
  return envChecks.every((check) => !check.requiredForProduction || check.configured);
}
