type StatusTransitionInsertResult = {
  error: { message?: string } | null;
};

type StatusTransitionInsertBuilder = {
  insert(values: Record<string, unknown>): PromiseLike<StatusTransitionInsertResult>;
};

type StatusTransitionSupabaseClient = {
  from(table: 'status_transition_logs'): StatusTransitionInsertBuilder;
};

type WriteStatusTransitionLogInput = {
  supabase: StatusTransitionSupabaseClient | null | undefined;
  machine: string;
  objectType: string;
  objectId: string | null | undefined;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  ip?: string | null;
};

/**
 * Writes a real status transition log for V28.5 service-chain state changes.
 *
 * This helper is intentionally small and accepts an existing Supabase admin client so
 * route handlers can write the business row, audit log, and status log in the same
 * request flow without introducing browser/localStorage state or fake success.
 */
export async function writeStatusTransitionLog(input: WriteStatusTransitionLogInput) {
  if (!input.supabase || !input.objectId || !input.toStatus) return;

  const { error } = await input.supabase
    .from('status_transition_logs')
    .insert({
      machine: input.machine,
      object_type: input.objectType,
      object_id: input.objectId,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus,
      reason: input.reason ?? null,
      actor_id: input.actorId ?? null,
      actor_role: input.actorRole ?? null,
      ip_address: input.ip ?? null
    });

  if (error) throw new Error(error.message || 'Status transition log write failed');
}
