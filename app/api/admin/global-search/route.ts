import { ok, fail } from "@/lib/nanofix/api";
import { requirePermission } from "@/lib/nanofix/rbac";
import { createSupabaseAdminClient, auditLog } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const permission = requirePermission(request, "search.read");
  if (permission.denied) return permission.denied;

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").replace(/[\\%_(),.*:;{}[\]"'<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const filter = (url.searchParams.get("filter") || "all").trim();
  if (query.length < 2) return fail("Search query must contain at least 2 characters", 400);

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured. Global search must query the unified search index.", 503);

  const { data, error } = await supabase
    .from("global_search_documents")
    .select("document_id, entity_type, entity_id, module_key, title, subtitle, route_path, priority, updated_at")
    .or(`title.ilike.%${query}%,subtitle.ilike.%${query}%,search_text.ilike.%${query}%`)
    .limit(30);

  if (error) return fail("Global search query failed", 500, error.message);

  const results = (data ?? []).map((item) => ({
    type: item.entity_type,
    id: item.entity_id,
    module_key: item.module_key,
    title: item.title,
    subtitle: item.subtitle,
    route: item.route_path,
    priority: item.priority,
    updated_at: item.updated_at,
    source: "supabase_search_index"
  }));
  const storage = "supabase_search_index";

  await auditLog({
    actor_role: permission.role,
    action: "global_search.executed",
    target_table: "search_logs",
    metadata: { query, filter, result_count: results.length, storage }
  });

  return ok({ query, filter, result_count: results.length, storage, results });
}

export async function POST() {
  return fail("Use GET for search. Export must go through a dedicated audited export endpoint.", 405);
}
