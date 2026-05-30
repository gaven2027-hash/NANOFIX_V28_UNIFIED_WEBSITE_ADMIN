import { NextResponse } from "next/server";
import { envChecks, productionEnvIsReady } from "@/lib/nanofix/env";

export const dynamic = "force-dynamic";

const requiredTables = [
  "profiles",
  "customers",
  "unified_intake",
  "leads",
  "service_requests",
  "jobs",
  "content_drafts",
  "ai_logs",
  "backup_jobs",
  "audit_logs",
  "app_modules",
  "automation_rules",
  "notification_outbox",
  "internal_inbox_messages",
  "unified_tasks",
  "task_events",
  "workflow_settings",
  "service_inspections",
  "service_upload_reviews",
  "quotation_acceptances",
  "quotation_customer_responses",
  "customer_portal_requests",
  "customer_document_feedback",
  "payment_intents",
  "payment_webhook_events",
  "payment_checkout_sessions",
  "invoice_pdf_documents",
  "quotation_pdf_documents",
  "document_company_settings"
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

async function checkTable(url: string, serviceRoleKey: string, table: string): Promise<TableCheck> {
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=created_at&limit=1`, {
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
    return { table, ok: false, status: null, error: error instanceof Error ? error.message : "Unknown Supabase table check error" };
  }
}

export async function GET() {
  const envReady = process.env.NODE_ENV === "production" ? productionEnvIsReady() : true;
  const supabaseConfig = getSupabaseConfig();
  const tableChecks: TableCheck[] = supabaseConfig.configured
    ? await Promise.all(requiredTables.map((table) => checkTable(supabaseConfig.url, supabaseConfig.serviceRoleKey, table)))
    : requiredTables.map((table) => ({ table, ok: false, status: null, error: "Supabase URL or service role key is not configured." }));
  const dbReady = supabaseConfig.configured && tableChecks.every((check) => check.ok);
  const ok = envReady && dbReady;
  return NextResponse.json(
    {
      ok,
      service: "nanofix-v28-unified-website-admin",
      version: "28.2.0-automation-inbox-task-engine",
      environment: process.env.NODE_ENV || "development",
      env_ready: envReady,
      database_ready: dbReady,
      supabase_configured: supabaseConfig.configured,
      checks: envChecks.map((check) => ({
        name: check.name,
        configured: check.configured,
        required_for_production: check.requiredForProduction,
        description: check.description
      })),
      required_tables: tableChecks,
      timestamp: new Date().toISOString()
    },
    { status: ok ? 200 : 503 }
  );
}
