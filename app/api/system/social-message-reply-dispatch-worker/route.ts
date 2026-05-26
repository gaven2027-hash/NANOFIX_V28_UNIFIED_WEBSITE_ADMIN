import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { fail, ok } from '@/lib/nanofix/api';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

const replyColumns = 'reply_id,message_id,channel,external_message_id,external_reply_id,provider,reply_body,reply_type,dispatch_status,provider_payload,ai_generated,human_approved,created_by,approved_by,sent_by,sent_at,failure_reason,dispatch_attempt_count,last_dispatch_attempt_at,next_retry_at,provider_response_json,created_at,updated_at';
const messageColumns = 'message_id,lead_id,customer_id,channel,external_message_id,external_thread_id,direction,body,risk_level,handling_status,reply_status,last_reply_id,follow_up_note,handled_by,handled_at,lead_conversion_status,created_at,updated_at';
const accountColumns = 'social_account_id,platform,account_name,account_handle,business_id,page_id,app_id,connection_status,is_active,webhook_url,api_base_url,access_token_secret_name,settings_json,last_checked_at,updated_at';

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET || process.env.NANOFIX_SYSTEM_WORKER_TOKEN;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  return bearer === expected || request.headers.get('x-system-worker-token') === expected;
}

function safeLimit(value: unknown) {
  const n = Number(value || 5);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(20, Math.floor(n)));
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function getProviderToken(secretName: unknown) {
  const key = text(secretName);
  if (!key) return '';
  return process.env[key] || '';
}

function nextRetryIso(attempts: number) {
  const minutes = attempts <= 1 ? 5 : attempts === 2 ? 15 : attempts === 3 ? 60 : 240;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function safePayload(value: unknown) {
  return value && typeof value === 'object' ? value as Row : {};
}

function replyMediaAssets(reply: Row) {
  const payload = safePayload(reply.provider_payload);
  return Array.isArray(payload.reply_media_assets) ? payload.reply_media_assets : [];
}

async function loadAccount(channel: string, provider: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase server client is not configured.');
  const platform = channel === 'website_whatsapp' ? 'whatsapp' : channel;
  let query = supabase
    .from('social_accounts')
    .select(accountColumns)
    .eq('platform', platform)
    .eq('is_active', true)
    .eq('connection_status', 'connected')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (provider === 'website_live_chat') query = query.eq('platform', 'website_live_chat');
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || [])[0] as Row | undefined;
}

async function callReplyProvider(reply: Row, message: Row, account: Row) {
  const provider = text(reply.provider, 'manual');
  const settings = safePayload(account.settings_json);
  const replyPayload = safePayload(reply.provider_payload);
  const mediaAssets = replyMediaAssets(reply);
  const endpoint = text(replyPayload.dispatch_endpoint)
    || text(settings.reply_dispatch_endpoint)
    || text(account.webhook_url)
    || text(account.api_base_url);
  const token = getProviderToken(account.access_token_secret_name) || text(replyPayload.dispatch_token) || process.env.NANOFIX_SOCIAL_REPLY_DISPATCH_TOKEN || '';

  if (!endpoint) {
    return { ok: false, skipped: true, error: `No dispatch endpoint configured for provider ${provider}.` };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-nanofix-provider': provider,
      'x-nanofix-dispatch-type': 'social-message-reply'
    },
    body: JSON.stringify({
      contract_version: 'v28.1.3-social-message-reply-dispatch-2',
      reply_id: reply.reply_id,
      message_id: reply.message_id,
      provider,
      channel: reply.channel || message.channel,
      external_message_id: reply.external_message_id || message.external_message_id,
      external_thread_id: message.external_thread_id,
      reply_body: reply.reply_body,
      reply_media_assets: mediaAssets,
      reply_has_media_assets: mediaAssets.length > 0,
      media_source_picker_required: true,
      human_approved: true,
      ai_auto_reply_allowed: false,
      account: {
        social_account_id: account.social_account_id,
        platform: account.platform,
        account_name: account.account_name,
        page_id: account.page_id,
        business_id: account.business_id,
        app_id: account.app_id
      }
    })
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) {
    return { ok: false, error: json.error || `Dispatch endpoint returned HTTP ${response.status}`, response: json };
  }
  return {
    ok: true,
    response: json,
    external_reply_id: text(json.external_reply_id || json.reply_id || json.id || json.message_id, '') || null,
    sent_at: text(json.sent_at, new Date().toISOString())
  };
}

