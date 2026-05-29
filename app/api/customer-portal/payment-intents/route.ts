export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function customerIdsForProfile(profileId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .limit(20);
  if (error) throw new Error(error.message);
  return unique((data ?? []).map((row) => row.customer_id as string));
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;

  const customerIds = await customerIdsForProfile(auth.actor.profileId);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 20), 1), 50);
  if (!customerIds.length) return NextResponse.json({ ok: true, payment_intents: [] });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payment_intents')
    .select('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,payment_url,expires_at,created_at,updated_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_payment_intents_read',
    objectType: 'payment_intents',
    after: { count: data?.length ?? 0 },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, payment_intents: data ?? [] });
}
