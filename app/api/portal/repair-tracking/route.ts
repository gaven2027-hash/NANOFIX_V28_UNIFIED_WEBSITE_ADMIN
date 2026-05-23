import { ok, fail } from "@/lib/nanofix/api";
import { createSupabaseAdminClient, auditLog } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer_id");
  const portalToken = request.headers.get("x-nanofix-portal-token");

  if (!customerId || !portalToken) {
    return fail("Customer portal authentication is required", 401);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Customer portal data service is not configured", 503);

  const { data, error } = await supabase
    .from("service_requests")
    .select("service_request_id, status, priority, issue_type, binding_status, created_at, updated_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return fail("Could not read repair tracking records", 500);

  await auditLog({
    actor_role: "customer",
    action: "portal.repair_tracking.viewed",
    target_table: "service_requests",
    target_id: customerId,
    metadata: { result_count: data?.length ?? 0 }
  });

  return ok({ customer_id: customerId, requests: data });
}
