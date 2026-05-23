import { z } from "zod";
import { ok, fail, readJsonOrForm, validationError } from "@/lib/nanofix/api";
import { requirePermission } from "@/lib/nanofix/rbac";
import { createSupabaseAdminClient, auditLog } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const SuggestionSchema = z.object({
  service_request_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  match_score: z.coerce.number().min(0).max(100),
  match_reasons: z.array(z.string()).default([]),
  status: z.enum(["suggested", "approved", "rejected"]).default("suggested")
});

export async function GET(request: Request) {
  const permission = requirePermission(request, "customer.bind");
  if (permission.denied) return permission.denied;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for binding suggestion reads", 503);

  const { data, error } = await supabase
    .from("customer_binding_suggestions")
    .select("suggestion_id,service_request_id,customer_id,match_score,match_reasons,status,reviewed_by,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return fail("Could not read binding suggestions", 500);
  return ok({ storage: "supabase", suggestions: data });
}

export async function POST(request: Request) {
  const permission = requirePermission(request, "customer.bind");
  if (permission.denied) return permission.denied;
  const payload = await readJsonOrForm(request);
  const parsed = SuggestionSchema.safeParse(payload);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured", 503);

  const { data, error } = await supabase
    .from("customer_binding_suggestions")
    .upsert({ ...parsed.data, reviewed_by: parsed.data.status === "suggested" ? null : permission.role, updated_at: new Date().toISOString() }, { onConflict: "service_request_id,customer_id" })
    .select("suggestion_id")
    .single();

  if (error) return fail("Binding suggestion write failed", 500);
  await auditLog({
    actor_role: permission.role,
    action: `customer_binding.${parsed.data.status}`,
    target_table: "customer_binding_suggestions",
    target_id: data?.suggestion_id ?? null,
    metadata: parsed.data
  });
  return ok({ storage: "supabase", suggestion_id: data?.suggestion_id ?? null });
}
