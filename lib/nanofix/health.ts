import { systemModules, systemReadinessScore, SYSTEM_FOUNDATION_VERSION } from "./module-contracts";

export function getEnvironmentHealth() {
  const env = process.env;
  const checks = [
    { key: "NEXT_PUBLIC_SITE_URL", ok: Boolean(env.NEXT_PUBLIC_SITE_URL), scope: "public" },
    { key: "SUPABASE_URL", ok: Boolean(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL), scope: "server" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", ok: Boolean(env.SUPABASE_SERVICE_ROLE_KEY), scope: "server-only" },
    { key: "NEXT_PUBLIC_MEMBER_PORTAL_URL", ok: Boolean(env.NEXT_PUBLIC_MEMBER_PORTAL_URL), scope: "public" },
    { key: "ADMIN_REPAIR_REQUEST_URL", ok: Boolean(env.ADMIN_REPAIR_REQUEST_URL) || env.ADMIN_WEBHOOK_ENABLED === "false", scope: "server" },
    { key: "CLOUDFLARE_TURNSTILE_SECRET_KEY", ok: Boolean(env.CLOUDFLARE_TURNSTILE_SECRET_KEY), scope: "server-only", optional: true },
    { key: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", ok: Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY), scope: "public", optional: true }
  ];

  return {
    version: SYSTEM_FOUNDATION_VERSION,
    readiness_score: systemReadinessScore(env),
    checked_at: new Date().toISOString(),
    checks,
    modules: systemModules.map((module) => ({
      key: module.key,
      name: module.name,
      criticality: module.criticality,
      deploy_target: module.deployTarget,
      can_degrade_independently: module.canDegradeIndependently,
      health_checks: module.healthChecks
    }))
  };
}
