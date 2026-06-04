import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, requireAdminApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';
type Row = Record<string, unknown>;
type WebsiteSectionKey = 'pages' | 'blocks' | 'public_forms' | 'organic_leads' | 'paid_leads' | 'uploads' | 'publish_audit';
type QueryBuilder = {
  in: (column: string, values: readonly unknown[]) => QueryBuilder;
  not: (column: string, operator: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => { limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }> };
};

type WebsiteSpec = {
  key: WebsiteSectionKey;
  label: string;
  zh: string;
  table: string;
  select: string;
  fallbackSelect?: string;
  idField: string;
  route: string;
  tone: Tone;
  orderColumn?: string;
  filter?: (query: QueryBuilder) => QueryBuilder;
};

const specs: WebsiteSpec[] = [
  {
    key: 'pages',
    label: 'CMS Pages',
    zh: 'CMS Pages',
    table: 'website_pages',
    select: 'page_id,slug,locale,title,meta_title,meta_description,status,published_at,created_at,updated_at',
    fallbackSelect: 'page_id,locale,title,meta_title,meta_description,status,published_at,created_at,updated_at',
    idField: 'page_id',
    route: '/website-management#page-content',
    tone: 'blue',
    orderColumn: 'updated_at'
  },
  {
    key: 'blocks',
    label: 'Content Blocks',
    zh: 'Content Blocks',
    table: 'website_content_blocks',
    select: 'block_id,page_id,block_key,locale,title,body,status,sort_order,created_at,updated_at',
    fallbackSelect: 'block_id,block_key,locale,title,body,status,sort_order,created_at,updated_at',
    idField: 'block_id',
    route: '/website-management#homepage-content',
    tone: 'cyan',
    orderColumn: 'updated_at'
  },
  {
    key: 'public_forms',
    label: 'Public Repair Forms',
    zh: 'Public Repair Forms',
    table: 'service_requests',
    select: 'service_request_id,customer_id,contact_name,phone,whatsapp,email,issue_type,address_text,status,binding_status,source_platform,created_at,updated_at',
    idField: 'service_request_id',
    route: '/website-management#public-form-submissions',
    tone: 'amber',
    filter: (query) => query.in('source_platform', ['website', 'public_website', 'public_form', 'website_form', 'get_a_free_quote'])
  },
  {
    key: 'organic_leads',
    label: 'Website Organic Leads',
    zh: 'Website Organic Leads',
    table: 'leads',
    select: 'lead_id,name,phone,email,source_platform,request_origin,priority,status,binding_status,created_at,updated_at',
    idField: 'lead_id',
    route: '/website-management#website-organic-leads',
    tone: 'green',
    filter: (query) => query.in('source_platform', ['website', 'website_organic', 'organic', 'seo', 'guide'])
  },
  {
    key: 'paid_leads',
    label: 'Paid Landing Leads',
    zh: 'Paid Landing Leads',
    table: 'leads',
    select: 'lead_id,name,phone,email,source_platform,request_origin,priority,status,binding_status,created_at,updated_at',
    idField: 'lead_id',
    route: '/website-management#website-paid-landing-leads',
    tone: 'red',
    filter: (query) => query.in('source_platform', ['paid_landing', 'google_ads', 'meta_ads', 'website_paid', 'ads'])
  },
  {
    key: 'uploads',
    label: 'Public Upload Review',
    zh: 'Public Upload Review',
    table: 'service_requests',
    select: 'service_request_id,contact_name,phone,email,issue_type,portal_attachment_urls,portal_customer_notes,status,created_at,updated_at',
    idField: 'service_request_id',
    route: '/website-management#public-upload-review',
    tone: 'amber',
    filter: (query) => query.not('portal_attachment_urls', 'is', null)
  },
  {
    key: 'publish_audit',
    label: 'Publish Audit Logs',
    zh: 'Publish Audit Logs',
    table: 'audit_logs',
    select: 'audit_id,actor_id,role,action,object_type,object_id,created_at',
    idField: 'audit_id',
    route: '/website-management#version-history',
    tone: 'gray',
    filter: (query) => query.in('object_type', ['website_page', 'website_content_block', 'website_publish'])
  }
];

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

