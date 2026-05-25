import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { getWebsiteVisualEditorProvider, normaliseWebsiteVisualEditorProvider, websiteVisualEditorOptionsForClient } from '@/lib/nanofix/websiteVisualEditorProviders';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const pageColumns = 'page_id,route_path,title,description,status,metadata,created_by,updated_by,published_at,created_at,updated_at';
const blockColumns = 'block_id,route_path,locale,block_key,content_type,content_json,status,published_version,visual_editor_provider,visual_asset_type,visual_editor_status,visual_prompt,visual_template_id,visual_model,visual_output_url,visual_output_storage_path,visual_alt_text,visual_preview_json,visual_cost_estimate,updated_by,reviewed_by,published_at,created_at,updated_at';
const versionColumns = 'version_id,route_path,locale,version_no,snapshot_json,published_by,published_at';
const pageStatuses = ['draft', 'published', 'archived'];
const blockStatuses = ['draft', 'pending_review', 'published', 'archived'];
const contentTypes = ['hero', 'section', 'card_grid', 'faq', 'cta', 'seo', 'form', 'json'];
const visualAssetTypes = ['image', 'gif', 'text_image', 'before_after', 'gallery', 'none'];
const visualEditorStatuses = ['draft', 'queued', 'editing', 'edited', 'failed', 'approved', 'manual_upload'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 5000) : fallback;
}

function cleanLongText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 12000) : fallback;
}

function cleanNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
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

function visualProviderSummary(providerKey: unknown) {
  const provider = getWebsiteVisualEditorProvider(providerKey);
  return {
    visual_editor_provider: provider.key,
    visual_editor_provider_label: provider.label,
    visual_editor_provider_label_zh: provider.label_zh,
    visual_editor_provider_note: provider.short_note,
    visual_editor_provider_note_zh: provider.short_note_zh,
    visual_editor_provider_priority: provider.priority,
    visual_editor_provider_category: provider.category,
    visual_editor_supports_worker: provider.supports_worker,
    visual_editor_supports_gif: provider.supports_gif,
    visual_editor_supports_text_image: provider.supports_text_image,
    visual_editor_requires_external_endpoint: provider.requires_external_endpoint
  };
}

