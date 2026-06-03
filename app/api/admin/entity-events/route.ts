import { ok, fail, readJsonOrForm, validationError } from "@/lib/nanofix/api";
import { requirePermission } from "@/lib/nanofix/rbac";
import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { emitEntityEvent, EntityEventSchema } from "@/lib/nanofix/system-events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const permission = requirePermission(request, "module_health.read");
  if (permission.denied) return permission.denied;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for entity event reads", 503);

  const url = new URL(request.url);
  const moduleKey = url.searchParams.get("module_key");
  let query = supabase
    .from("entity_events")
    .select("event_id, topic, entity_type, entity_id, module_key, actor_role, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (moduleKey) query = query.eq("module_key", moduleKey);
  const { data, error } = await query;
  if (error) return fail("Could not read entity events", 500);
  return ok({ storage: "supabase", events: data });
}

export async function POST(request: Request) {
  const permission = requirePermission(request, "entity_event.write");
  if (permission.denied) return permission.denied;

  const payload = await readJsonOrForm(request);
  const parsed = EntityEventSchema.safeParse({ ...payload, actor_role: (payload as Record<string, unknown>).actor_role || permission.role });
  if (!parsed.success) return validationError(parsed.error);

  const result = await emitEntityEvent(parsed.data);
  if (result.skipped) return fail("Supabase is not configured for entity event writes", 503);
  if (result.error) return fail("Entity event write failed", 500);

  await auditLog({
    actor_role: permission.role,
    action: 'entity_event.created',
    target_table: 'entity_events',
    target_id: result.data?.event_id ?? null,
    metadata: {
      topic: parsed.data.topic,
      entity_type: parsed.data.entity_type,
      entity_id: parsed.data.entity_id || null,
      module_key: parsed.data.module_key,
      outbox_queued: true
    }
  }).catch(() => undefined);

  return ok({ storage: "supabase", event_id: result.data?.event_id ?? null });
}
