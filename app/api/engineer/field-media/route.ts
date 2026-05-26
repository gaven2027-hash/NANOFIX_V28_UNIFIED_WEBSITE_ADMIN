import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

const bucket = 'nanofix-media-library';
const signedUrlSeconds = 900;
const allowedObjectTypes = ['service_request', 'job', 'engineer_inspection', 'warranty'];
const linkColumns = 'link_id,asset_id,object_type,object_id,reference_label,module_key,usage_context,upload_stage,visibility,description,tags,metadata_json,status,created_by,created_at,updated_at,media_assets(asset_id,source_type,module_key,usage_context,title,alt_text,description,asset_url,storage_bucket,storage_path,original_filename,mime_type,size_bytes,tags,metadata_json,status,created_at)';

function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function text(value: unknown, fallback = '', max = 2000) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }
function safeJson(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function list(value: unknown) { return Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(',').map((item) => item.trim()) : []; }
function isOpsRole(role: string) { return ['super_admin', 'operations_admin', 'support'].includes(role); }

function engineerCanRead(row: Row, actorId: string, authUserId?: string, email?: string) {
  if (String(row.created_by || '') === actorId) return true;
  const meta = safeJson(row.metadata_json);
  const asset = safeJson(row.media_assets);
  const assetMeta = safeJson(asset.metadata_json);
  const ids = [
    meta.engineer_actor_id,
    meta.assigned_engineer_actor_id,
    meta.engineer_id,
    meta.assigned_engineer_id,
    assetMeta.engineer_actor_id,
    assetMeta.assigned_engineer_actor_id,
    ...list(meta.engineer_actor_ids),
    ...list(meta.assigned_engineer_actor_ids),
    ...list(meta.engineer_ids),
    ...list(meta.assigned_engineer_ids),
    ...list(assetMeta.engineer_actor_ids),
    ...list(assetMeta.assigned_engineer_actor_ids)
  ].map(String);
  const emails = [meta.engineer_email, meta.assigned_engineer_email, ...list(meta.engineer_emails), ...list(meta.assigned_engineer_emails)].map((item) => String(item || '').toLowerCase());
  return ids.includes(actorId) || Boolean(authUserId && ids.includes(authUserId)) || Boolean(email && emails.includes(email.toLowerCase()));
}

async function signRows(rows: Row[]) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return rows;
  return Promise.all(rows.map(async (row) => {
    const asset = safeJson(row.media_assets);
    const storagePath = text(asset.storage_path, '', 2000);
    const storageBucket = text(asset.storage_bucket, bucket, 200);
    if (!storagePath) return row;
    const { data } = await supabase.storage.from(storageBucket).createSignedUrl(storagePath, signedUrlSeconds);
    return { ...row, media_assets: { ...asset, asset_url: data?.signedUrl || asset.asset_url || null, signed_asset_url: data?.signedUrl || null, signed_url_expires_in: signedUrlSeconds, private_storage: Boolean(data?.signedUrl) } };
  }));
}

export async function GET(request: Request) {
  const { context, response } = requireAdmin(request, 'read:operations');
  if (response) return response;
  if (!context || !['engineer', 'super_admin', 'operations_admin', 'support'].includes(context.role)) return jsonError('Engineer media access denied.', 403);

  const objectType = text(new URL(request.url).searchParams.get('object_type'), '', 80);
  const objectId = text(new URL(request.url).searchParams.get('object_id'), '', 80);
  if (!allowedObjectTypes.includes(objectType)) return jsonError('A valid object_type is required.');
  if (!validUuid(objectId)) return jsonError('A valid object_id is required.');

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const { data, error } = await supabase
    .from('field_media_links')
    .select(linkColumns)
    .eq('object_type', objectType)
    .eq('object_id', objectId)
    .eq('visibility', 'engineer_visible')
    .in('status', ['active', 'approved'])
    .order('created_at', { ascending: false })
    .limit(120);
  if (error) return jsonError(error.message, 500);

  const rows = isOpsRole(context.role) ? (data || []) : (data || []).filter((row) => engineerCanRead(row as Row, context.actorId, context.authUserId, context.email));
  const links = await signRows(rows as Row[]);

  await auditLog({ actor_id: context.actorId, actor_role: context.role, action: 'engineer_read_field_media_links', object_type: 'field_media_links', object_id: objectId, after_data: { object_type: objectType, object_id: objectId, visibility: 'engineer_visible', returned_count: links.length } });

  return NextResponse.json({ ok: true, object_type: objectType, object_id: objectId, visibility: 'engineer_visible', signed_url_expires_in: signedUrlSeconds, links });
}
