import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { getOperationModule, getPublicModuleConfig, operationModules } from '@/lib/nanofix/operationsConfig';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanSearch(input: string) {
  return input.replace(/[,%()]/g, ' ').trim().slice(0, 120);
}

function normalizeValue(value: unknown, type?: string) {
  if (value === undefined || value === null || value === '') return null;
  if (type === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (type === 'datetime-local') {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return String(value).trim();
}

function buildInsertPayload(moduleKey: string, body: Payload) {
  const config = getOperationModule(moduleKey);
  if (!config) return null;

  const payload: Payload = {};
  for (const field of config.formFields) {
    const value = normalizeValue(body[field.name], field.type);
    if (value !== null) payload[field.name] = value;
  }
  if ('status' in body && config.statusOptions.includes(String(body.status))) payload.status = String(body.status);
  return payload;
}

async function readRows(moduleKey: string, search: string | null, status: string | null) {
  const config = getOperationModule(moduleKey);
  const supabase = createSupabaseAdminClient();
  if (!config) return { ok: false as const, status: 404, error: 'Unknown service operations module.' };
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };

  let query = supabase
    .from(config.table)
    .select(config.columns.join(','))
    .order('created_at', { ascending: false })
    .limit(100);

  if (status && config.statusOptions.includes(status)) query = query.eq('status', status);
  const sanitizedSearch = search ? cleanSearch(search) : '';
  if (sanitizedSearch && config.searchFields.length) {
    query = query.or(config.searchFields.map((field) => `${field}.ilike.%${sanitizedSearch}%`).join(','));
  }

  const { data, error } = await query;
  if (error) return { ok: false as const, status: 500, error: error.message };
  return { ok: true as const, data: data ?? [], config: getPublicModuleConfig(config) };
}

async function readBoardRows() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase server client is not configured.' };

  const results = await Promise.all(
    operationModules.map(async (config) => {
      const { data, error } = await supabase
        .from(config.table)
        .select(config.columns.join(','))
        .order('created_at', { ascending: false })
        .limit(12);
      return { config: getPublicModuleConfig(config), rows: error ? [] : data ?? [], error: error?.message ?? null };
    })
  );

  return { ok: true as const, modules: results };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:operations');
  if (response) return response;

  const url = new URL(request.url);
  const moduleKey = url.searchParams.get('module');
  const board = url.searchParams.get('board') === '1';

  if (board) {
    const result = await readBoardRows();
    if (!result.ok) return jsonError(result.error, result.status);
    return NextResponse.json({ ok: true, modules: result.modules });
  }

  if (!moduleKey) {
    return NextResponse.json({ ok: true, modules: operationModules.map(getPublicModuleConfig) });
  }

  const result = await readRows(moduleKey, url.searchParams.get('search'), url.searchParams.get('status'));
  if (!result.ok) return jsonError(result.error, result.status);
  return NextResponse.json({ ok: true, rows: result.data, config: result.config });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const moduleKey = String(body.module || '');
  const config = getOperationModule(moduleKey);
  if (!config) return jsonError('Unknown service operations module.', 404);

  const { context, response } = requireAdmin(request, config.permission);
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const payload = buildInsertPayload(moduleKey, body.data as Payload || body);
  if (!payload) return jsonError('Invalid payload.');

  for (const field of config.formFields) {
    if (field.required && !payload[field.name]) return jsonError(`${field.label} is required.`);
  }

  const { data, error } = await supabase
    .from(config.table)
    .insert(payload)
    .select(config.columns.join(','))
    .single();

  if (error) return jsonError(error.message, 500);

  await auditLog({
    actor_id: context?.actorId,
    actor_role: context?.role,
    action: 'create',
    object_type: config.objectType,
    object_id: (data as Payload)[config.primaryKey],
    after_data: data
  });

  return NextResponse.json({ ok: true, row: data, config: getPublicModuleConfig(config) });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const moduleKey = String(body.module || '');
  const config = getOperationModule(moduleKey);
  if (!config) return jsonError('Unknown service operations module.', 404);

  const { context, response } = requireAdmin(request, config.permission);
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const id = String(body.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError('A valid record id is required.');

  if (typeof body.status === 'string' && config.statusOptions.includes(body.status)) {
    const { data, error } = await supabase.rpc('nanofix_admin_update_status_with_audit', {
      p_object_type: config.objectType,
      p_object_id: id,
      p_to_status: body.status,
      p_actor_id: /^[0-9a-f-]{36}$/i.test(context?.actorId || '') ? context?.actorId : null,
      p_actor_role: context?.role ?? null,
      p_reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null
    });
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, result: data, config: getPublicModuleConfig(config) });
  }

  const payload = buildInsertPayload(moduleKey, body.data as Payload || body);
  if (!payload || !Object.keys(payload).length) return jsonError('No editable fields supplied.');

  const { data: before } = await supabase
    .from(config.table)
    .select(config.columns.join(','))
    .eq(config.primaryKey, id)
    .maybeSingle();

  const { data, error } = await supabase
    .from(config.table)
    .update(payload)
    .eq(config.primaryKey, id)
    .select(config.columns.join(','))
    .single();

  if (error) return jsonError(error.message, 500);

  await auditLog({
    actor_id: context?.actorId,
    actor_role: context?.role,
    action: 'update',
    object_type: config.objectType,
    object_id: id,
    before_data: before ?? {},
    after_data: data
  });

  return NextResponse.json({ ok: true, row: data, config: getPublicModuleConfig(config) });
}
