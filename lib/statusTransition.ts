type StatusTransitionInsertResult = {
  error?: { message?: string } | null;
} | null;

type StatusTransitionTableClient = {
  insert(values: Record<string, unknown>): PromiseLike<StatusTransitionInsertResult>;
};

type StatusTransitionClient = {
  from(table: string): StatusTransitionTableClient;
};

type WriteStatusTransitionLogInput = {
  supabase: unknown;
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

function asStatusTransitionClient(value: unknown): StatusTransitionClient | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { from?: unknown };
  if (typeof candidate.from !== 'function') return null;
  return value as StatusTransitionClient;
}

/**
 * Writes a real status transition log for V28.5 service-chain state changes.
 * This helper accepts an existing Supabase admin client and avoids browser state.
 */
export async function writeStatusTransitionLog(input: WriteStatusTransitionLogInput) {
  const supabase = asStatusTransitionClient(input.supabase);
  if (!supabase || !input.objectId || !input.toStatus) return;

  const payload = {
    machine: input.machine,
    object_type: input.objectType,
    object_id: input.objectId,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus,
    reason: input.reason ?? null,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? null,
    ip_address: input.ip ?? null
  };

  const result = await supabase.from('status_transition_logs').insert(payload);
  if (result?.error) throw new Error(result.error.message || 'Status transition log write failed');
}
