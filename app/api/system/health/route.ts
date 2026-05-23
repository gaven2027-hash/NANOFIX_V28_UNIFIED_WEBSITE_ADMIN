import { ok } from "@/lib/nanofix/api";
import { getEnvironmentHealth } from "@/lib/nanofix/health";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = getEnvironmentHealth();
  const supabase = createSupabaseAdminClient();
  let database = { configured: Boolean(supabase), reachable: false, app_modules_registered: 0 };

  if (supabase) {
    const { count, error } = await supabase
      .from("app_modules")
      .select("module_key", { count: "exact", head: true });
    database = {
      configured: true,
      reachable: !error,
      app_modules_registered: count ?? 0
    };
  }

  return ok({
    service: "NANOFIX Unified Business System Foundation",
    ...base,
    database,
    production_target_score: "94-96 when Supabase migrations, RLS policies, Turnstile and Vercel env vars are fully enabled"
  });
}
