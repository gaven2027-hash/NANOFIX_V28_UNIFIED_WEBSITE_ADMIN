import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const requiredEnv = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NANOFIX_WEBHOOK_SECRET",
  "NEXT_PUBLIC_MEMBER_PORTAL_URL"
];

const probeTables = [
  "profiles",
  "customers",
  "unified_intake",
  "leads",
  "service_requests",
  "service_inspections",
  "service_upload_reviews",
  "quotation_acceptances",
  "payment_intents",
  "automation_rules",
  "unified_tasks",
  "task_events",
  "workflow_settings",
  "audit_logs"
];
const optionalProbeTables = ["content_drafts", "ai_logs", "notification_outbox", "internal_inbox_messages"];
const compatibilityVersionMarker = "28.2.0-automation-inbox-task-engine";

type TableCheck = {
  table: string;
  ok: boolean;
  status: number | null;
  error: string | null;
};

function getEnv(name: string) {
  return process.env[name] || "";
}

function envReady() {
  return requiredEnv.every((name) => Boolean(getEnv(name)));
}

function getSupabaseConfig() {
  const url = getEnv("SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
    configured: Boolean(url && serviceRoleKey && !url.includes("YOUR_PROJECT") && !serviceRoleKey.includes("YOUR_SUPABASE"))
  };
}

async function boundedFetch(url: string, init: RequestInit, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkTable(url: string, serviceRoleKey: string, table: string): Promise<TableCheck> {
  try {
    const response = await boundedFetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        accept: "application/json"
      }
    });
    if (response.ok) return { table, ok: true, status: response.status, error: null };
    return { table, ok: false, status: response.status, error: response.statusText || "Supabase REST check failed" };
  } catch (error) {
    return { table, ok: false, status: null, error: error instanceof Error ? error.message : "Supabase check timeout or fetch error" };
  }
}

async function checkTables(url: string, serviceRoleKey: string, tables: string[]) {
  return Promise.all(tables.map((table) => checkTable(url, serviceRoleKey, table)));
}

export async function GET() {
  const startedAt = Date.now();
  const supabaseConfig = getSupabaseConfig();
  const requiredTableChecks = supabaseConfig.configured
    ? await checkTables(supabaseConfig.url, supabaseConfig.serviceRoleKey, probeTables)
    : probeTables.map((table) => ({ table, ok: false, status: null, error: "Supabase URL or service role key is not configured." }));
  const optionalTableChecks = supabaseConfig.configured
    ? await checkTables(supabaseConfig.url, supabaseConfig.serviceRoleKey, optionalProbeTables)
    : optionalProbeTables.map((table) => ({ table, ok: false, status: null, error: "Supabase URL or service role key is not configured." }));

  const failedRequiredTables = requiredTableChecks.filter((check) => !check.ok);
  const failedOptionalTables = optionalTableChecks.filter((check) => !check.ok);
  const environmentReady = envReady();
  const databaseReady = supabaseConfig.configured && failedRequiredTables.length === 0;
  const optionalDatabaseReady = supabaseConfig.configured && failedOptionalTables.length === 0;
  const ok = environmentReady && databaseReady;

  return NextResponse.json(
    {
      ok,
      service: "nanofix-v28-unified-website-admin",
      version: compatibilityVersionMarker,
      hotfix_version: "28.9-production-api-health-hotfix",
      runtime: "edge",
      environment: getEnv("NODE_ENV") || "production",
      env_ready: environmentReady,
      database_ready: databaseReady,
      optional_database_ready: optionalDatabaseReady,
      supabase_configured: supabaseConfig.configured,
      failed_core_tables: failedRequiredTables.map((check) => check.table),
      failed_optional_tables: failedOptionalTables.map((check) => check.table),
      checks: requiredEnv.map((name) => ({ name, configured: Boolean(getEnv(name)), required_for_production: true })),
      required_tables: requiredTableChecks,
      optional_tables: optionalTableChecks,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString()
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow"
      }
    }
  );
}
