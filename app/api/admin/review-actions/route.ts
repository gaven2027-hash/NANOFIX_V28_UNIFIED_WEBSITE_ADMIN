import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const aiColumns = 'draft_id,module,record_id,task,human_review_status,ai_risk_level,admin_note,reviewed_by,reviewed_at,approved_at,rejected_at,created_at';
const socialColumns = 'message_id,lead_id,customer_id,channel,direction,body,risk_level,handling_status,follow_up_note,handled_by,handled_at,lead_conversion_status,created_at';
const eventColumns = 'health_event_id,module_key,check_name,status,message,latency_ms,resolution_status,resolution_note,resolved_by,resolved_at,created_at';
const moduleColumns = 'module_key,name,category,criticality,health_status,enabled,admin_note,last_reviewed_by,last_reviewed_at,updated_at';

const aiStatuses = ['pending_review', 'approved', 'rejected', 'needs_revision'];
const socialStatuses = ['new', 'pending_review', 'in_progress', 'converted_to_lead', 'replied', 'closed', 'spam', 'archived'];
const conversionStatuses = ['not_converted', 'suggested', 'converted', 'not_relevant'];
const resolutionStatuses = ['open', 'investigating', 'resolved', 'ignored', 'escalated'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 8000) : fallback;
}

function cleanKey(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 160) : '';
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:operations');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = cleanText(body.action);
  const now = new Date().toISOString();

  if (action === 'update_ai_draft') {
    const draftId = String(body.draft_id || '');
    if (!validUuid(draftId)) return jsonError('A valid draft_id is required.');
    const status = aiStatuses.includes(String(body.human_review_status)) ? String(body.human_review_status) : 'pending_review';
    const patch: Payload = { human_review_status: status, admin_note: cleanText(body.admin_note), reviewed_by: context?.actorId || null, reviewed_at: now };
    if (status === 'approved') patch.approved_at = now;
    if (status === 'rejected') patch.rejected_at = now;
    const { data: before } = await supabase.from('ai_drafts').select(aiColumns).eq('draft_id', draftId).maybeSingle();
    const { data, error } = await supabase.from('ai_drafts').update(patch).eq('draft_id', draftId).select(aiColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_ai_draft_review', object_type: 'ai_draft', object_id: draftId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, record: data });
  }

  if (action === 'update_social_message') {
    const messageId = String(body.message_id || '');
    if (!validUuid(messageId)) return jsonError('A valid message_id is required.');
    const handlingStatus = socialStatuses.includes(String(body.handling_status)) ? String(body.handling_status) : 'in_progress';
    const leadConversionStatus = conversionStatuses.includes(String(body.lead_conversion_status)) ? String(body.lead_conversion_status) : 'not_converted';
    const patch: Payload = { handling_status: handlingStatus, lead_conversion_status: leadConversionStatus, follow_up_note: cleanText(body.follow_up_note), handled_by: context?.actorId || null, handled_at: now };
    const { data: before } = await supabase.from('social_messages').select(socialColumns).eq('message_id', messageId).maybeSingle();
    const { data, error } = await supabase.from('social_messages').update(patch).eq('message_id', messageId).select(socialColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_social_message', object_type: 'social_message', object_id: messageId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, record: data });
  }

  if (action === 'update_health_event') {
    const eventId = String(body.health_event_id || '');
    if (!validUuid(eventId)) return jsonError('A valid health_event_id is required.');
    const resolutionStatus = resolutionStatuses.includes(String(body.resolution_status)) ? String(body.resolution_status) : 'investigating';
    const patch: Payload = { resolution_status: resolutionStatus, resolution_note: cleanText(body.resolution_note), resolved_by: context?.actorId || null, resolved_at: resolutionStatus === 'resolved' ? now : null };
    const { data: before } = await supabase.from('module_health_events').select(eventColumns).eq('health_event_id', eventId).maybeSingle();
    const { data, error } = await supabase.from('module_health_events').update(patch).eq('health_event_id', eventId).select(eventColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_health_event', object_type: 'module_health_event', object_id: eventId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, record: data });
  }

  if (action === 'update_module_note') {
    const moduleKey = cleanKey(body.module_key);
    if (!moduleKey) return jsonError('A valid module_key is required.');
    const patch = { admin_note: cleanText(body.admin_note), last_reviewed_by: context?.actorId || null, last_reviewed_at: now, updated_at: now };
    const { data: before } = await supabase.from('app_modules').select(moduleColumns).eq('module_key', moduleKey).maybeSingle();
    const { data, error } = await supabase.from('app_modules').update(patch).eq('module_key', moduleKey).select(moduleColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_module_note', object_type: 'app_module', object_id: moduleKey, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, record: data });
  }

  return jsonError('Unsupported action.', 400);
}
