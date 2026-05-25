import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const socialAccountColumns = 'social_account_id,platform,account_name,account_handle,account_url,business_id,page_id,app_id,connection_status,is_active,webhook_url,api_base_url,access_token_secret_name,refresh_token_secret_name,token_expires_at,permissions_json,settings_json,notes,last_connected_at,last_checked_at,created_by,updated_by,created_at,updated_at';
const allowedPlatforms = ['facebook', 'instagram', 'tiktok', 'youtube_shorts', 'xiaohongshu', 'google_business_profile', 'whatsapp', 'website_live_chat', 'linktree', 'other'];
const allowedStatuses = ['draft', 'connected', 'needs_reauth', 'disconnected', 'disabled', 'error'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function cleanText(value: unknown, fallback = '', max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function cleanUrl(value: unknown) {
  const text = cleanText(value, '', 1200);
  if (!text) return null;
  if (!/^https:\/\//i.test(text)) return null;
  return text;
}

function parseJson(value: unknown, fallback: unknown) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizePlatform(value: unknown) {
  const platform = cleanText(value).toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return allowedPlatforms.includes(platform) ? platform : 'other';
}

function normalizeStatus(value: unknown, fallback = 'draft') {
  const status = cleanText(value, fallback).toLowerCase();
  return allowedStatuses.includes(status) ? status : fallback;
}

function sanitizeSocialAccountData(data: Payload, actorId?: string, isCreate = false) {
  const now = new Date().toISOString();
  const status = normalizeStatus(data.connection_status, isCreate ? 'draft' : undefined as unknown as string);
  const patch: Payload = {
    platform: normalizePlatform(data.platform),
    account_name: cleanText(data.account_name, '', 160),
    account_handle: cleanText(data.account_handle, '', 160) || null,
    account_url: cleanUrl(data.account_url),
    business_id: cleanText(data.business_id, '', 220) || null,
    page_id: cleanText(data.page_id, '', 220) || null,
    app_id: cleanText(data.app_id, '', 220) || null,
    connection_status: status,
    is_active: typeof data.is_active === 'boolean' ? data.is_active : data.is_active === 'false' ? false : true,
    webhook_url: cleanUrl(data.webhook_url),
    api_base_url: cleanUrl(data.api_base_url),
    access_token_secret_name: cleanText(data.access_token_secret_name, '', 260) || null,
    refresh_token_secret_name: cleanText(data.refresh_token_secret_name, '', 260) || null,
    token_expires_at: cleanText(data.token_expires_at, '', 80) || null,
    permissions_json: parseJson(data.permissions_json, []),
    settings_json: parseJson(data.settings_json, {}),
    notes: cleanText(data.notes, '', 4000) || null,
    updated_by: validUuid(actorId) ? actorId : null,
    updated_at: now
  };

  if (!patch.account_name) throw new Error('Account name is required.');
  if (isCreate) {
    patch.created_by = validUuid(actorId) ? actorId : null;
    patch.created_at = now;
  }
  if (status === 'connected') {
    patch.last_connected_at = now;
    patch.last_checked_at = now;
  }
  if (status === 'disabled') patch.is_active = false;
  return patch;
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const platform = url.searchParams.get('platform');
  const status = url.searchParams.get('status');
  const search = cleanText(url.searchParams.get('search'), '', 160);

  let query = supabase.from('social_accounts').select(socialAccountColumns).order('updated_at', { ascending: false }).limit(100);
  if (validUuid(id)) query = query.eq('social_account_id', id);
  if (platform) query = query.eq('platform', normalizePlatform(platform));
  if (status) query = query.eq('connection_status', normalizeStatus(status, status));
  if (search) query = query.or(`account_name.ilike.%${search}%,account_handle.ilike.%${search}%,account_url.ilike.%${search}%,notes.ilike.%${search}%`);

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
  let payload: Payload;
  try {
    payload = sanitizeSocialAccountData(body, context?.actorId, true);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid social account payload.');
  }

  const { data, error } = await supabase.from('social_accounts').insert(payload).select(socialAccountColumns).single();
  if (error) return jsonError(error.message, 500);

  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_social_account_binding', object_type: 'social_account', object_id: data.social_account_id, after_data: data });
  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const id = String(body.social_account_id || body.id || '');
  if (!validUuid(id)) return jsonError('A valid social_account_id is required.');

  const { data: before, error: beforeError } = await supabase.from('social_accounts').select(socialAccountColumns).eq('social_account_id', id).maybeSingle();
  if (beforeError) return jsonError(beforeError.message, 500);
  if (!before) return jsonError('Social account not found.', 404);

  let payload: Payload;
  try {
    payload = sanitizeSocialAccountData({ ...before, ...body }, context?.actorId, false);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid social account payload.');
  }

  const { data, error } = await supabase.from('social_accounts').update(payload).eq('social_account_id', id).select(socialAccountColumns).single();
  if (error) return jsonError(error.message, 500);

  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_social_account_binding', object_type: 'social_account', object_id: id, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, row: data });
}
