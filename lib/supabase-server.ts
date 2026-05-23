import { createClient } from "@supabase/supabase-js";

const defaultSelectColumns: Record<string, string> = {
  ai_drafts: "draft_id,module,record_id,task,human_review_status,created_at",
  jobs: "job_id,service_request_id,engineer_id,status,scheduled_at,created_at",
  customers: "customer_id,name,email,phone,whatsapp,status,binding_status,created_at",
  service_requests: "service_request_id,lead_id,customer_id,issue_type,status,binding_status,created_at",
  inbound_events: "inbound_event_id,source,external_event_id,status,received_at",
  entity_events: "event_id,topic,entity_type,entity_id,module_key,created_at",
  integration_outbox: "outbox_id,event_type,destination,status,created_at"
};

export function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function insertIfConfigured<T extends Record<string, unknown> = Record<string, unknown>>(table: string, record: Record<string, unknown>, columns?: string): Promise<{ skipped: boolean; data: T | null; error: { message?: string } | null }> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { skipped: true, data: null, error: null };

  const selectColumns = columns || defaultSelectColumns[table] || "created_at";
  const { data, error } = await supabase.from(table).insert(record).select(selectColumns).single();
  return { skipped: false, data: (data as T | null), error };
}

export async function listIfConfigured<T extends Record<string, unknown> = Record<string, unknown>>(
  table: string,
  options: { limit?: number; orderBy?: string; ascending?: boolean; columns?: string } = {}
) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { skipped: true, data: [], error: null };

  let query = supabase.from(table).select(options.columns || defaultSelectColumns[table] || "created_at").limit(options.limit ?? 50);
  if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false });

  const { data, error } = await query;
  return { skipped: false, data: (data ?? []) as unknown as T[], error };
}

export async function auditLog(record: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  const actorId = typeof record.actor_id === "string" && /^[0-9a-f-]{36}$/i.test(record.actor_id) ? record.actor_id : null;
  const objectId =
    typeof record.target_id === "string" && /^[0-9a-f-]{36}$/i.test(record.target_id)
      ? record.target_id
      : typeof record.object_id === "string" && /^[0-9a-f-]{36}$/i.test(record.object_id)
        ? record.object_id
        : null;

  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    actor_role: String(record.actor_role ?? record.role ?? "system"),
    action: String(record.action ?? "unknown"),
    object_type: String(record.target_table ?? record.object_type ?? "system"),
    object_id: objectId,
    after_data: record.metadata ? record.metadata : record.after_data ?? record.after_json ?? {},
    created_at: new Date().toISOString()
  });
}
