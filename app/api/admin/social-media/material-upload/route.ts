import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

const bucket = 'nanofix-social-materials';
const allowedKinds = ['source_video', 'reference_video', 'video_clip', 'image', 'cover_image'] as const;
const allowedMimePrefixes = ['video/', 'image/'];
const maxFileSize = 500 * 1024 * 1024;

type UploadKind = (typeof allowedKinds)[number];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function safeName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'upload.bin';
}

function normaliseKind(value: FormDataEntryValue | null): UploadKind {
  const kind = typeof value === 'string' ? value : 'video_clip';
  return allowedKinds.includes(kind as UploadKind) ? (kind as UploadKind) : 'video_clip';
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError('Invalid multipart form data.');

  const file = form.get('file');
  if (!(file instanceof File)) return jsonError('A file is required.');
  if (file.size <= 0) return jsonError('Uploaded file is empty.');
  if (file.size > maxFileSize) return jsonError('File is too large. Maximum size is 500MB.');
  if (!allowedMimePrefixes.some((prefix) => file.type.startsWith(prefix))) {
    return jsonError('Only image and video files are allowed.');
  }

  const kind = normaliseKind(form.get('kind'));
  const now = new Date();
  const datePrefix = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(now.getUTCDate()).padStart(2, '0')}`;
  const objectPath = `${kind}/${datePrefix}/${Date.now()}-${crypto.randomUUID()}-${safeName(file.name)}`;

  const { data, error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    cacheControl: '3600',
    contentType: file.type || 'application/octet-stream',
    upsert: false
  });
  if (error) return jsonError(error.message, 500);

  const signed = await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60 * 24 * 7);
  const result = {
    kind,
    bucket,
    path: data.path,
    signed_url: signed.data?.signedUrl || null,
    name: file.name,
    size_bytes: file.size,
    mime_type: file.type,
    uploaded_at: now.toISOString(),
    admin_review_required: true,
    ai_auto_publish_allowed: false
  };

  await auditLog({
    actor_id: context?.actorId,
    actor_role: context?.role,
    action: 'upload_social_material',
    object_type: 'social_material',
    object_id: data.path,
    after_data: result
  });

  return NextResponse.json({ ok: true, material: result });
}
