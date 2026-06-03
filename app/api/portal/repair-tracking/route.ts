import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, requireActorApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, ['customer', 'super_admin', 'operations_admin', 'support']);
  if (!auth.ok) return auth.response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return json({ ok: false, error: 'Customer portal data service is not configured.' }, 503);

  let customerId = cleanText(request.nextUrl.searchParams.get('customer_id'), 120);

  if (auth.role === 'customer') {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('customer_id,profile_id')
      .eq('profile_id', auth.actor.profileId)
      .maybeSingle();
    if (customerError) return json({ ok: false, error: 'Could not verify customer portal account.' }, 500);
    customerId = typeof customer?.customer_id === 'string' ? customer.customer_id : null;
  }

  if (!isUuid(customerId)) {
    return json({ ok: false, error: 'A valid customer_id is required for repair tracking.' }, 400);
  }

  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,status,priority,issue_type,binding_status,source_platform,created_at,updated_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return json({ ok: false, error: 'Could not read repair tracking records.' }, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'portal_repair_tracking_read',
    objectType: 'service_requests',
    objectId: customerId,
    after: { result_count: data?.length ?? 0, access_scope: auth.role === 'customer' ? 'self' : 'admin_lookup' },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, customer_id: customerId, requests: data ?? [] });
}
