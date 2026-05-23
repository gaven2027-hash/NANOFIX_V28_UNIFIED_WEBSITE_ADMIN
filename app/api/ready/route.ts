import { NextResponse } from "next/server";
import { envChecks, productionEnvIsReady } from "@/lib/nanofix/env";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

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
  "app_modules"
];

export async function GET() {
  const envReady = process.env.NODE_ENV === "production" ? productionEnvIsReady() : true;
  const supabase = createSupabaseAdminClient();
  const tableChecks = [] as Array<{ table: string; ok: boolean; error: string | null }>;

  if (supabase) {
    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select("created_at", { count: "exact", head: true }).limit(1);
      tableChecks.push({ table, ok: !error, error: error?.message || null });
    }
  }

  const dbReady = Boolean(supabase) && tableChecks.every((check) => check.ok);
  const ok = envReady && dbReady;

  return NextResponse.json(
    {
      ok,
      service: "nanofix-v28-unified-website-admin",
      version: "28.0.3-unified-stable",
      environment: process.env.NODE_ENV || "development",
      env_ready: envReady,
      database_ready: dbReady,
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
