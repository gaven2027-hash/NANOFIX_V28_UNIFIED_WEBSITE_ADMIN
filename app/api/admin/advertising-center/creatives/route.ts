import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { auditActor, requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;
const creativeColumns = 'creative_id,campaign_id,platform,creative_type,title,headline,primary_text,description,cta,landing_page_url,media_asset_id,media_url,version_label,status,ai_generated,editable_text,created_by,updated_by,created_at,updated_at';
const creativeTypes = ['image','video','carousel','text','landing_page','short_video','other'];
const statuses = ['draft','pending_review','approved','rejected','archived'];

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function cleanText(value: unknown, fallback = '', max = 3000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function oneOf(value: unknown, allowed: string[], fallback: string) { const raw = cleanText(value, fallback, 120); return allowed.includes(raw) ? raw : fallback; }
function bool(value: unknown) { return value === true || value === 'true' || value === 1 || value === '1'; }
function payload(body: Payload, actorId?: string) {
  return {
    campaign_id: validUuid(body.campaign_id) ? body.campaign_id : null,
    platform: cleanText(body.platform, 'manual_import', 80),
    creative_type: oneOf(body.creative_type, creativeTypes, 'image'),
    title: cleanText(body.title, 'Untitled Creative', 240),
    headline: cleanText(body.headline, '', 240) || null,
    primary_text: cleanText(body.primary_text, '', 2000) || null,
    description: cleanText(body.description, '', 2000) || null,
    cta: cleanText(body.cta, 'WhatsApp Us', 120) || null,
    landing_page_url: cleanText(body.landing_page_url, '', 1000) || null,
    media_asset_id: validUuid(body.media_asset_id) ? body.media_asset_id : null,
    media_url: cleanText(body.media_url, '', 1000) || null,
    version_label: cleanText(body.version_label, 'A', 40) || 'A',
    status: oneOf(body.status, statuses, 'draft'),
    ai_generated: bool(body.ai_generated),
    editable_text: cleanText(body.editable_text, '', 3000) || null,
    updated_by: validUuid(actorId) ? actorId : null,
    updated_at: new Date().toISOString()
  };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:advertising');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);
  const url = new URL(request.url);
  const campaignId = url.searchParams.get('campaign_id');
  let query = supabase.from('ad_creatives').select(creativeColumns).order('created_at', { ascending: false }).limit(120);
  if (validUuid(campaignId)) query = query.eq('campaign_id', campaignId);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, creatives: data || [], creativeTypes, statuses });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:ad_creative');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase || !context) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const next = payload(body, context.actorId);
  const { data, error } = await supabase.from('ad_creatives').insert({ ...next, created_by: context.actorId, created_at: new Date().toISOString() }).select(creativeColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ ...auditActor(context), action: 'create_ad_creative_copy_draft', object_type: 'ad_creative', object_id: data.creative_id, after_data: data });
  return NextResponse.json({ ok: true, creative: data });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:ad_creative');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase || !context) return jsonError('Supabase server client is not configured.', 503);
  const body = (await request.json().catch(() => ({}))) as Payload;
  const creativeId = String(body.creative_id || '');
  if (!validUuid(creativeId)) return jsonError('Valid creative_id is required.');
  const { data: before } = await supabase.from('ad_creatives').select(creativeColumns).eq('creative_id', creativeId).maybeSingle();
  if (!before) return jsonError('Creative not found.', 404);
  const next = payload(body, context.actorId);
  const { data, error } = await supabase.from('ad_creatives').update(next).eq('creative_id', creativeId).select(creativeColumns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ ...auditActor(context), action: 'update_ad_creative_copy_draft', object_type: 'ad_creative', object_id: creativeId, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, creative: data });
}
