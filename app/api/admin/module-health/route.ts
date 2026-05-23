import { z } from "zod";
import { ok, fail, readJsonOrForm, validationError } from "@/lib/nanofix/api";
import { requirePermission } from "@/lib/nanofix/rbac";
import { createSupabaseAdminClient, auditLog } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ModuleHealthSchema = z.object({
  module_key: z.string().trim().min(2).max(80),
  check_name: z.string().trim().min(2).max(120),
  status: z.enum(["healthy", "degraded", "down", "unknown"]),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  latency_ms: z.coerce.number().int().min(0).max(120000).optional(),
  metadata: z.record(z.unknown()).default({})
});

export async function GET(request: Request) {
  const permission = requirePermission(request, "module_health.read");
  if (permission.denied) return permission.denied;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for module health reads", 503);

  const { data, error } = await supabase
    .from("latest_module_health")
    .select("module_key,check_name,status,message,latency_ms,metadata,created_at")
    .limit(100);

  if (error) return fail("Could not read module health", 500);
  return ok({ storage: "supabase", modules: data });
}

export async function POST(request: Request) {
  const permission = requirePermission(request, "module_health.write");
  if (permission.denied) return permission.denied;

  const payload = await readJsonOrForm(request);
  const parsed = ModuleHealthSchema.safeParse(payload);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for module health writes", 503);

  const { data, error } = await supabase
    .from("module_health_events")
    .insert({ ...parsed.data, created_at: new Date().toISOString() })
    .select("health_event_id")
    .single();

  if (error) return fail("Module health write failed", 500);

  await auditLog({
    actor_role: permission.role,
    action: "module_health.recorded",
    target_table: "module_health_events",
    target_id: data?.health_event_id ?? null,
    metadata: parsed.data
  });

  return ok({ storage: "supabase", health_event_id: data?.health_event_id ?? null });
}
