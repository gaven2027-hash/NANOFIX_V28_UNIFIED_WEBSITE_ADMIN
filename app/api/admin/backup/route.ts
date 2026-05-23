export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, cleanText, getClientIp } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin']);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('backup_jobs')
    .select('backup_id,module_key,schedule_text,status,encryption_required,signed_url,signed_url_expires_at,failure_reason,created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, backups: data, data_loop: 'backup_jobs -> encrypted worker -> signed URL approval -> audit_logs' });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('create_backup_job_tx', {
    p_module_key: cleanText(body.module_key, 80) ?? 'central_database',
    p_schedule_text: cleanText(body.schedule_text, 160) ?? 'manual_now',
    p_actor_id: auth.actor.profileId,
    p_actor_role: auth.role,
    p_ip: getClientIp(request)
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, backup: data, note: 'Queued in backup_jobs. Worker must encrypt the backup and issue signed URLs only after approval.' });
}
