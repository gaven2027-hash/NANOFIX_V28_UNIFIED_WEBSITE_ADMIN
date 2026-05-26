import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const messageColumns = 'message_id,lead_id,customer_id,channel,external_message_id,external_thread_id,direction,body,risk_level,handling_status,reply_status,last_reply_id,follow_up_note,ai_intent,ai_summary,ai_reply_suggestion,ai_confidence_percent,risk_score_percent,sla_due_at,sla_status,created_at,updated_at';
const replyColumns = 'reply_id,message_id,channel,external_message_id,external_reply_id,provider,reply_body,reply_type,dispatch_status,provider_payload,ai_generated,human_approved,created_by,approved_by,sent_by,sent_at,failure_reason,created_at,updated_at';
const providers = ['manual','whatsapp_business_api','meta_graph_api','google_business_profile_api','website_live_chat','custom_webhook'];
const replyTypes = ['draft','manual_sent','api_queued','api_sent','failed','internal_note'];
const dispatchStatuses = ['draft','manual_required','queued','sent','failed','blocked'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanText(value: unknown, fallback = '', max = 8000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function safeJson(value: unknown, fallback: Payload = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value as Payload;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Payload; } catch { return fallback; }
  }
  return fallback;
}

function cleanProvider(value: unknown) {
  const provider = cleanText(value, 'manual', 80).toLowerCase();
  return providers.includes(provider) ? provider : 'manual';
}

function cleanReplyType(value: unknown, fallback = 'draft') {
  const replyType = cleanText(value, fallback, 80).toLowerCase();
  return replyTypes.includes(replyType) ? replyType : fallback;
}

function cleanDispatch(value: unknown, fallback = 'draft') {
  const dispatch = cleanText(value, fallback, 80).toLowerCase();
  return dispatchStatuses.includes(dispatch) ? dispatch : fallback;
}

async function readMessage(supabase: ReturnType<typeof createSupabaseAdminClient>, messageId: string) {
  if (!supabase) return { data: null, error: { message: 'Supabase server client is not configured.' } };
  return supabase.from('social_messages').select(messageColumns).eq('message_id', messageId).maybeSingle();
}

function buildReplyPayload(body: Payload, message: Payload, actorId?: string) {
  const replyBody = cleanText(body.reply_body || body.body || message.ai_reply_suggestion, '', 8000);
  if (!replyBody) throw new Error('Reply body is required.');
  const provider = cleanProvider(body.provider);
  const requestedType = cleanReplyType(body.reply_type, 'draft');
  const requestedDispatch = cleanDispatch(body.dispatch_status, requestedType === 'manual_sent' ? 'sent' : 'draft');
  const humanApproved = body.human_approved === true || requestedType === 'manual_sent';

  return {
    message_id: message.message_id,
    channel: cleanText(body.channel, String(message.channel || 'manual'), 80),
    external_message_id: cleanText(body.external_message_id, String(message.external_message_id || ''), 240) || null,
    provider,
    reply_body: replyBody,
    reply_type: requestedType,
    dispatch_status: requestedDispatch,
    provider_payload: safeJson(body.provider_payload, { ai_auto_reply_allowed: false, human_review_required: true }),
    ai_generated: body.ai_generated === true,
    human_approved: humanApproved,
    created_by: validUuid(actorId) ? actorId : null,
    approved_by: humanApproved && validUuid(actorId) ? actorId : null,
    sent_by: ['manual_sent','api_sent'].includes(requestedType) && validUuid(actorId) ? actorId : null,
    sent_at: ['manual_sent','api_sent'].includes(requestedType) ? new Date().toISOString() : null,
    failure_reason: cleanText(body.failure_reason, '', 1000) || null
  };
}

