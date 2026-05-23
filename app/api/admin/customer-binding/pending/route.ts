import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { ok, fail } from "@/lib/nanofix/api";
import { requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = requireAdmin(request, "read:customers");
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for pending binding records", 503);

  const { data, error } = await supabase
    .from("service_requests")
    .select("service_request_id,lead_id,customer_id,contact_name,phone,whatsapp,email,address_text,issue_type,binding_status,status,created_at")
    .eq("binding_status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return fail("Unable to load pending binding records", 500, error.message);

  return ok({
    pending: data ?? [],
    match_rules: ["phone", "whatsapp", "email", "name", "address", "submit time"],
    storage: "supabase"
  });
}
