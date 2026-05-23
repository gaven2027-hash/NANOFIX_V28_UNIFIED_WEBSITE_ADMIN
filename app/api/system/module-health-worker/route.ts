import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/nanofix/api";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET || process.env.NANOFIX_SYSTEM_WORKER_TOKEN;
  if (!expected) return process.env.NODE_ENV !== "production";
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  return bearer === expected || request.headers.get("x-system-worker-token") === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) return fail("System worker authorization required", 401);
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is required for module health snapshots", 503);
  const { data, error } = await supabase.rpc("record_module_health_snapshot", { p_actor_role: "system_worker" });
  if (error) return fail("Module health snapshot failed", 500, error.message);
  return ok({ storage: "supabase_rpc", snapshot: data });
}

export const GET = POST;
