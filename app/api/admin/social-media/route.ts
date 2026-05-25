import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { getSocialMediaSection } from '@/lib/nanofix/socialMediaConfig';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const recordColumns = 'record_id,section_key,platform,title,body,config_json,status,created_by,updated_by,created_at,updated_at';
const messageColumns = 'message_id,lead_id,customer_id,channel,external_message_id,direction,body,risk_level,created_at';
const draftColumns = 'content_id,module,platform,title,body,prompt_version,model,source_references,approval_status,reviewer_id,created_at';
const versionColumns = 'version_id,content_id,record_id,platform,version_no,status,snapshot_json,scheduled_at,published_at,published_by,created_at';
const recordStatuses = ['draft', 'active', 'pending_review', 'approved', 'scheduled', 'published', 'archived', 'disabled'];
const draftStatuses = ['draft', 'pending_review', 'approved', 'rejected', 'published', 'scheduled'];
const versionStatuses = ['approved', 'scheduled', 'published', 'cancelled', 'failed'];
const messageDirections = ['inbound', 'outbound', 'internal_note'];
const multiPlatformTargets = [
  ['facebook', 'FB Preview', 'local trust proof and service CTA'],
  ['tiktok', 'TikTok Preview', 'short hook, subtitles and fast CTA'],
  ['youtube_shorts', 'YouTube Shorts Preview', 'searchable Shorts title and description'],
  ['instagram', 'Instagram Preview', 'visual-first Reel or post caption'],
  ['xiaohongshu', 'Xiaohongshu Preview', 'problem story and Chinese-localised note'],
  ['forum', 'Forum Preview', 'long-form forum thread with problem and solution'],
  ['google_business_profile', 'Google Business Profile Preview', 'local SEO business update'],
  ['linkedin', 'LinkedIn Preview', 'B2B commercial credibility update'],
  ['x_twitter', 'X / Twitter Preview', 'short public update, complaint monitoring response or thread draft'],
  ['carousell_services', 'Carousell Services Preview', 'local service listing with area, images and CTA'],
  ['seedly_community', 'Seedly Community Preview', 'helpful community answer for repair cost and home maintenance discussions'],
  ['whatsapp_channel', 'WhatsApp Channel Preview', 'short subscriber broadcast draft'],
  ['telegram_channel', 'Telegram Channel Preview', 'compact community channel draft'],
  ['website_blog', 'Website Blog Preview', 'SEO and AEO website article handoff']
] as const;
const allowedDraftPlatforms = ['all', 'general', 'facebook', 'instagram', 'tiktok', 'youtube_shorts', 'xiaohongshu', 'forum', 'google_business_profile', 'linkedin', 'x_twitter', 'carousell_services', 'seedly_community', 'whatsapp', 'whatsapp_channel', 'telegram_channel', 'website_blog', 'website_live_chat'];

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function text(value: unknown, fallback = '', max = 8000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function cleanSearch(value: string | null) { return (value || '').replace(/[,%()]/g, ' ').trim().slice(0, 120); }
function safeJson(value: unknown, fallback: Payload | unknown[] = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') { try { return JSON.parse(value); } catch { return fallback; } }
  return fallback;
}
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function nullableUuid(value: unknown) { return validUuid(value) ? value : null; }
function platform(value: unknown, fallback = 'general') { return text(value, fallback).toLowerCase().replace(/[^a-z0-9_ -]/g, '').replace(/\s+/g, '_').replace(/-/g, '_').slice(0, 80) || fallback; }
function draftPlatform(value: unknown) { const p = platform(value, 'general'); return allowedDraftPlatforms.includes(p) ? p : 'general'; }

function recordPayload(body: Payload, actorId?: string) {
  const section = getSocialMediaSection(text(body.section_key));
  const payload: Payload = {
    section_key: section?.key || text(body.section_key, 'social-accounts'),
    platform: platform(body.platform, section?.platform || 'general'),
    title: text(body.title, section?.title || 'Social Media Record'),
    body: text(body.body),
    config_json: safeJson(body.config_json, {}),
    status: recordStatuses.includes(String(body.status)) ? String(body.status) : 'draft'
  };
  if (validUuid(actorId)) payload.updated_by = actorId;
  return payload;
}
function messagePayload(body: Payload) {
  return { lead_id: nullableUuid(body.lead_id), customer_id: nullableUuid(body.customer_id), channel: platform(body.channel || body.platform, 'manual'), external_message_id: text(body.external_message_id), direction: messageDirections.includes(String(body.direction)) ? String(body.direction) : 'inbound', body: text(body.body), risk_level: text(body.risk_level, 'normal') };
}
function draftPayload(body: Payload, actorId?: string) {
  const section = getSocialMediaSection(text(body.section_key));
  const payload: Payload = { module: 'social', platform: draftPlatform(body.platform || section?.platform || 'all'), title: text(body.title, section?.title || 'Social Draft'), body: text(body.body), prompt_version: text(body.prompt_version, section?.key || 'manual'), model: text(body.model, 'manual'), source_references: safeJson(body.source_references, []), approval_status: draftStatuses.includes(String(body.approval_status)) ? String(body.approval_status) : 'draft' };
  if (validUuid(actorId)) payload.reviewer_id = actorId;
  return payload;
}
function multiDraftPayloads(body: Payload, actorId?: string) {
  const requested = Array.isArray(body.platforms) ? body.platforms.map(draftPlatform) : [];
  const unique = [...new Set(requested)].filter((p) => multiPlatformTargets.some((target) => target[0] === p));
  const selected = unique.length ? unique : multiPlatformTargets.map((target) => target[0]);
  const sourceMedia = safeJson(body.source_media, {});
  const baseTitle = text(body.base_title, 'NANOFIX social repair content');
  const baseBody = text(body.base_body, 'NANOFIX repair material pack for platform-specific social review.');
  const serviceType = text(body.service_type, 'NANOFIX Repair Service');
  const createdAt = new Date().toISOString();
  return selected.map((p) => {
    const target = multiPlatformTargets.find((item) => item[0] === p)!;
    return { module: 'social', platform: p, title: `${target[1]}: ${baseTitle}`.slice(0, 500), body: [baseBody, '', `Platform angle: ${target[2]}.`, `Service type: ${serviceType}.`, 'Admin review required before approval, scheduling or publishing.', 'AI auto publish allowed: false.'].join('\n'), prompt_version: `multi-platform-preview-review/${p}`, model: text(body.model, 'manual_ai_assisted'), source_references: [{ source: 'multi_platform_material_pack', target_platform: p, target_label: target[1], service_type: serviceType, source_media: sourceMedia, admin_review_required: true, ai_auto_publish_allowed: false, created_at: createdAt }], approval_status: 'draft', reviewer_id: validUuid(actorId) ? actorId : null };
  });
}

async function listRecords(search: string | null, status: string | null, sectionKey: string | null, p: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('social_management_records').select(recordColumns).order('updated_at', { ascending: false }).limit(120);
  if (sectionKey) query = query.eq('section_key', sectionKey); if (p && p !== 'all') query = query.eq('platform', p); if (status && recordStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search); if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%,section_key.ilike.%${q}%,platform.ilike.%${q}%`);
  const { data, error } = await query; return error ? { ok: false as const, status: 500, error: error.message } : { ok: true as const, data: data ?? [] };
}
async function listMessages(search: string | null, sectionKey: string | null, p: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  const section = getSocialMediaSection(sectionKey || undefined); let query = supabase.from('social_messages').select(messageColumns).order('created_at', { ascending: false }).limit(120);
  const channel = p && p !== 'all' ? p : section?.platform && section.platform !== 'all' ? section.platform : ''; if (channel) query = query.eq('channel', channel);
  const q = cleanSearch(search); if (q) query = query.or(`channel.ilike.%${q}%,body.ilike.%${q}%,risk_level.ilike.%${q}%,direction.ilike.%${q}%`);
  const { data, error } = await query; return error ? { ok: false as const, status: 500, error: error.message } : { ok: true as const, data: data ?? [] };
}
async function listDrafts(search: string | null, status: string | null, sectionKey: string | null, p: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  const section = getSocialMediaSection(sectionKey || undefined); let query = supabase.from('content_drafts').select(draftColumns).eq('module', 'social').order('created_at', { ascending: false }).limit(160);
  const draftP = p && p !== 'all' ? p : section?.platform && section.platform !== 'all' ? section.platform : ''; if (draftP) query = query.eq('platform', draftP); if (status && draftStatuses.includes(status)) query = query.eq('approval_status', status);
  const q = cleanSearch(search || sectionKey); if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%,platform.ilike.%${q}%,prompt_version.ilike.%${q}%`);
  const { data, error } = await query; return error ? { ok: false as const, status: 500, error: error.message } : { ok: true as const, data: data ?? [] };
}
async function listVersions(search: string | null, status: string | null, p: string | null) {
  const supabase = createSupabaseAdminClient(); if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };
  let query = supabase.from('social_publish_versions').select(versionColumns).order('created_at', { ascending: false }).limit(100); if (p && p !== 'all') query = query.eq('platform', p); if (status && versionStatuses.includes(status)) query = query.eq('status', status);
  const q = cleanSearch(search); if (q) query = query.or(`platform.ilike.%${q}%,status.ilike.%${q}%`); const { data, error } = await query;
  return error ? { ok: false as const, status: 500, error: error.message } : { ok: true as const, data: data ?? [] };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content'); if (response) return response;
  const url = new URL(request.url); const mode = url.searchParams.get('mode') || 'all'; const sectionKey = url.searchParams.get('section_key'); const p = url.searchParams.get('platform'); const status = url.searchParams.get('status'); const search = url.searchParams.get('search');
  if (mode === 'records') { const records = await listRecords(search, status, sectionKey, p); return records.ok ? NextResponse.json({ ok: true, records: records.data }) : jsonError(records.error, records.status); }
  if (mode === 'messages') { const messages = await listMessages(search, sectionKey, p); return messages.ok ? NextResponse.json({ ok: true, messages: messages.data }) : jsonError(messages.error, messages.status); }
  if (mode === 'drafts') { const drafts = await listDrafts(search, status, sectionKey, p); return drafts.ok ? NextResponse.json({ ok: true, drafts: drafts.data }) : jsonError(drafts.error, drafts.status); }
  if (mode === 'versions') { const versions = await listVersions(search, status, p); return versions.ok ? NextResponse.json({ ok: true, versions: versions.data }) : jsonError(versions.error, versions.status); }
  const [records, messages, drafts, versions] = await Promise.all([listRecords(search, null, sectionKey, p), listMessages(search, sectionKey, p), listDrafts(search, null, sectionKey, p), listVersions(search, null, p)]);
  if (!records.ok) return jsonError(records.error, records.status); if (!messages.ok) return jsonError(messages.error, messages.status); if (!drafts.ok) return jsonError(drafts.error, drafts.status); if (!versions.ok) return jsonError(versions.error, versions.status);
  return NextResponse.json({ ok: true, records: records.data, messages: messages.data, drafts: drafts.data, versions: versions.data, recordStatuses, draftStatuses, versionStatuses, multiPlatformTargets });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload; const action = String(body.action || ''); const { context, response } = requireAdmin(request, 'write:content'); if (response) return response;
  const supabase = createSupabaseAdminClient(); if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  if (action === 'create_record') { const payload = recordPayload(body, context?.actorId); if (validUuid(context?.actorId)) payload.created_by = context?.actorId; const { data, error } = await supabase.from('social_management_records').insert(payload).select(recordColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'social_management_record', object_id: data.record_id, after_data: data }); return NextResponse.json({ ok: true, record: data }); }
  if (action === 'create_message') { const payload = messagePayload(body); const { data, error } = await supabase.from('social_messages').insert(payload).select(messageColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'social_message', object_id: data.message_id, after_data: data }); return NextResponse.json({ ok: true, message: data }); }
  if (action === 'create_draft') { const payload = draftPayload(body, context?.actorId); const { data, error } = await supabase.from('content_drafts').insert(payload).select(draftColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'social_content_draft', object_id: data.content_id, after_data: data }); return NextResponse.json({ ok: true, draft: data }); }
  if (action === 'create_multi_platform_drafts') { const payloads = multiDraftPayloads(body, context?.actorId); const { data, error } = await supabase.from('content_drafts').insert(payloads).select(draftColumns); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_multi_platform_social_drafts', object_type: 'social_content_drafts', after_data: { count: data?.length || 0, platforms: payloads.map((item) => item.platform), ai_auto_publish_allowed: false, admin_review_required: true } }); return NextResponse.json({ ok: true, drafts: data || [], platforms: payloads.map((item) => item.platform) }); }
  return jsonError('Unsupported action.', 400);
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload; const action = String(body.action || ''); const { context, response } = requireAdmin(request, 'write:content'); if (response) return response;
  const supabase = createSupabaseAdminClient(); if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  if (action === 'update_record') { const id = String(body.record_id || ''); if (!validUuid(id)) return jsonError('A valid record_id is required.'); const payload = recordPayload(body, context?.actorId); const { data: before } = await supabase.from('social_management_records').select(recordColumns).eq('record_id', id).maybeSingle(); const { data, error } = await supabase.from('social_management_records').update(payload).eq('record_id', id).select(recordColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'social_management_record', object_id: id, before_data: before ?? {}, after_data: data }); return NextResponse.json({ ok: true, record: data }); }
  if (action === 'update_draft') { const id = String(body.content_id || ''); if (!validUuid(id)) return jsonError('A valid content_id is required.'); const payload = draftPayload(body, context?.actorId); const { data: before } = await supabase.from('content_drafts').select(draftColumns).eq('content_id', id).maybeSingle(); const { data, error } = await supabase.from('content_drafts').update(payload).eq('content_id', id).select(draftColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'social_content_draft', object_id: id, before_data: before ?? {}, after_data: data }); return NextResponse.json({ ok: true, draft: data }); }
  if (action === 'publish_snapshot') { const contentId = String(body.content_id || ''); const recordId = String(body.record_id || ''); const p = draftPlatform(body.platform || 'all'); const status = versionStatuses.includes(String(body.status)) ? String(body.status) : 'scheduled'; const { data: existing, error: versionError } = await supabase.from('social_publish_versions').select('version_no').eq('platform', p).order('version_no', { ascending: false }).limit(1); if (versionError) return jsonError(versionError.message, 500); const versionNo = Number(existing?.[0]?.version_no || 0) + 1; const snapshot = safeJson(body.snapshot_json, { platform: p, status, source: 'manual social admin publish snapshot', created_at: new Date().toISOString(), ai_auto_publish_allowed: false }); const { data, error } = await supabase.from('social_publish_versions').insert({ content_id: validUuid(contentId) ? contentId : null, record_id: validUuid(recordId) ? recordId : null, platform: p, version_no: versionNo, status, snapshot_json: snapshot, scheduled_at: body.scheduled_at || null, published_by: validUuid(context?.actorId) ? context?.actorId : null }).select(versionColumns).single(); if (error) return jsonError(error.message, 500); await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'publish_snapshot', object_type: 'social_publish_version', object_id: data.version_id, after_data: data }); return NextResponse.json({ ok: true, version: data }); }
  return jsonError('Unsupported action.', 400);
}
