import { NextResponse } from "next/server";
import { envChecks, productionEnvIsReady } from "@/lib/nanofix/env";

export const dynamic = "force-dynamic";
export const runtime = "edge";

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

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
    configured: Boolean(url && serviceRoleKey && !url.includes("YOUR_PROJECT") && !serviceRoleKey.includes("YOUR_SUPABASE"))
  };
}

async function boundedFetch(url: string, init: RequestInit, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
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
      },
      cache: "no-store"
    });
    if (response.ok) return { table, ok: true, status: response.status, error: null };
    const text = await response.text().catch(() => "");
    return { table, ok: false, status: response.status, error: text ? text.slice(0, 500) : response.statusText || "Supabase REST check failed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Supabase table check error";
    return { table, ok: false, status: null, error: message || "Supabase table check timed out" };
  }
}

async function checkTables(url: string, serviceRoleKey: string, tables: string[]) {
  return Promise.all(tables.map((table) => checkTable(url, serviceRoleKey, table)));
}

export async function GET() {
  const startedAt = Date.now();
  const envReady = process.env.NODE_ENV === "production" ? productionEnvIsReady() : true;
  const supabaseConfig = getSupabaseConfig();
  const coreTableChecks: TableCheck[] = supabaseConfig.configured
    ? await checkTables(supabaseConfig.url, supabaseConfig.serviceRoleKey, coreRequiredTables)
    : coreRequiredTables.map((table) => ({ table, ok: false, status: null, error: "Supabase URL or service role key is not configured." }));
  const optionalTableChecks: TableCheck[] = supabaseConfig.configured
    ? await checkTables(supabaseConfig.url, supabaseConfig.serviceRoleKey, optionalModuleTables)
    : optionalModuleTables.map((table) => ({ table, ok: false, status: null, error: "Supabase URL or service role key is not configured." }));
  const failedCoreTables = coreTableChecks.filter((check) => !check.ok);
  const failedOptionalTables = optionalTableChecks.filter((check) => !check.ok);
  const databaseReady = supabaseConfig.configured && failedCoreTables.length === 0;
  const optionalDatabaseReady = supabaseConfig.configured && failedOptionalTables.length === 0;
  const ok = envReady && databaseReady;

  return NextResponse.json(
    {
      ok,
      service: "nanofix-v28-unified-website-admin",
      version: "28.9-production-api-health-hotfix",
      runtime: "edge",
      environment: process.env.NODE_ENV || "development",
      env_ready: envReady,
      database_ready: databaseReady,
      optional_database_ready: optionalDatabaseReady,
      supabase_configured: supabaseConfig.configured,
      failed_core_tables: failedCoreTables.map((check) => check.table),
      failed_optional_tables: failedOptionalTables.map((check) => check.table),
      checks: envChecks.map((check) => ({
        name: check.name,
        configured: check.configured,
        required_for_production: check.requiredForProduction,
        description: check.description
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
