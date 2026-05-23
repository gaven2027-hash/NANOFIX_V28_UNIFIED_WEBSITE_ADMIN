import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const moduleTables: Record<string, string[]> = {
  "public-website": ["seo_routes", "cta_config"],
  "central-admin": ["profiles", "audit_logs", "module_health_events"],
  "service-operations": ["unified_intake", "leads", "service_requests", "jobs"],
  "customer-center": ["customers", "service_requests", "invoices", "warranties"],
  "website-management": ["content_drafts", "seo_routes"],
  "social-media": ["social_messages", "content_drafts"],
  "ai-center": ["ai_drafts", "ai_logs"],
  "backup-download": ["backup_jobs", "backup_schedules"],
  "integration-bus": ["inbound_events", "integration_outbox", "webhook_events"]
};

export async function GET(_request: Request, { params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const tables = moduleTables[module] || [];
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, module, status: "down", error: "Supabase is not configured" }, { status: 503 });
  }

  const checks = await Promise.all(
    tables.map(async (table) => {
      const started = Date.now();
      const { error } = await supabase.from(table).select("created_at", { count: "exact", head: true }).limit(1);
      return { table, ok: !error, latency_ms: Date.now() - started, error: error?.message || null };
    })
  );
  const ok = checks.length > 0 && checks.every((check) => check.ok);
  return NextResponse.json(
    {
      ok,
      module,
      status: ok ? "healthy" : "degraded",
      checked_at: new Date().toISOString(),
      checks
    },
    { status: ok ? 200 : 503 }
  );
}
