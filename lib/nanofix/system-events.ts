import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const EntityEventSchema = z.object({
  topic: z.string().trim().min(3).max(120),
  entity_type: z.string().trim().min(2).max(80),
  entity_id: z.string().trim().max(120).optional().or(z.literal("")),
  module_key: z.string().trim().min(2).max(80),
  actor_role: z.string().trim().max(80).optional().default("system"),
  payload: z.record(z.unknown()).default({}),
  idempotency_key: z.string().trim().max(160).optional().or(z.literal(""))
});

export type EntityEventInput = z.infer<typeof EntityEventSchema>;

export async function emitEntityEvent(input: EntityEventInput) {
  const parsed = EntityEventSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { skipped: true, data: null, error: null };

  const now = new Date().toISOString();
  const record = {
    topic: parsed.topic,
    entity_type: parsed.entity_type,
    entity_id: parsed.entity_id || null,
    module_key: parsed.module_key,
    actor_role: parsed.actor_role,
    payload: parsed.payload,
    idempotency_key: parsed.idempotency_key || `${parsed.topic}:${parsed.entity_type}:${parsed.entity_id || now}`,
    created_at: now
  };

  const { data, error } = await supabase.from("entity_events").insert(record).select("event_id").single();
  if (!error) {
    await supabase.from("integration_outbox").insert({
      event_type: parsed.topic,
      destination: "module-event-bus",
      payload: { ...parsed.payload, entity_type: parsed.entity_type, entity_id: parsed.entity_id || null, module_key: parsed.module_key },
      status: "queued",
      attempts: 0,
      next_run_at: now,
      created_at: now,
      updated_at: now
    });
  }

  return { skipped: false, data, error };
}
