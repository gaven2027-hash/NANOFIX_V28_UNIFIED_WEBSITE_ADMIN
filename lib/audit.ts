import { createAdminClient } from './supabase/admin';

export type AuditPayload = {
  actorId?: string;
  role?: string;
  action: string;
  objectType: string;
  objectId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
};

export async function writeAuditLog(payload: AuditPayload) {
  const supabase = createAdminClient();
  await supabase.from('audit_logs').insert({
    actor_id: payload.actorId ?? null,
    role: payload.role ?? 'system',
    action: payload.action,
    object_type: payload.objectType,
    object_id: payload.objectId ?? null,
    before_json: payload.before ?? null,
    after_json: payload.after ?? null,
    ip_address: payload.ip ?? null
  });
}
