import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, requireAdminApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

function jsonError(message: string, status = 400) {
  return json({ ok: false, error: message }, status);
}

function asBool(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  return fallback;
}

function safeUrl(value: unknown) {
  const url = cleanText(value, 1200) ?? '';
  if (!/^https?:\/\//i.test(url)) return '';
  return url;
}

function safeProvider(value: unknown) {
  const provider = (cleanText(value, 80) ?? 'custom_review').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return provider || 'custom_review';
}

function payloadFromBody(body: Row) {
  const reviewUrl = safeUrl(body.review_url);
  if (!reviewUrl) return { error: 'Review URL must start with http:// or https:// / 评论链接必须以 http:// 或 https:// 开头。' };

  const displayOrder = Number(body.display_order ?? 100);
  return {
    data: {
      provider_key: safeProvider(body.provider_key),
      label_en: cleanText(body.label_en, 160) ?? 'Leave a Review',
      label_zh: cleanText(body.label_zh, 160) ?? '我要评论',
      review_url: reviewUrl,
      help_text_en: cleanText(body.help_text_en, 500),
      help_text_zh: cleanText(body.help_text_zh, 500),
      display_order: Number.isFinite(displayOrder) ? displayOrder : 100,
      is_active: asBool(body.is_active, true),
      open_in_new_tab: asBool(body.open_in_new_tab, true),
      updated_at: new Date().toISOString()
    }
  };
}

export async function GET(request: NextRequest) {
  const actor = await requireAdminApi(request);
  if (!actor.ok) return jsonError(actor.error, actor.status);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_review_links')
    .select('review_link_id,provider_key,label_en,label_zh,review_url,help_text_en,help_text_zh,display_order,is_active,open_in_new_tab,created_at,updated_at')
    .order('display_order', { ascending: true })
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) return jsonError(error.message, 500);
  return json({ ok: true, links: data || [] });
}

export async function POST(request: NextRequest) {
  const actor = await requireAdminApi(request);
  if (!actor.ok) return jsonError(actor.error, actor.status);

  const body = (await request.json().catch(() => ({}))) as Row;
  const payload = payloadFromBody(body);
  if ('error' in payload) return jsonError(payload.error);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_review_links')
    .insert({ ...payload.data, created_by: actor.user.id, updated_by: actor.user.id })
    .select('review_link_id,provider_key,label_en,label_zh,review_url,is_active,updated_at')
    .single();

  if (error) return jsonError(error.message, 500);

  await writeAuditLog(supabase, {
    actor_id: actor.user.id,
    role: actor.role,
    action: 'customer_review_link_create',
    object_type: 'customer_review_link',
    object_id: String(data?.review_link_id || ''),
    metadata: { provider_key: payload.data.provider_key, ip: getClientIp(request) }
  });

  return json({ ok: true, link: data });
}

export async function PATCH(request: NextRequest) {
  const actor = await requireAdminApi(request);
  if (!actor.ok) return jsonError(actor.error, actor.status);

  const body = (await request.json().catch(() => ({}))) as Row;
  const id = cleanText(body.review_link_id, 120);
  if (!id) return jsonError('Missing review_link_id / 缺少评论链接 ID。');

  const payload = payloadFromBody(body);
  if ('error' in payload) return jsonError(payload.error);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_review_links')
    .update({ ...payload.data, updated_by: actor.user.id })
    .eq('review_link_id', id)
    .select('review_link_id,provider_key,label_en,label_zh,review_url,is_active,updated_at')
    .single();

  if (error) return jsonError(error.message, 500);

  await writeAuditLog(supabase, {
    actor_id: actor.user.id,
    role: actor.role,
    action: 'customer_review_link_update',
    object_type: 'customer_review_link',
    object_id: id,
    metadata: { provider_key: payload.data.provider_key, active: payload.data.is_active, ip: getClientIp(request) }
  });

  return json({ ok: true, link: data });
}