function isRow(value: unknown): value is Row {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function specByKey(key: string | null) {
  return specs.find((spec) => spec.key === key) ?? specs[0];
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function rowHref(spec: WebsiteSpec, row: Row) {
  const id = asString(row[spec.idField]);
  return id ? `${spec.route}?open=${encodeURIComponent(id)}` : spec.route;
}

function filterRows(rows: Row[], search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
}

function isMissingColumnError(message: string | undefined | null) {
  return Boolean(message && /column .* does not exist/i.test(message));
}

function normalizeCmsRow(row: Row, spec: WebsiteSpec, fallbackUsed: boolean): Row {
  if (spec.key === 'pages') {
    return {
      ...row,
      slug: row.slug ?? 'legacy-schema-pending-slug',
      _schema_fallback: fallbackUsed ? 'website_pages.slug not present in current DB schema' : undefined
    };
  }
  if (spec.key === 'blocks') {
    return {
      ...row,
      page_id: row.page_id ?? null,
      _schema_fallback: fallbackUsed ? 'website_content_blocks.page_id not present in current DB schema' : undefined
    };
  }
  return row;
}

async function runListQuery(supabase: ReturnType<typeof createAdminClient>, spec: WebsiteSpec, select: string) {
  let query = supabase.from(spec.table).select(select) as unknown as QueryBuilder;
  if (spec.filter) query = spec.filter(query);
  return query.order(spec.orderColumn ?? 'created_at', { ascending: false }).limit(60);
}

async function safeList(supabase: ReturnType<typeof createAdminClient>, spec: WebsiteSpec, search: string) {
  try {
    let fallbackUsed = false;
    let { data, error } = await runListQuery(supabase, spec, spec.select);
    if (error && spec.fallbackSelect && isMissingColumnError(error.message)) {
      fallbackUsed = true;
      const fallback = await runListQuery(supabase, spec, spec.fallbackSelect);
      data = fallback.data;
      error = fallback.error;
    }
    if (error) return { spec, rows: [] as Row[], filteredRows: [] as Row[], error: error.message };
    const rawRows: Row[] = Array.isArray(data) ? (data as unknown[]).filter(isRow) : [];
    const rows = rawRows.map((row) => ({ ...normalizeCmsRow(row, spec, fallbackUsed), _website_href: rowHref(spec, row) }));
    return { spec, rows, filteredRows: filterRows(rows, search), error: null };
  } catch (error) {
    return { spec, rows: [] as Row[], filteredRows: [] as Row[], error: error instanceof Error ? error.message : 'Website query failed' };
  }
}

function cleanStatus(value: unknown) {
  const status = cleanText(value, 60) ?? 'draft';
  return ['draft', 'seo_review', 'ready_to_publish', 'pending_approval', 'published', 'archived'].includes(status) ? status : 'draft';
}

function pagePayload(body: Row) {
  return {
    slug: cleanText(body.slug, 180) ?? 'new-page',
    locale: cleanText(body.locale, 10) ?? 'en',
    title: cleanText(body.title, 240) ?? 'Untitled Website Page',
    meta_title: cleanText(body.meta_title, 240),
    meta_description: cleanText(body.meta_description, 500),
    status: cleanStatus(body.status),
    updated_at: new Date().toISOString()
  };
}

function legacyPagePayload(body: Row) {
  const payload = pagePayload(body);
  return {
    locale: payload.locale,
    title: payload.title,
    meta_title: payload.meta_title,
    meta_description: payload.meta_description,
    status: payload.status,
    updated_at: payload.updated_at
  };
}

function blockPayload(body: Row) {
  const sortOrder = Number(body.sort_order ?? 0);
  return {
    page_id: cleanText(body.page_id, 120),
    block_key: cleanText(body.block_key, 180) ?? 'homepage_content_block',
    locale: cleanText(body.locale, 10) ?? 'en',
    title: cleanText(body.title, 240) ?? 'Untitled Content Block',
    body: cleanText(body.body, 8000) ?? '',
    status: cleanStatus(body.status),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    updated_at: new Date().toISOString()
  };
}

function legacyBlockPayload(body: Row) {
  const payload = blockPayload(body);
  return {
    block_key: payload.block_key,
    locale: payload.locale,
    title: payload.title,
    body: payload.body,
    status: payload.status,
    sort_order: payload.sort_order,
    updated_at: payload.updated_at
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'content_admin', 'support']);
  if (!auth.ok) return auth.response;

  const search = cleanText(request.nextUrl.searchParams.get('search'), 120) ?? '';
  const selectedKey = cleanText(request.nextUrl.searchParams.get('section'), 80) ?? 'pages';
  const supabase = createAdminClient();
  const results = await Promise.all(specs.map((spec) => safeList(supabase, spec, search)));
  const sections = results.map((result) => ({
    key: result.spec.key,
    label: result.spec.label,
    zh: result.spec.zh,
    route: result.spec.route,
    tone: result.spec.tone,
    count: result.filteredRows.length,
    error: result.error
  }));
  const selected = results.find((result) => result.spec.key === selectedKey) ?? results[0];
  const errors = results.filter((result) => result.error).map((result) => ({ key: result.spec.key, error: result.error }));

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'website_management_live_read',
    objectType: 'website_management',
    after: {
      selected_key: selected?.spec.key ?? null,
      search: search || null,
      counts: Object.fromEntries(sections.map((section) => [section.key, section.count])),
      error_count: errors.length
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    selected_key: selected?.spec.key ?? selectedKey,
    sections,
    selectedRows: selected?.filteredRows ?? [],
    errors
  }, errors.length ? 207 : 200);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'content_admin']);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Row;
  const action = cleanText(body.action, 80);
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (action === 'create_page') {
    const payload = { ...pagePayload(body), created_at: now };
    let { data, error } = await supabase.from('website_pages').insert(payload).select('page_id,slug,locale,title,meta_title,meta_description,status,published_at,created_at,updated_at').single();
    if (error && isMissingColumnError(error.message)) {
      const fallbackPayload = { ...legacyPagePayload(body), created_at: now };
      const fallback = await supabase.from('website_pages').insert(fallbackPayload).select('page_id,locale,title,meta_title,meta_description,status,published_at,created_at,updated_at').single();
      data = fallback.data;
      error = fallback.error;
    }
    if (error) return jsonError(error.message, 500);
    const row = normalizeCmsRow((data as Row) ?? {}, specs[0], !Object.prototype.hasOwnProperty.call((data as Row) ?? {}, 'slug'));
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'website_page_create', objectType: 'website_page', objectId: asString(row.page_id), after: row, ip: getClientIp(request) }).catch(() => undefined);
    return json({ ok: true, action, row }, 201);
  }

  if (action === 'create_block') {
    const payload = { ...blockPayload(body), created_at: now };
    let { data, error } = await supabase.from('website_content_blocks').insert(payload).select('block_id,page_id,block_key,locale,title,body,status,sort_order,created_at,updated_at').single();
    if (error && isMissingColumnError(error.message)) {
      const fallbackPayload = { ...legacyBlockPayload(body), created_at: now };
      const fallback = await supabase.from('website_content_blocks').insert(fallbackPayload).select('block_id,block_key,locale,title,body,status,sort_order,created_at,updated_at').single();
      data = fallback.data;
      error = fallback.error;
    }
    if (error) return jsonError(error.message, 500);
    const blockSpec = specs[1];
    const row = normalizeCmsRow((data as Row) ?? {}, blockSpec, !Object.prototype.hasOwnProperty.call((data as Row) ?? {}, 'page_id'));
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'website_content_block_create', objectType: 'website_content_block', objectId: asString(row.block_id), after: row, ip: getClientIp(request) }).catch(() => undefined);
    return json({ ok: true, action, row }, 201);
  }

  return jsonError('Unsupported website management action.', 400);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'content_admin']);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Row;
  const section = cleanText(body.section, 80);
  const spec = specByKey(section);
  if (!['pages', 'blocks'].includes(spec.key)) return jsonError('Only CMS pages and content blocks can be edited from this endpoint.', 400);

  const objectId = cleanText(body.id, 120);
  if (!objectId) return jsonError('Record id is required.', 400);
  const status = cleanStatus(body.status);
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const table = spec.key === 'pages' ? 'website_pages' : 'website_content_blocks';
  const idField = spec.key === 'pages' ? 'page_id' : 'block_id';
  const select = spec.key === 'pages'
    ? 'page_id,slug,locale,title,meta_title,meta_description,status,published_at,created_at,updated_at'
    : 'block_id,page_id,block_key,locale,title,body,status,sort_order,created_at,updated_at';
  const fallbackSelect = spec.key === 'pages'
    ? 'page_id,locale,title,meta_title,meta_description,status,published_at,created_at,updated_at'
    : 'block_id,block_key,locale,title,body,status,sort_order,created_at,updated_at';

  let beforeResult = await supabase.from(table).select(select).eq(idField, objectId).maybeSingle();
  if (beforeResult.error && isMissingColumnError(beforeResult.error.message)) beforeResult = await supabase.from(table).select(fallbackSelect).eq(idField, objectId).maybeSingle();
  const patch = spec.key === 'pages' && status === 'published'
    ? { status, published_at: now, updated_at: now }
    : { status, updated_at: now };
  let { data, error } = await supabase.from(table).update(patch).eq(idField, objectId).select(select).single();
  let fallbackUsed = false;
  if (error && isMissingColumnError(error.message)) {
    fallbackUsed = true;
    const fallback = await supabase.from(table).update(patch).eq(idField, objectId).select(fallbackSelect).single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return jsonError(error.message, 500);
  const row = normalizeCmsRow((data as Row) ?? {}, spec, fallbackUsed);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: spec.key === 'pages' ? 'website_page_status_update' : 'website_content_block_status_update',
    objectType: spec.key === 'pages' ? 'website_page' : 'website_content_block',
    objectId,
    before: beforeResult.data as Row | null,
    after: row,
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, action: 'update_status', row });
}
