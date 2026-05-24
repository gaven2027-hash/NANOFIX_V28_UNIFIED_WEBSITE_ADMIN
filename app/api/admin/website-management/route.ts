import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const pageColumns = 'page_id,route_path,title,description,status,metadata,created_by,updated_by,published_at,created_at,updated_at';
const blockColumns = 'block_id,route_path,locale,block_key,content_type,content_json,status,published_version,updated_by,reviewed_by,published_at,created_at,updated_at';
const versionColumns = 'version_id,route_path,locale,version_no,snapshot_json,published_by,published_at';
const pageStatuses = ['draft', 'published', 'archived'];
const blockStatuses = ['draft', 'pending_review', 'published', 'archived'];
const contentTypes = ['hero', 'section', 'card_grid', 'faq', 'cta', 'seo', 'form', 'json'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 5000) : fallback;
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function cleanRoutePath(value: unknown) {
  const raw = cleanText(value, '/');
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return normalized.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9/_#?&=.-]/g, '').slice(0, 240) || '/';
}

function safeJson(value: unknown, fallback: Payload | unknown[] = {}) {
  if (!value) return fallback;
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

function buildPagePayload(body: Payload, actorId?: string) {
  const status = pageStatuses.includes(String(body.status)) ? String(body.status) : 'draft';
  const payload: Payload = {
    route_path: cleanRoutePath(body.route_path),
    title: cleanText(body.title, 'Untitled Page'),
    description: cleanText(body.description),
    status,
    metadata: safeJson(body.metadata, {})
  };
  if (validUuid(actorId)) payload.updated_by = actorId;
  if (status === 'published') payload.published_at = new Date().toISOString();
  return payload;
}

function buildBlockPayload(body: Payload, actorId?: string) {
  const status = blockStatuses.includes(String(body.status)) ? String(body.status) : 'draft';
  const contentType = contentTypes.includes(String(body.content_type)) ? String(body.content_type) : 'section';
  const payload: Payload = {
    route_path: cleanRoutePath(body.route_path),
    locale: cleanText(body.locale, 'en').slice(0, 12) || 'en',
    block_key: cleanText(body.block_key, 'main').replace(/\s+/g, '_').slice(0, 120) || 'main',
    content_type: contentType,
    content_json: safeJson(body.content_json, {}),
    status
  };
  if (validUuid(actorId)) payload.updated_by = actorId;
  if (status === 'published') payload.published_at = new Date().toISOString();
  return payload;
}

async function getPages(search: string | null, status: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };

  let query = supabase.from('website_pages').select(pageColumns).order('updated_at', { ascending: false }).limit(100);
  if (status && pageStatuses.includes(status)) query = query.eq('status', status);
  if (search) {
    const q = search.replace(/[,%()]/g, ' ').trim().slice(0, 120);
    if (q) query = query.or(`route_path.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function getBlocks(routePath: string | null, search: string | null, status: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };

  let query = supabase.from('website_content_blocks').select(blockColumns).order('updated_at', { ascending: false }).limit(120);
  if (routePath) query = query.eq('route_path', cleanRoutePath(routePath));
  if (status && blockStatuses.includes(status)) query = query.eq('status', status);
  if (search) {
    const q = search.replace(/[,%()]/g, ' ').trim().slice(0, 120);
    if (q) query = query.or(`route_path.ilike.%${q}%,block_key.ilike.%${q}%,content_type.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

async function getVersions(routePath: string | null) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };

  let query = supabase.from('website_publish_versions').select(versionColumns).order('published_at', { ascending: false }).limit(50);
  if (routePath) query = query.eq('route_path', cleanRoutePath(routePath));
  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content');
  if (response) return response;

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'all';
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');
  const routePath = url.searchParams.get('route_path');

  if (mode === 'pages') {
    const pages = await getPages(search, status);
    if (!pages.ok) return jsonError(pages.error, pages.status);
    return NextResponse.json({ ok: true, pages: pages.data, pageStatuses, blockStatuses, contentTypes });
  }

  if (mode === 'blocks') {
    const blocks = await getBlocks(routePath, search, status);
    if (!blocks.ok) return jsonError(blocks.error, blocks.status);
    return NextResponse.json({ ok: true, blocks: blocks.data, pageStatuses, blockStatuses, contentTypes });
  }

  if (mode === 'versions') {
    const versions = await getVersions(routePath);
    if (!versions.ok) return jsonError(versions.error, versions.status);
    return NextResponse.json({ ok: true, versions: versions.data });
  }

  const [pages, blocks, versions] = await Promise.all([getPages(search, null), getBlocks(routePath, null, null), getVersions(routePath)]);
  if (!pages.ok) return jsonError(pages.error, pages.status);
  if (!blocks.ok) return jsonError(blocks.error, blocks.status);
  if (!versions.ok) return jsonError(versions.error, versions.status);
  return NextResponse.json({ ok: true, pages: pages.data, blocks: blocks.data, versions: versions.data, pageStatuses, blockStatuses, contentTypes });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'create_page') {
    const payload = buildPagePayload(body, context?.actorId);
    if (validUuid(context?.actorId)) payload.created_by = context?.actorId;
    const { data, error } = await supabase.from('website_pages').insert(payload).select(pageColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'website_page', object_id: data.page_id, after_data: data });
    return NextResponse.json({ ok: true, page: data });
  }

  if (action === 'create_block') {
    const payload = buildBlockPayload(body, context?.actorId);
    const { data, error } = await supabase.from('website_content_blocks').insert(payload).select(blockColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create', object_type: 'website_content_block', object_id: data.block_id, after_data: data });
    return NextResponse.json({ ok: true, block: data });
  }

  return jsonError('Unsupported action.', 400);
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  if (action === 'update_page') {
    const pageId = String(body.page_id || '');
    if (!validUuid(pageId)) return jsonError('A valid page_id is required.');
    const payload = buildPagePayload(body, context?.actorId);
    const { data: before } = await supabase.from('website_pages').select(pageColumns).eq('page_id', pageId).maybeSingle();
    const { data, error } = await supabase.from('website_pages').update(payload).eq('page_id', pageId).select(pageColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'website_page', object_id: pageId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, page: data });
  }

  if (action === 'update_block') {
    const blockId = String(body.block_id || '');
    if (!validUuid(blockId)) return jsonError('A valid block_id is required.');
    const payload = buildBlockPayload(body, context?.actorId);
    const { data: before } = await supabase.from('website_content_blocks').select(blockColumns).eq('block_id', blockId).maybeSingle();
    const { data, error } = await supabase.from('website_content_blocks').update(payload).eq('block_id', blockId).select(blockColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update', object_type: 'website_content_block', object_id: blockId, before_data: before ?? {}, after_data: data });
    return NextResponse.json({ ok: true, block: data });
  }

  if (action === 'publish_route') {
    const routePath = cleanRoutePath(body.route_path);
    const locale = cleanText(body.locale, 'en').slice(0, 12) || 'en';
    const { data: blocks, error: blockError } = await supabase
      .from('website_content_blocks')
      .select(blockColumns)
      .eq('route_path', routePath)
      .eq('locale', locale)
      .order('block_key', { ascending: true });
    if (blockError) return jsonError(blockError.message, 500);

    const { data: existingVersions, error: versionError } = await supabase
      .from('website_publish_versions')
      .select('version_no')
      .eq('route_path', routePath)
      .eq('locale', locale)
      .order('version_no', { ascending: false })
      .limit(1);
    if (versionError) return jsonError(versionError.message, 500);
    const versionNo = Number(existingVersions?.[0]?.version_no || 0) + 1;
    const snapshot = { route_path: routePath, locale, version_no: versionNo, blocks: blocks ?? [], published_at: new Date().toISOString() };

    const { data: version, error } = await supabase
      .from('website_publish_versions')
      .insert({ route_path: routePath, locale, version_no: versionNo, snapshot_json: snapshot, published_by: validUuid(context?.actorId) ? context?.actorId : null })
      .select(versionColumns)
      .single();
    if (error) return jsonError(error.message, 500);

    await supabase.from('website_content_blocks').update({ status: 'published', published_version: versionNo, published_at: new Date().toISOString(), updated_by: validUuid(context?.actorId) ? context?.actorId : null }).eq('route_path', routePath).eq('locale', locale);
    await supabase.from('website_pages').update({ status: 'published', published_at: new Date().toISOString(), updated_by: validUuid(context?.actorId) ? context?.actorId : null }).eq('route_path', routePath);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'publish', object_type: 'website_route', after_data: version });

    return NextResponse.json({ ok: true, version });
  }

  return jsonError('Unsupported action.', 400);
}