function nextMessagePatch(reply: Payload) {
  if (reply.dispatch_status === 'sent' || reply.reply_type === 'manual_sent' || reply.reply_type === 'api_sent') {
    return { reply_status: 'sent', handling_status: 'replied', handled_at: new Date().toISOString() };
  }
  if (reply.dispatch_status === 'queued' || reply.reply_type === 'api_queued') {
    return { reply_status: 'queued', handling_status: 'in_progress' };
  }
  if (reply.dispatch_status === 'failed' || reply.reply_type === 'failed') {
    return { reply_status: 'failed', handling_status: 'in_progress' };
  }
  if (reply.reply_type === 'internal_note') {
    return { handling_status: 'in_progress' };
  }
  return { reply_status: 'pending_human_review', handling_status: 'pending_review' };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const url = new URL(request.url);
  const messageId = url.searchParams.get('message_id') || '';
  if (!validUuid(messageId)) return jsonError('A valid message_id is required.');
  const { data, error } = await supabase.from('social_message_replies').select(replyColumns).eq('message_id', messageId).order('created_at', { ascending: false }).limit(80);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, replies: data || [] });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const messageId = String(body.message_id || '');
  if (!validUuid(messageId)) return jsonError('A valid message_id is required.');
  const { data: message, error: messageError } = await readMessage(supabase, messageId);
  if (messageError) return jsonError(messageError.message || 'Message lookup failed.', 500);
  if (!message) return jsonError('Social message not found.', 404);

  let payload: Payload;
  try {
    payload = buildReplyPayload(body, message as Payload, context?.actorId);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid reply payload.');
  }

  const { data: reply, error } = await supabase.from('social_message_replies').insert(payload).select(replyColumns).single();
  if (error) return jsonError(error.message, 500);

  const patch = { ...nextMessagePatch(reply as Payload), last_reply_id: reply.reply_id, handled_by: validUuid(context?.actorId) ? context?.actorId : null, updated_at: new Date().toISOString() };
  const { data: updatedMessage, error: updateError } = await supabase.from('social_messages').update(patch).eq('message_id', messageId).select(messageColumns).single();
  if (updateError) return jsonError(updateError.message, 500);

  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_social_message_reply', object_type: 'social_message_reply', object_id: reply.reply_id, after_data: { reply, message: updatedMessage, ai_auto_reply_allowed: false } });

  return NextResponse.json({ ok: true, reply, message: updatedMessage });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const replyId = String(body.reply_id || '');
  if (!validUuid(replyId)) return jsonError('A valid reply_id is required.');
  const { data: before, error: beforeError } = await supabase.from('social_message_replies').select(replyColumns).eq('reply_id', replyId).maybeSingle();
  if (beforeError) return jsonError(beforeError.message, 500);
  if (!before) return jsonError('Reply not found.', 404);

  const patch: Payload = {
    reply_body: cleanText(body.reply_body, String(before.reply_body || ''), 8000),
    provider: cleanProvider(body.provider || before.provider),
    reply_type: cleanReplyType(body.reply_type || before.reply_type, String(before.reply_type || 'draft')),
    dispatch_status: cleanDispatch(body.dispatch_status || before.dispatch_status, String(before.dispatch_status || 'draft')),
    provider_payload: safeJson(body.provider_payload || before.provider_payload, {}),
    human_approved: body.human_approved === true || before.human_approved === true,
    approved_by: body.human_approved === true && validUuid(context?.actorId) ? context?.actorId : before.approved_by,
    sent_by: ['manual_sent','api_sent'].includes(String(body.reply_type || before.reply_type)) && validUuid(context?.actorId) ? context?.actorId : before.sent_by,
    sent_at: ['manual_sent','api_sent'].includes(String(body.reply_type || before.reply_type)) ? new Date().toISOString() : before.sent_at,
    failure_reason: cleanText(body.failure_reason, String(before.failure_reason || ''), 1000) || null
  };

  const { data: reply, error } = await supabase.from('social_message_replies').update(patch).eq('reply_id', replyId).select(replyColumns).single();
  if (error) return jsonError(error.message, 500);

  const messagePatch = { ...nextMessagePatch(reply as Payload), last_reply_id: reply.reply_id, handled_by: validUuid(context?.actorId) ? context?.actorId : null, updated_at: new Date().toISOString() };
  const { data: updatedMessage, error: updateError } = await supabase.from('social_messages').update(messagePatch).eq('message_id', reply.message_id).select(messageColumns).single();
  if (updateError) return jsonError(updateError.message, 500);

  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_social_message_reply', object_type: 'social_message_reply', object_id: replyId, before_data: before, after_data: { reply, message: updatedMessage } });

  return NextResponse.json({ ok: true, reply, message: updatedMessage });
}
