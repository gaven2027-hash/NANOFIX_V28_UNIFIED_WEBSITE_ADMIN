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
  const role = cleanText(searchParams.get('role'), 60);
  const limit = Math.min(Number(searchParams.get('limit') ?? 30) || 30, 100);
  const supabase = createAdminClient();

  let query = supabase
    .from('internal_inbox_messages')
    .select('message_id,recipient_profile_id,recipient_role,sender_profile_id,subject,category,priority,read_at,acknowledged_at,related_object_type,related_object_id,task_id,created_at,archived_at')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status === 'unread') query = query.is('read_at', null);
  if (status === 'ack_required') query = query.is('acknowledged_at', null);
  if (role) query = query.eq('recipient_role', role);

  if (!roleCanReadAll(auth.role)) {
    query = query.or(`recipient_profile_id.eq.${auth.actor.profileId},recipient_role.eq.${auth.role}`);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'internal_inbox_read',
    objectType: 'internal_inbox',
    after: { status, role, count: data?.length ?? 0 }
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, messages: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = cleanText(body.action, 60) ?? 'create_message';
  const supabase = createAdminClient();

  if (action === 'acknowledge' || action === 'mark_read' || action === 'archive') {
    const messageId = cleanText(body.message_id, 120);
    if (!messageId) return jsonError('message_id is required.', 400);

    const patch: Record<string, string> = {};
    if (action === 'acknowledge') patch.acknowledged_at = new Date().toISOString();
    if (action === 'mark_read') patch.read_at = new Date().toISOString();
    if (action === 'archive') patch.archived_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('internal_inbox_messages')
      .update(patch)
      .eq('message_id', messageId)
      .select('message_id,subject,recipient_role,priority,read_at,acknowledged_at,archived_at')
      .single();
    if (error) return jsonError(error.message, 500);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: `internal_inbox_${action}`, objectType: 'internal_inbox_message', objectId: messageId, after: data });
    return NextResponse.json({ ok: true, message: data });
  }

  const subject = cleanText(body.subject, 180);
  const message = cleanText(body.body, 2000);
  const recipientRole = cleanText(body.recipient_role, 60);
  const priority = cleanText(body.priority, 10) ?? 'P2';
  const category = cleanText(body.category, 60) ?? 'general';
  const relatedObjectType = cleanText(body.related_object_type, 80);
  const relatedObjectId = cleanText(body.related_object_id, 120);
  const taskId = cleanText(body.task_id, 120);
  if (!subject || !message || !recipientRole) return jsonError('subject, body and recipient_role are required.', 400);

  const { data, error } = await supabase
    .from('internal_inbox_messages')
    .insert({ sender_profile_id: auth.actor.profileId, recipient_role: recipientRole, subject, body: message, category, priority, related_object_type: relatedObjectType, related_object_id: relatedObjectId, task_id: taskId })
    .select('message_id,recipient_role,subject,category,priority,created_at')
    .single();
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'internal_inbox_create_message', objectType: 'internal_inbox_message', objectId: data.message_id, after: data });
  return NextResponse.json({ ok: true, message: data }, { status: 201 });
}
