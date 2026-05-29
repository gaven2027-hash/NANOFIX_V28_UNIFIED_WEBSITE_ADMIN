export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

type CountResult = { table: string; count: number | null; ok: boolean; error: string | null };

async function countRows(table: string): Promise<CountResult> {
  const supabase = createAdminClient();
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return { table, count: count ?? null, ok: !error, error: error?.message ?? null };
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer']);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const [ruleCount, outboxCount, inboxCount, taskCount] = await Promise.all([
    countRows('automation_rules'),
    countRows('notification_outbox'),
    countRows('internal_inbox_messages'),
    countRows('unified_tasks')
  ]);

  const { data: rules, error: rulesError } = await supabase
    .from('automation_rules')
    .select('rule_id,rule_key,name,module,trigger_event,is_enabled,priority,created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: outbox, error: outboxError } = await supabase
    .from('notification_outbox')
    .select('notification_id,channel,target_role,subject,delivery_status,attempt_count,scheduled_at,created_at')
    .order('created_at', { ascending: false })
    .limit(12);

  const checks = [ruleCount, outboxCount, inboxCount, taskCount];
  const databaseReady = checks.every((check) => check.ok) && !rulesError && !outboxError;

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'automation_notification_engine_read',
    objectType: 'automation_notification_engine',
    after: { database_ready: databaseReady }
  }).catch(() => undefined);

  return NextResponse.json(
    {
      ok: databaseReady,
      database_ready: databaseReady,
      checks,
      rules: rules ?? [],
      outbox: outbox ?? [],
      errors: [rulesError?.message, outboxError?.message, ...checks.map((check) => check.error)].filter(Boolean)
    },
    { status: databaseReady ? 200 : 503 }
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'content_admin', 'support']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = cleanText(body.action, 60) ?? 'enqueue_notification';
  const supabase = createAdminClient();

  if (action === 'create_rule') {
    const ruleKey = cleanText(body.rule_key, 120);
    const name = cleanText(body.name, 160);
    const moduleName = cleanText(body.module, 80);
    const triggerEvent = cleanText(body.trigger_event, 120);
    const priority = cleanText(body.priority, 10) ?? 'P2';
    if (!ruleKey || !name || !moduleName || !triggerEvent) return jsonError('rule_key, name, module and trigger_event are required.', 400);

    const { data, error } = await supabase
      .from('automation_rules')
      .insert({ rule_key: ruleKey, name, module: moduleName, trigger_event: triggerEvent, priority, created_by: auth.actor.profileId })
      .select('rule_id,rule_key,name,module,trigger_event,is_enabled,priority,created_at')
      .single();
    if (error) return jsonError(error.message, 500);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'automation_rule_create', objectType: 'automation_rule', objectId: data.rule_id, after: data });
    return NextResponse.json({ ok: true, rule: data }, { status: 201 });
  }

  const subject = cleanText(body.subject, 180);
  const message = cleanText(body.body, 2000);
  const targetRole = cleanText(body.target_role, 60);
  const channel = cleanText(body.channel, 40) ?? 'internal';
  const relatedObjectType = cleanText(body.related_object_type, 80);
  const relatedObjectId = cleanText(body.related_object_id, 120);
  if (!subject || !message || !targetRole) return jsonError('subject, body and target_role are required.', 400);

  const { data, error } = await supabase
    .from('notification_outbox')
    .insert({ channel, target_role: targetRole, subject, body: message, related_object_type: relatedObjectType, related_object_id: relatedObjectId, delivery_status: 'queued' })
    .select('notification_id,channel,target_role,subject,delivery_status,created_at')
    .single();
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'notification_enqueue', objectType: 'notification_outbox', objectId: data.notification_id, after: data });
  return NextResponse.json({ ok: true, notification: data }, { status: 201 });
}