async function markFailed(reply: Row, message: Row, reason: string, providerResponse: unknown) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase server client is not configured.');
  const attempts = Number(reply.dispatch_attempt_count || 0) + 1;
  const retryable = attempts < 4;
  const replyPatch = {
    dispatch_status: retryable ? 'queued' : 'failed',
    reply_type: retryable ? 'api_queued' : 'failed',
    failure_reason: reason,
    dispatch_attempt_count: attempts,
    last_dispatch_attempt_at: new Date().toISOString(),
    next_retry_at: retryable ? nextRetryIso(attempts) : null,
    provider_response_json: providerResponse || { error: reason },
    updated_at: new Date().toISOString()
  };
  const { data: updatedReply, error: replyError } = await supabase.from('social_message_replies').update(replyPatch).eq('reply_id', reply.reply_id).select(replyColumns).single();
  if (replyError) throw new Error(replyError.message);
  const { data: updatedMessage, error: messageError } = await supabase.from('social_messages').update({ reply_status: retryable ? 'queued' : 'failed', handling_status: 'in_progress', last_reply_id: reply.reply_id, updated_at: new Date().toISOString() }).eq('message_id', message.message_id).select(messageColumns).single();
  if (messageError) throw new Error(messageError.message);
  await auditLog({ action: 'social_message_reply_dispatch_failed', actor_role: 'system_worker', object_type: 'social_message_reply', object_id: String(reply.reply_id), before_data: reply, after_data: { reply: updatedReply, message: updatedMessage, retryable, reason } });
  return { reply_id: reply.reply_id, status: replyPatch.dispatch_status, retryable, reason };
}

async function markSent(reply: Row, message: Row, result: Row) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase server client is not configured.');
  const sentAt = text(result.sent_at, new Date().toISOString());
  const attempts = Number(reply.dispatch_attempt_count || 0) + 1;
  const { data: updatedReply, error: replyError } = await supabase.from('social_message_replies').update({ dispatch_status: 'sent', reply_type: 'api_sent', external_reply_id: result.external_reply_id || null, sent_at: sentAt, failure_reason: null, dispatch_attempt_count: attempts, last_dispatch_attempt_at: new Date().toISOString(), next_retry_at: null, provider_response_json: result.response || result, updated_at: new Date().toISOString() }).eq('reply_id', reply.reply_id).select(replyColumns).single();
  if (replyError) throw new Error(replyError.message);
  const { data: updatedMessage, error: messageError } = await supabase.from('social_messages').update({ reply_status: 'sent', handling_status: 'replied', handled_at: sentAt, last_reply_id: reply.reply_id, updated_at: new Date().toISOString() }).eq('message_id', message.message_id).select(messageColumns).single();
  if (messageError) throw new Error(messageError.message);
  await auditLog({ action: 'social_message_reply_dispatched', actor_role: 'system_worker', object_type: 'social_message_reply', object_id: String(reply.reply_id), before_data: reply, after_data: { reply: updatedReply, message: updatedMessage } });
  return { reply_id: reply.reply_id, status: 'sent', external_reply_id: result.external_reply_id || null, media_assets_count: replyMediaAssets(reply).length };
}

async function dispatchReply(reply: Row) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase server client is not configured.');
  const { data: message, error: messageError } = await supabase.from('social_messages').select(messageColumns).eq('message_id', reply.message_id).maybeSingle();
  if (messageError) throw new Error(messageError.message);
  if (!message) return markFailed(reply, { message_id: reply.message_id }, 'Source message not found.', {});
  if (reply.human_approved !== true) return markFailed(reply, message as Row, 'Human approval is required before dispatch.', {});
  if (reply.ai_generated === true && reply.human_approved !== true) return markFailed(reply, message as Row, 'AI-generated reply blocked because human approval is missing.', {});

  const account = await loadAccount(String(reply.channel || message.channel || ''), String(reply.provider || 'manual'));
  if (!account) return markFailed(reply, message as Row, `No connected active social account found for channel ${reply.channel || message.channel}.`, {});

  const result = await callReplyProvider(reply, message as Row, account);
  if (!result.ok) return markFailed(reply, message as Row, result.error || 'Dispatch failed.', result);
  return markSent(reply, message as Row, result as Row);
}

export async function POST(request: Request) {
  if (!authorized(request)) return fail('System worker authorization required', 401);
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail('Supabase is required for message reply dispatch worker', 503);
  const body = await request.json().catch(() => ({}));
  const limit = safeLimit((body as Row).limit);
  const now = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from('social_message_replies')
    .select(replyColumns)
    .eq('dispatch_status', 'queued')
    .eq('human_approved', true)
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return fail('Failed to load queued social message replies', 500, error.message);

  const results = [];
  for (const row of rows || []) {
    try {
      results.push(await dispatchReply(row));
    } catch (error) {
      results.push({ reply_id: row.reply_id, status: 'worker_error', error: error instanceof Error ? error.message : String(error) });
    }
  }
  return ok({ processed: results.length, results });
}

export const GET = POST;