function buildSamePositionPreview(body: Payload, contentJson: Payload | unknown[]) {
  const provider = visualProviderSummary(body.visual_editor_provider);
  const routePath = cleanRoutePath(body.route_path);
  const blockKey = cleanText(body.block_key, 'main').replace(/\s+/g, '_').slice(0, 120) || 'main';
  const contentType = contentTypes.includes(String(body.content_type)) ? String(body.content_type) : 'section';
  const outputUrl = cleanText(body.visual_output_url, '', 2000) || null;
  const outputPath = cleanText(body.visual_output_storage_path, '', 2000) || null;
  const existingPreview = safeJson(body.visual_preview_json, {}) as Payload;
  return {
    ...existingPreview,
    preview_version: 'v28.1.3-website-same-position-preview-1',
    route_path: routePath,
    locale: cleanText(body.locale, 'en').slice(0, 12) || 'en',
    block_key: blockKey,
    content_type: contentType,
    same_position_preview_required: true,
    preview_position: existingPreview.preview_position || blockKey,
    preview_context: existingPreview.preview_context || `${routePath}#${blockKey}`,
    visual_asset_type: visualAssetTypes.includes(String(body.visual_asset_type)) ? String(body.visual_asset_type) : 'image',
    visual_output_url: outputUrl,
    visual_output_storage_path: outputPath,
    visual_alt_text: cleanText(body.visual_alt_text, '', 500) || null,
    content_snapshot: contentJson,
    ...provider,
    admin_review_required: true,
    ai_auto_publish_allowed: false,
    final_approval_completed_before_schedule: false,
    publish_ready_after_schedule: false,
    updated_at: new Date().toISOString()
  };
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
  const provider = getWebsiteVisualEditorProvider(body.visual_editor_provider);
  const contentJson = safeJson(body.content_json, {}) as Payload | unknown[];
  const visualPreview = buildSamePositionPreview({ ...body, visual_editor_provider: provider.key }, contentJson);
  const payload: Payload = {
    route_path: cleanRoutePath(body.route_path),
    locale: cleanText(body.locale, 'en').slice(0, 12) || 'en',
    block_key: cleanText(body.block_key, 'main').replace(/\s+/g, '_').slice(0, 120) || 'main',
    content_type: contentType,
    content_json: {
      ...(Array.isArray(contentJson) ? { items: contentJson } : contentJson),
      visual_editor_provider: provider.key,
      visual_editor_provider_label: provider.label,
      visual_editor_provider_label_zh: provider.label_zh,
      visual_editor_provider_note: provider.short_note,
      visual_editor_provider_note_zh: provider.short_note_zh,
      visual_asset_type: visualAssetTypes.includes(String(body.visual_asset_type)) ? String(body.visual_asset_type) : 'image',
      visual_output_url: cleanText(body.visual_output_url, '', 2000) || null,
      visual_output_storage_path: cleanText(body.visual_output_storage_path, '', 2000) || null,
      visual_alt_text: cleanText(body.visual_alt_text, '', 500) || null,
      same_position_preview_required: true,
      admin_review_required: true,
      ai_auto_publish_allowed: false
    },
    status,
    visual_editor_provider: provider.key,
    visual_asset_type: visualAssetTypes.includes(String(body.visual_asset_type)) ? String(body.visual_asset_type) : 'image',
    visual_editor_status: visualEditorStatuses.includes(String(body.visual_editor_status)) ? String(body.visual_editor_status) : provider.key === 'manual_final_asset_upload' ? 'manual_upload' : 'draft',
    visual_prompt: cleanLongText(body.visual_prompt, ''),
    visual_template_id: cleanText(body.visual_template_id, '', 240) || null,
    visual_model: cleanText(body.visual_model, '', 240) || null,
    visual_output_url: cleanText(body.visual_output_url, '', 2000) || null,
    visual_output_storage_path: cleanText(body.visual_output_storage_path, '', 2000) || null,
    visual_alt_text: cleanText(body.visual_alt_text, '', 500) || null,
    visual_preview_json: visualPreview,
    visual_cost_estimate: cleanNumber(body.visual_cost_estimate)
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
  const visualEditorProviders = websiteVisualEditorOptionsForClient();

  if (mode === 'pages') {
    const pages = await getPages(search, status);
    if (!pages.ok) return jsonError(pages.error, pages.status);
    return NextResponse.json({ ok: true, pages: pages.data, pageStatuses, blockStatuses, contentTypes, visualAssetTypes, visualEditorStatuses, visualEditorProviders });
  }

  if (mode === 'blocks') {
    const blocks = await getBlocks(routePath, search, status);
    if (!blocks.ok) return jsonError(blocks.error, blocks.status);
    return NextResponse.json({ ok: true, blocks: blocks.data, pageStatuses, blockStatuses, contentTypes, visualAssetTypes, visualEditorStatuses, visualEditorProviders });
  }

  if (mode === 'versions') {
    const versions = await getVersions(routePath);
    if (!versions.ok) return jsonError(versions.error, versions.status);
    return NextResponse.json({ ok: true, versions: versions.data, visualEditorProviders });
  }

  const [pages, blocks, versions] = await Promise.all([getPages(search, null), getBlocks(routePath, null, null), getVersions(routePath)]);
  if (!pages.ok) return jsonError(pages.error, pages.status);
  if (!blocks.ok) return jsonError(blocks.error, blocks.status);
  if (!versions.ok) return jsonError(versions.error, versions.status);
  return NextResponse.json({ ok: true, pages: pages.data, blocks: blocks.data, versions: versions.data, pageStatuses, blockStatuses, contentTypes, visualAssetTypes, visualEditorStatuses, visualEditorProviders });
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
    const snapshot = {
      route_path: routePath,
      locale,
      version_no: versionNo,
      blocks: blocks ?? [],
      website_same_position_previews: (blocks ?? []).map((block) => ({
        block_id: block.block_id,
        block_key: block.block_key,
        content_type: block.content_type,
        visual_editor_provider: block.visual_editor_provider,
        visual_asset_type: block.visual_asset_type,
        visual_output_url: block.visual_output_url,
        visual_output_storage_path: block.visual_output_storage_path,
        visual_preview_json: block.visual_preview_json
      })),
      final_approval_completed_before_schedule: true,
      publish_ready_after_schedule: true,
      ai_auto_publish_allowed: false,
      published_at: new Date().toISOString()
    };

    const { data: version, error } = await supabase
      .from('website_publish_versions')
      .insert({ route_path: routePath, locale, version_no: versionNo, snapshot_json: snapshot, published_by: validUuid(context?.actorId) ? context?.actorId : null })
      .select(versionColumns)
      .single();
    if (error) return jsonError(error.message, 500);

    await supabase.from('website_content_blocks').update({ status: 'published', published_version: versionNo, published_at: new Date().toISOString(), updated_by: validUuid(context?.actorId) ? context?.actorId : null }).eq('route_path', routePath).eq('locale', locale);
    await supabase.from('website_pages').update({ status: 'published', published_at: new Date().toISOString(), updated_by: validUuid(context?.actorId) ? context?.actorId : null }).eq('route_path', routePath);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'publish_after_pre_publish_review', object_type: 'website_route', after_data: version });

    return NextResponse.json({ ok: true, version });
  }

  return jsonError('Unsupported action.', 400);
}
