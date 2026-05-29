export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

function roleCanReadAll(role: string) {
  return ['super_admin', 'operations_admin', 'support'].includes(role);
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer']);
  if (!auth.ok) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const status = cleanText(searchParams.get('status'), 40);
  const moduleName = cleanText(searchParams.get('module'), 80);
  const assigneeRole = cleanText(searchParams.get('assignee_role'), 60);
  const limit = Math.min(Number(searchParams.get('limit') ?? 40) || 40, 100);
  const supabase = createAdminClient();

  let query = supabase
    .from('unified_tasks')
    .select('task_id,source_module,source_table,source_id,title,description,status,priority,assignee_profile_id,assignee_role,due_at,sla_minutes,escalated_at,completed_at,metadata_json,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (moduleName) query = query.eq('source_module', moduleName);
  if (assigneeRole) query = query.eq('assignee_role', assigneeRole);

  if (!roleCanReadAll(auth.role)) {
    query = query.or(`assignee_profile_id.eq.${auth.actor.profileId},assignee_role.eq.${auth.role}`);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'unified_tasks_read', objectType: 'unified_task', after: { status, module: moduleName, assignee_role: assigneeRole, count: data?.length ?? 0 } }).catch(() => undefined);
  return NextResponse.json({ ok: true, tasks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const sourceModule = cleanText(body.source_module, 80);
  const sourceTable = cleanText(body.source_table, 80);
  const sourceId = cleanText(body.source_id, 120);
  const title = cleanText(body.title, 180);
  const description = cleanText(body.description, 2000);
  const priority = cleanText(body.priority, 10) ?? 'P2';
  const assigneeRole = cleanText(body.assignee_role, 60);
  const dueAt = cleanText(body.due_at, 80);
  const slaMinutes = typeof body.sla_minutes === 'number' ? Math.max(0, Math.floor(body.sla_minutes)) : null;
  if (!sourceModule || !title) return jsonError('source_module and title are required.', 400);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('unified_tasks')
    .insert({ source_module: sourceModule, source_table: sourceTable, source_id: sourceId, title, description, priority, assignee_role: assigneeRole, due_at: dueAt, sla_minutes: slaMinutes, created_by: auth.actor.profileId, status: 'open' })
    .select('task_id,source_module,title,status,priority,assignee_role,due_at,created_at')
    .single();
  if (error) return jsonError(error.message, 500);

  const { error: eventError } = await supabase.from('task_events').insert({ task_id: data.task_id, actor_id: auth.actor.profileId, action: 'created', after_json: data });
  if (eventError) return jsonError(eventError.message, 500);

  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'unified_task_create', objectType: 'unified_task', objectId: data.task_id, after: data });
  return NextResponse.json({ ok: true, task: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const taskId = cleanText(body.task_id, 120);
  if (!taskId) return jsonError('task_id is required.', 400);

  const patch: Record<string, string | null> = {};
  const status = cleanText(body.status, 40);
  const assigneeRole = cleanText(body.assignee_role, 60);
  const assigneeProfileId = cleanText(body.assignee_profile_id, 120);
  if (status) patch.status = status;
  if (assigneeRole) patch.assignee_role = assigneeRole;
  if (assigneeProfileId) patch.assignee_profile_id = assigneeProfileId;
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  if (!Object.keys(patch).length) return jsonError('No supported task fields to update.', 400);

  const supabase = createAdminClient();
  const { data: before } = await supabase.from('unified_tasks').select('task_id,status,assignee_role,assignee_profile_id,completed_at').eq('task_id', taskId).maybeSingle();
  const { data, error } = await supabase
    .from('unified_tasks')
    .update(patch)
    .eq('task_id', taskId)
    .select('task_id,source_module,title,status,priority,assignee_role,assignee_profile_id,completed_at,updated_at')
    .single();
  if (error) return jsonError(error.message, 500);

  const { error: eventError } = await supabase.from('task_events').insert({ task_id: taskId, actor_id: auth.actor.profileId, action: 'updated', before_json: before ?? null, after_json: data });
  if (eventError) return jsonError(eventError.message, 500);

  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'unified_task_update', objectType: 'unified_task', objectId: taskId, before: before ?? null, after: data });
  return NextResponse.json({ ok: true, task: data });
}
