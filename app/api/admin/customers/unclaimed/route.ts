import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, requireAdminApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'support', 'finance']);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,portal_status,created_source,created_at')
    .in('portal_status', ['unclaimed', 'claim_pending'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return json({ ok: false, rows: [], error: error.message }, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'unclaimed_customer_profiles_read',
    objectType: 'customers',
    after: { count: data?.length ?? 0, portal_status: ['unclaimed', 'claim_pending'] },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, rows: data || [] });
}
