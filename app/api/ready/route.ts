import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const ENV = {
  nodeEnv: process.env.NODE_ENV || "production",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
  publicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  publicSupabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  webhookSecret: process.env.NANOFIX_WEBHOOK_SECRET || "",
  memberPortalUrl: process.env.NEXT_PUBLIC_MEMBER_PORTAL_URL || ""
};

const requiredEnv = [
  { name: "NEXT_PUBLIC_SITE_URL", value: ENV.siteUrl },
  { name: "NEXT_PUBLIC_SUPABASE_URL", value: ENV.publicSupabaseUrl },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: ENV.publicSupabaseAnonKey },
  { name: "SUPABASE_URL", value: ENV.supabaseUrl },
  { name: "SUPABASE_SERVICE_ROLE_KEY", value: ENV.supabaseServiceRoleKey },
  { name: "NANOFIX_WEBHOOK_SECRET", value: ENV.webhookSecret },
  { name: "NEXT_PUBLIC_MEMBER_PORTAL_URL", value: ENV.memberPortalUrl }
];

const coreRequiredTables = [
  "profiles",
  "customers",
  "unified_intake",
  "leads",
  "service_requests",
  "jobs",
  "service_inspections",
  "service_upload_reviews",
  "quotations",
  "quotation_versions",
  "quotation_acceptances",
  "quotation_customer_responses",
  "quotation_pdf_documents",
  "invoices",
  "invoice_pdf_documents",
  "payments",
  "payment_intents",
  "payment_webhook_events",
  "payment_checkout_sessions",
  "warranties",
  "warranty_pdf_documents",
  "warranty_claims",
  "customer_portal_requests",
  "customer_document_feedback",
  "unified_tasks",
  "task_events",
  "workflow_settings",
  "status_transition_logs",
  "audit_logs",
  "document_company_settings"
];

const optionalModuleTables = [
  "automation_rules",
  "notification_outbox",
  "internal_inbox_messages",
  "content_drafts",
  "ai_logs",
  "backup_jobs",
  "app_modules",
  "customer_account_claims",
  "customer_record_links"
];

type TableCheck = {
  table: string;
  ok: boolean;
  status: number | null;
  error: string | null;
};

function configured(value: string) {
  return Boolean(
    value &&
      value !== "undefined" &&
      value !== "null" &&
      !value.includes("YOUR_") &&
      !value.includes("REPLACE_") &&
      !value.includes("YOUR_PROJECT") &&
      !value.includes("YOUR_SUPABASE")
  );
}

function envReady() {
  return requiredEnv.every((item) => configured(item.value));
}

function getSupabaseConfig() {
  const url = ENV.supabaseUrl;
  const serviceRoleKey = ENV.supabaseServiceRoleKey;
  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
    configured: configured(url) && configured(serviceRoleKey)
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
    const endpoint = url + "/rest/v1/" + table + "?select=*&limit=0";
    const response = await boundedFetch(endpoint, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        authorization: "Bearer " + serviceRoleKey,
        accept: "application/json"
      }
    });

    if (response.ok) return { table, ok: true, status: response.status, error: null };

    const text = await response.text().catch(() => "");
    return {
      table,
      ok: false,
      status: response.status,
      error: text ? text.slice(0, 500) : response.statusText || "Supabase REST check failed"
    };
  } catch (error) {
    return {
      table,
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : "Supabase check timeout or fetch error"
    };
  }
}

async function checkTables(url: string, serviceRoleKey: string, tables: string[]) {
  return Promise.all(tables.map((table) => checkTable(url, serviceRoleKey, table)));
}

export async function GET() {
  const startedAt = Date.now();
  const environmentReady = envReady();
  const supabaseConfig = getSupabaseConfig();

  const coreTableChecks = supabaseConfig.configured
    ? await checkTables(supabaseConfig.url, supabaseConfig.serviceRoleKey, coreRequiredTables)
    : coreRequiredTables.map((table) => ({
        table,
        ok: false,
        status: null,
        error: "Supabase URL or service role key is not configured."
      }));

  const optionalTableChecks = supabaseConfig.configured
    ? await checkTables(supabaseConfig.url, supabaseConfig.serviceRoleKey, optionalModuleTables)
    : optionalModuleTables.map((table) => ({
        table,
        ok: false,
        status: null,
        error: "Supabase URL or service role key is not configured."
      }));

  const failedCoreTables = coreTableChecks.filter((check) => !check.ok);
  const failedOptionalTables = optionalTableChecks.filter((check) => !check.ok);
  const databaseReady = supabaseConfig.configured && failedCoreTables.length === 0;
  const optionalDatabaseReady = supabaseConfig.configured && failedOptionalTables.length === 0;
  const ok = environmentReady && databaseReady;

  return NextResponse.json(
    {
      ok,
      service: "nanofix-v28-unified-website-admin",
      version: "28.2.0-automation-inbox-task-engine",
      hotfix_version: "28.9-production-api-health-hotfix",
      runtime: "edge",
      environment: ENV.nodeEnv,
      env_ready: environmentReady,
      database_ready: databaseReady,
      optional_database_ready: optionalDatabaseReady,
      supabase_configured: supabaseConfig.configured,
      failed_core_tables: failedCoreTables.map((check) => check.table),
      failed_optional_tables: failedOptionalTables.map((check) => check.table),
      checks: requiredEnv.map((item) => ({
        name: item.name,
        configured: configured(item.value),
        required_for_production: true
      })),
      required_tables: coreTableChecks,
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