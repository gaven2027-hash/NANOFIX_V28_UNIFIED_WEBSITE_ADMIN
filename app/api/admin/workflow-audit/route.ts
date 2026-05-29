export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const WORKFLOW_OBJECT_TYPES = [
  'automation_notification_engine',
  'automation_rule',
  'notification_outbox',
  'internal_inbox',
  'internal_inbox_message',
  'unified_task',
  'global_search'
];

function clampLimit(value: string | null) {
  const parsed = Number(value ?? 20);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.floor(parsed), 1), 100);
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer']);
  if (!auth.ok) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const limit = clampLimit(searchParams.get('limit'));
  const taskId = cleanText(searchParams.get('task_id'), 120);
  const objectType = cleanText(searchParams.get('object_type'), 80);
  const supabase = createAdminClient();

  let taskEventsQuery = supabase
    .from('task_events')
    .select('event_id,task_id,actor_id,action,before_json,after_json,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (taskId) taskEventsQuery = taskEventsQuery.eq('task_id', taskId);

  let auditQuery = supabase
    .from('audit_logs')
    .select('audit_id,actor_id,actor_role,role,action,object_type,object_id,before_data,after_data,before_json,after_json,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (objectType) auditQuery = auditQuery.eq('object_type', objectType);
  else auditQuery = auditQuery.in('object_type', WORKFLOW_OBJECT_TYPES);

  const outboxQuery = supabase
    .from('notification_outbox')
    .select('notification_id,channel,target_role,subject,delivery_status,attempt_count,last_error,scheduled_at,sent_at,related_object_type,related_object_id,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  const [taskEventsResult, auditResult, outboxResult] = await Promise.all([taskEventsQuery, auditQuery, outboxQuery]);
  const errors = [taskEventsResult.error?.message, auditResult.error?.message, outboxResult.error?.message].filter(Boolean);
  const ok = errors.length === 0;

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'workflow_audit_trail_read',
    objectType: 'workflow_audit_trail',
    after: { limit, task_id: taskId, object_type: objectType, ok }
  }).catch(() => undefined);

  if (!ok) {
    return NextResponse.json(
      {
        ok: false,
        errors,
        task_events: taskEventsResult.data ?? [],
        audit_logs: auditResult.data ?? [],
        notification_delivery: outboxResult.data ?? []
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    task_events: taskEventsResult.data ?? [],
    audit_logs: auditResult.data ?? [],
    notification_delivery: outboxResult.data ?? []
  });
}
