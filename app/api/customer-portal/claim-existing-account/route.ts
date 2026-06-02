import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type ClaimMethod = 'phone' | 'email';

function clean(value: unknown) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').trim() : '';
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return json({ ok: false, error: 'Supabase service role is not configured.' }, 503);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: 'Invalid request.' }, 400);

  const claimMethod = clean(body.claim_method) as ClaimMethod;
  const claimIdentifierRaw = clean(body.claim_identifier);
  const claimIdentifier = claimMethod === 'email' ? claimIdentifierRaw.toLowerCase() : claimIdentifierRaw;
  const fullName = clean(body.full_name);

  if (!['phone', 'email'].includes(claimMethod)) return json({ ok: false, error: 'Invalid claim method.' }, 400);
  if (!claimIdentifier) return json({ ok: false, error: 'Claim identifier is required.' }, 400);

  const column = claimMethod === 'email' ? 'claim_email' : 'claim_phone';
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,portal_status,created_source')
    .eq(column, claimIdentifier)
    .in('portal_status', ['unclaimed', 'claim_pending'])
    .maybeSingle();

  if (customerError) return json({ ok: false, error: customerError.message }, 500);
  if (!customer?.customer_id) {
    return json({
      ok: false,
      error: 'No unclaimed NANOFIX customer profile was found for this phone or email. / 没有找到可认领的未认领客户档案。'
    }, 404);
  }

  const now = new Date().toISOString();
  const userAgent = request.headers.get('user-agent') || null;
  const sourceIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;

  const { data: existingOpenClaim } = await supabase
    .from('customer_account_claims')
    .select('customer_account_claim_id,customer_id,status,created_at')
    .eq('customer_id', customer.customer_id)
    .eq('claim_method', claimMethod)
    .eq('claim_identifier', claimIdentifier)
    .in('status', ['pending', 'verified'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOpenClaim?.customer_account_claim_id) {
    await auditLog({
      actor_role: 'customer_self_service',
      action: 'customer_claim_request_duplicate_blocked',
      object_type: 'customer_account_claims',
      object_id: existingOpenClaim.customer_account_claim_id,
      metadata: { customer_id: customer.customer_id, claim_method: claimMethod, portal_status: 'claim_pending' }
    });

    return json({
      ok: true,
      message: 'A claim request is already pending review. NANOFIX will verify it before activation. / 已有认领申请在等待审核，NANOFIX 会核验后再激活账号。',
      claim_id: existingOpenClaim.customer_account_claim_id,
      customer_id: customer.customer_id,
      portal_status: 'claim_pending'
    });
  }

  const { data: claim, error: claimError } = await supabase
    .from('customer_account_claims')
    .insert({
      customer_id: customer.customer_id,
      claim_method: claimMethod,
      claim_identifier: claimIdentifier,
      status: 'pending',
      otp_verified: false,
      source_ip: sourceIp,
      user_agent: userAgent,
      metadata_json: {
        full_name: fullName || null,
        requested_from: 'customer_portal_claim_existing_account',
        portal_status_before: customer.portal_status,
        matching_customer_source: customer.created_source,
        next_step: 'admin_review_or_otp_verification',
        password_created_by_admin: false
      },
      created_at: now,
      updated_at: now
    })
    .select('customer_account_claim_id,customer_id,status,claim_method,created_at')
    .single();

  if (claimError) return json({ ok: false, error: claimError.message }, 500);

  await supabase
    .from('customers')
    .update({ portal_status: 'claim_pending', updated_at: now })
    .eq('customer_id', customer.customer_id);

  await auditLog({
    actor_role: 'customer_self_service',
    action: 'customer_claim_request_created',
    object_type: 'customer_account_claims',
    object_id: claim.customer_account_claim_id,
    metadata: {
      customer_id: customer.customer_id,
      claim_id: claim.customer_account_claim_id,
      claim_method: claimMethod,
      portal_status: 'claim_pending'
    }
  });

  return json({
    ok: true,
    message: 'Claim request created. NANOFIX will verify this request before account activation. / 认领申请已创建，NANOFIX 会先核验后再激活账号。',
    claim_id: claim.customer_account_claim_id,
    customer_id: customer.customer_id,
    portal_status: 'claim_pending'
  });
}
