import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const columns = 'website_social_link_id,platform,label,url,icon_key,display_order,placement,is_active,open_new_tab,rel_attr,notes,created_by,updated_by,created_at,updated_at';
const allowedPlatforms = ['facebook', 'instagram', 'tiktok', 'youtube', 'youtube_shorts', 'xiaohongshu', 'google_business_profile', 'whatsapp', 'linktree', 'other'];
const allowedPlacements = ['header', 'footer', 'floating', 'contact_page', 'all'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function cleanText(value: unknown, fallback = '', max = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function cleanUrl(value: unknown) {
  const text = cleanText(value, '', 1200);
  if (!text) return null;
  if (!/^https:\/\//i.test(text)) return null;
  return text;
}

function normalizePlatform(value: unknown) {
  const platform = cleanText(value).toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return allowedPlatforms.includes(platform) ? platform : 'other';
}

function normalizePlacement(value: unknown) {
  const placement = cleanText(value, 'footer').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return allowedPlacements.includes(placement) ? placement : 'footer';
}

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function sanitize(data: Payload, actorId?: string, isCreate = false) {
  const now = new Date().toISOString();
  const platform = normalizePlatform(data.platform);
  const label = cleanText(data.label, '', 160) || platform.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const payload: Payload = {
    platform,
    label,
    url: cleanUrl(data.url),
    icon_key: cleanText(data.icon_key, platform, 120) || platform,
    display_order: Number.isFinite(Number(data.display_order)) ? Number(data.display_order) : 0,
    placement: normalizePlacement(data.placement),
    is_active: toBoolean(data.is_active, true),
    open_new_tab: toBoolean(data.open_new_tab, true),
    rel_attr: cleanText(data.rel_attr, 'noopener noreferrer', 120) || 'noopener noreferrer',
    notes: cleanText(data.notes, '', 2000) || null,
    updated_by: validUuid(actorId) ? actorId : null,
    updated_at: now
  };
  if (isCreate) {
    payload.created_by = validUuid(actorId) ? actorId : null;
    payload.created_at = now;
  }
  return payload;
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const platform = url.searchParams.get('platform');
  const placement = url.searchParams.get('placement');
  const active = url.searchParams.get('active');
  const search = cleanText(url.searchParams.get('search'), '', 160);

  let query = supabase.from('website_social_links').select(columns).order('display_order', { ascending: true }).order('platform', { ascending: true }).limit(100);
  if (validUuid(id)) query = query.eq('website_social_link_id', id);
  if (platform) query = query.eq('platform', normalizePlatform(platform));
  if (placement) query = query.eq('placement', normalizePlacement(placement));
  if (active === 'true') query = query.eq('is_active', true);
  if (active === 'false') query = query.eq('is_active', false);
  if (search) query = query.or(`platform.ilike.%${search}%,label.ilike.%${search}%,url.ilike.%${search}%,notes.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, rows: data || [] });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const payload = sanitize(body, context?.actorId, true);
  const { data, error } = await supabase.from('website_social_links').insert(payload).select(columns).single();
  if (error) return jsonError(error.message, 500);

  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_website_social_link', object_type: 'website_social_link', object_id: data.website_social_link_id, after_data: data });
  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const id = String(body.website_social_link_id || body.id || '');
  if (!validUuid(id)) return jsonError('A valid website_social_link_id is required.');

  const { data: before, error: beforeError } = await supabase.from('website_social_links').select(columns).eq('website_social_link_id', id).maybeSingle();
  if (beforeError) return jsonError(beforeError.message, 500);
  if (!before) return jsonError('Website social link not found.', 404);

  const payload = sanitize({ ...before, ...body }, context?.actorId, false);
  const { data, error } = await supabase.from('website_social_links').update(payload).eq('website_social_link_id', id).select(columns).single();
  if (error) return jsonError(error.message, 500);

  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_website_social_link', object_type: 'website_social_link', object_id: id, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, row: data });
}
