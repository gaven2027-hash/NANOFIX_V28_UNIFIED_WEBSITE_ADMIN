import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const messageColumns = 'message_id,lead_id,customer_id,channel,external_message_id,external_thread_id,direction,body,risk_level,handling_status,reply_status,message_kind,ai_intent,ai_summary,ai_reply_suggestion,ai_confidence_percent,risk_score_percent,sla_due_at,sla_status,created_at,updated_at';
const allowedChannels = ['facebook','instagram','tiktok','youtube_shorts','xiaohongshu','google_business_profile','linkedin','x_twitter','whatsapp','whatsapp_channel','telegram_channel','website_live_chat','website_whatsapp','forum','carousell_services','seedly_community','manual','general'];
const allowedKinds = ['private_message','public_comment','public_review','whatsapp_message','website_live_chat','forum_reply','system_alert','manual_note'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanText(value: unknown, fallback = '', max = 8000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function cleanPlatform(value: unknown, fallback = 'manual') {
  const next = cleanText(value, fallback, 80).toLowerCase().replace(/[^a-z0-9_ -]/g, '').replace(/\s+/g, '_').replace(/-/g, '_');
  return allowedChannels.includes(next) ? next : fallback;
}

function cleanKind(value: unknown, fallback = 'private_message') {
  const next = cleanText(value, fallback, 80).toLowerCase().replace(/[^a-z0-9_ -]/g, '').replace(/\s+/g, '_').replace(/-/g, '_');
  return allowedKinds.includes(next) ? next : fallback;
}

function clampPercent(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function inferRiskLevel(body: Payload) {
  const explicit = cleanText(body.risk_level || body.riskLevel, '', 40).toLowerCase();
  if (explicit) return explicit;
  const text = `${body.body || ''} ${body.message || ''} ${body.comment || ''}`.toLowerCase();
  if (/(angry|complain|complaint|refund|lawyer|scam|police|bad review|urgent|burst|flood|ceiling collapse)/.test(text)) return 'high';
  if (/(leak|water|ceiling|toilet|quote|price|inspection|repair|warranty)/.test(text)) return 'medium';
  return 'normal';
}

function inferMessageKind(body: Payload, channel: string) {
  const explicit = cleanKind(body.message_kind || body.messageKind, '');
  if (explicit) return explicit;
  const type = cleanText(body.platform_message_type || body.type, '', 80).toLowerCase();
  if (channel.includes('whatsapp')) return 'whatsapp_message';
  if (channel === 'website_live_chat') return 'website_live_chat';
  if (/(comment|reply)/.test(type)) return 'public_comment';
  if (/(review|rating)/.test(type)) return 'public_review';
  return 'private_message';
}

function buildAiSuggestion(bodyText: string, risk: string, channel: string) {
  const base = bodyText.toLowerCase();
  const intent = /(price|quote|cost|how much)/.test(base) ? 'quotation_request'
    : /(leak|water|ceiling|toilet|pipe|wall|roof)/.test(base) ? 'repair_consultation'
    : /(complain|bad|refund|angry|lawyer|police)/.test(base) ? 'complaint_or_reputation_risk'
    : 'general_enquiry';
  const summary = bodyText ? bodyText.slice(0, 300) : `Inbound ${channel} message needs review.`;
  const reply = intent === 'complaint_or_reputation_risk'
    ? 'Hi, thank you for reaching out. We are sorry to hear about this. Our team will review the case details carefully and follow up with you directly. Could you please share your contact number, service address, and any photos or videos so we can check properly?'
    : intent === 'quotation_request'
      ? 'Hi, thank you for contacting NANOFIX. We can assist with a site check and quotation. Please send photos/videos of the affected area, your location, and your preferred inspection time. Our team will review and advise the next step.'
      : 'Hi, thank you for contacting NANOFIX. Please share photos/videos of the issue, your address or building type, and your preferred timing. Our team will review and get back to you shortly.';
  return { intent, summary, reply, confidence: risk === 'high' ? 72 : 82, riskScore: risk === 'high' ? 85 : risk === 'medium' ? 55 : 20 };
}

function verifyWebhook(request: Request) {
  const configuredSecret = process.env.NANOFIX_SOCIAL_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || '';
  if (!configuredSecret) return true;
  const header = request.headers.get('x-nanofix-webhook-secret') || request.headers.get('x-webhook-secret') || '';
  return header === configuredSecret;
}

export async function POST(request: Request) {
  if (!verifyWebhook(request)) return jsonError('Invalid webhook secret.', 401);

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const channel = cleanPlatform(body.channel || body.platform || body.source, 'manual');
  const bodyText = cleanText(body.body || body.message || body.text || body.comment, '', 12000);
  if (!bodyText) return jsonError('Message body is required.');

  const risk = inferRiskLevel(body);
  const ai = buildAiSuggestion(bodyText, risk, channel);
  const externalMessageId = cleanText(body.external_message_id || body.message_id || body.id, '', 240);
  const externalThreadId = cleanText(body.external_thread_id || body.thread_id || body.conversation_id, '', 240);

  if (externalMessageId) {
    const { data: existing, error: existingError } = await supabase
      .from('social_messages')
      .select(messageColumns)
      .eq('channel', channel)
      .eq('external_message_id', externalMessageId)
      .maybeSingle();
    if (existingError) return jsonError(existingError.message, 500);
    if (existing) return NextResponse.json({ ok: true, duplicate: true, message: existing });
  }

  const payload = {
    channel,
    external_message_id: externalMessageId || null,
    external_thread_id: externalThreadId || null,
    external_sender_id: cleanText(body.external_sender_id || body.sender_id || body.from_id, '', 240) || null,
    external_sender_name: cleanText(body.external_sender_name || body.sender_name || body.from_name, '', 240) || null,
    contact_name: cleanText(body.contact_name || body.name, '', 240) || null,
    contact_phone: cleanText(body.contact_phone || body.phone, '', 80) || null,
    contact_whatsapp: cleanText(body.contact_whatsapp || body.whatsapp, '', 80) || null,
    contact_email: cleanText(body.contact_email || body.email, '', 240) || null,
    source_url: cleanText(body.source_url || body.permalink_url || body.url, '', 1200) || null,
    direction: 'inbound',
    body: bodyText,
    risk_level: risk,
    risk_score_percent: clampPercent(body.risk_score_percent ?? ai.riskScore),
    message_kind: inferMessageKind(body, channel),
    platform_message_type: cleanText(body.platform_message_type || body.type, '', 120) || null,
    platform_payload: body,
    ai_intent: cleanText(body.ai_intent, ai.intent, 160),
    ai_summary: cleanText(body.ai_summary, ai.summary, 1000),
    ai_reply_suggestion: cleanText(body.ai_reply_suggestion, ai.reply, 4000),
    ai_suggested_action: risk === 'high' ? 'pending_review' : 'reply_or_convert_to_lead',
    ai_confidence_percent: clampPercent(body.ai_confidence_percent ?? ai.confidence),
    sentiment: cleanText(body.sentiment, risk === 'high' ? 'negative_or_urgent' : 'neutral', 80),
    urgency_reason: cleanText(body.urgency_reason, risk === 'high' ? 'High-risk keywords or complaint pattern detected.' : '', 500),
    handling_status: risk === 'high' ? 'pending_review' : 'new',
    reply_status: 'drafted'
  };

  const { data, error } = await supabase.from('social_messages').insert(payload).select(messageColumns).single();
  if (error) return jsonError(error.message, 500);

  await auditLog({ actor_role: 'system', action: 'ingest_social_message_webhook', object_type: 'social_message', object_id: data.message_id, after_data: { channel, external_message_id: externalMessageId, message_kind: payload.message_kind, risk_level: risk } });

  return NextResponse.json({ ok: true, message: data });
}

export async function GET(request: Request) {
  if (!verifyWebhook(request)) return jsonError('Invalid webhook secret.', 401);
  return NextResponse.json({ ok: true, route: 'social-messages-webhook', ai_auto_reply_allowed: false, human_review_required: true });
}
