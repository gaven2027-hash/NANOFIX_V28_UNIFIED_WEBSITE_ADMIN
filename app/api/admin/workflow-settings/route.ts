export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const ALLOWED_SETTING_TYPES = ['automation_rule_setting', 'notification_channel', 'unified_task_sla', 'escalation_rule'];

type JsonRecord = Record<string, unknown>;

function parseJsonRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer']);
  if (!auth.ok) return auth.response;

  const settingType = cleanText(request.nextUrl.searchParams.get('setting_type'), 80);
  const supabase = createAdminClient();
  let query = supabase
    .from('workflow_settings')
    .select('setting_id,setting_key,setting_type,name,description,value_json,is_enabled,updated_by,created_at,updated_at')
    .order('setting_type', { ascending: true })
    .order('updated_at', { ascending: false });

  if (settingType) query = query.eq('setting_type', settingType);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'workflow_settings_read',
    objectType: 'workflow_settings',
    after: { setting_type: settingType, count: data?.length ?? 0 }
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, settings: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'content_admin', 'support']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const settingKey = cleanText(body.setting_key, 160);
  const settingType = cleanText(body.setting_type, 80);
  const name = cleanText(body.name, 180);
  const description = cleanText(body.description, 500);
  const valueJson = parseJsonRecord(body.value_json);
  const isEnabled = typeof body.is_enabled === 'boolean' ? body.is_enabled : true;

  if (!settingKey || !settingType || !name || !valueJson) return jsonError('setting_key, setting_type, name and value_json are required.', 400);
  if (!ALLOWED_SETTING_TYPES.includes(settingType)) return jsonError('Unsupported workflow setting type.', 400);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('workflow_settings')
    .upsert({
      setting_key: settingKey,
      setting_type: settingType,
      name,
      description,
      value_json: valueJson,
      is_enabled: isEnabled,
      updated_by: auth.actor.profileId
    }, { onConflict: 'setting_key' })
    .select('setting_id,setting_key,setting_type,name,description,value_json,is_enabled,updated_by,created_at,updated_at')
    .single();

  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'workflow_setting_upsert',
    objectType: 'workflow_settings',
    objectId: data.setting_id,
    after: data
  });

  return NextResponse.json({ ok: true, setting: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireActorApi(request, ['super_admin', 'operations_admin', 'content_admin', 'support']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const settingId = cleanText(body.setting_id, 120);
  const settingKey = cleanText(body.setting_key, 160);
  if (!settingId && !settingKey) return jsonError('setting_id or setting_key is required.', 400);

  const patch: Record<string, unknown> = { updated_by: auth.actor.profileId };
  const name = cleanText(body.name, 180);
  const description = cleanText(body.description, 500);
  const valueJson = parseJsonRecord(body.value_json);
  const isEnabled = typeof body.is_enabled === 'boolean' ? body.is_enabled : undefined;
  if (name) patch.name = name;
  if (description !== null) patch.description = description;
  if (valueJson) patch.value_json = valueJson;
  if (typeof isEnabled === 'boolean') patch.is_enabled = isEnabled;

  if (Object.keys(patch).length <= 1) return jsonError('No supported workflow setting fields to update.', 400);

  const supabase = createAdminClient();
  const beforeQuery = settingId
    ? supabase.from('workflow_settings').select('setting_id,setting_key,setting_type,name,description,value_json,is_enabled').eq('setting_id', settingId)
    : supabase.from('workflow_settings').select('setting_id,setting_key,setting_type,name,description,value_json,is_enabled').eq('setting_key', settingKey);
  const { data: before } = await beforeQuery.maybeSingle();

  let updateQuery = supabase.from('workflow_settings').update(patch);
  updateQuery = settingId ? updateQuery.eq('setting_id', settingId) : updateQuery.eq('setting_key', settingKey);
  const { data, error } = await updateQuery
    .select('setting_id,setting_key,setting_type,name,description,value_json,is_enabled,updated_by,created_at,updated_at')
    .single();

  if (error) return jsonError(error.message, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'workflow_setting_update',
    objectType: 'workflow_settings',
    objectId: data.setting_id,
    before: before ?? null,
    after: data
  });

  return NextResponse.json({ ok: true, setting: data });
}
