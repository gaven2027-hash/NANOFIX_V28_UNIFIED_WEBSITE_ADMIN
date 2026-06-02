import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireAdminApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type ClaimStatus = 'pending' | 'verified' | 'approved' | 'rejected' | 'expired';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}

function isAction(value: string | null) {
  return value === 'approve' || value === 'reject';
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function jsonObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'support', 'finance']);
  if (!auth.ok) return auth.response;

  const status = cleanText(request.nextUrl.searchParams.get('status'), 40) as ClaimStatus | null;
  const allowedStatus: ClaimStatus[] = ['pending', 'verified', 'approved', 'rejected', 'expired'];
  const supabase = createAdminClient();

  let query = supabase
    .from('customer_account_claims')
    .select('customer_account_claim_id,customer_id,claim_method,claim_identifier,status,otp_verified,claimed_auth_user_id,reviewed_by,reviewed_at,rejection_reason,created_at,updated_at,metadata_json,customers(customer_id,name,phone,email,portal_status,created_source)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status && allowedStatus.includes(status)) query = query.eq('status', status);
  else query = query.in('status', ['pending', 'verified']);

  const { data, error } = await query;
  if (error) return json({ ok: false, rows: [], error: error.message }, 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_account_claims_read',
    objectType: 'customer_account_claims',
    after: { status: status || ['pending', 'verified'], count: data?.length ?? 0 },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, rows: data || [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'support']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = cleanText(body.action, 30);
  const claimId = cleanText(body.claim_id, 120);
  const note = cleanText(body.note, 1000);
  const claimedAuthUserId = cleanText(body.claimed_auth_user_id, 120);

  if (!isAction(action)) return jsonError('Action must be approve or reject.', 400);
  if (!isUuid(claimId)) return jsonError('Valid claim_id is required.', 400);
  if (action === 'approve' && claimedAuthUserId && !isUuid(claimedAuthUserId)) return jsonError('claimed_auth_user_id must be a valid UUID when provided.', 400);
  if (action === 'reject' && !note) return jsonError('Rejection note is required for audit.', 400);

  const supabase = createAdminClient();
  const { data: claim, error: claimError } = await supabase
    .from('customer_account_claims')
    .select('customer_account_claim_id,customer_id,claim_method,claim_identifier,status,otp_verified,claimed_auth_user_id,metadata_json')
    .eq('customer_account_claim_id', claimId)
    .maybeSingle();

  if (claimError) return jsonError(claimError.message, 500);
  if (!claim?.customer_account_claim_id) return jsonError('Claim request not found.', 404);
  if (!['pending', 'verified'].includes(String(claim.status))) return jsonError('Only pending or verified claims can be reviewed.', 409);

  const { data: customerBefore } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,portal_status,claimed_auth_user_id,metadata_json')
    .eq('customer_id', claim.customer_id)
    .maybeSingle();

  const now = new Date().toISOString();
  const claimPatch = {
    status: action === 'approve' ? 'approved' : 'rejected',
    reviewed_by: auth.actor.profileId,
    reviewed_at: now,
    rejection_reason: action === 'reject' ? note : null,
    claimed_auth_user_id: action === 'approve' ? (claimedAuthUserId || claim.claimed_auth_user_id || null) : claim.claimed_auth_user_id || null,
    metadata_json: {
      ...jsonObject(claim.metadata_json),
      reviewed_by_role: auth.role,
      reviewed_note: note || null,
      review_action: action,
      review_flow: 'customer_center_claim_existing_account_review'
    },
    updated_at: now
  };

  const { data: updatedClaim, error: updateClaimError } = await supabase
    .from('customer_account_claims')
    .update(claimPatch)
    .eq('customer_account_claim_id', claimId)
    .select('customer_account_claim_id,customer_id,status,claim_method,claim_identifier,reviewed_at,reviewed_by,claimed_auth_user_id')
    .single();

  if (updateClaimError) return jsonError(updateClaimError.message, 500);
  if (!updatedClaim?.customer_account_claim_id) return jsonError('Claim update result is missing.', 500);

  const customerPatch = action === 'approve'
    ? {
        portal_status: 'claimed',
        status: 'active',
        claimed_auth_user_id: claimedAuthUserId || claim.claimed_auth_user_id || null,
        metadata_json: {
          ...jsonObject(customerBefore?.metadata_json),
          account_claim_approved_at: now,
          account_claim_approved_by: auth.actor.profileId,
          account_claim_id: claimId,
          customer_portal_access: 'claimed_after_admin_review'
        },
        updated_at: now
      }
    : {
        portal_status: 'unclaimed',
        metadata_json: {
          ...jsonObject(customerBefore?.metadata_json),
          account_claim_rejected_at: now,
          account_claim_rejected_by: auth.actor.profileId,
          account_claim_rejection_reason: note,
          account_claim_id: claimId
        },
        updated_at: now
      };

  const { data: updatedCustomer, error: updateCustomerError } = await supabase
    .from('customers')
    .update(customerPatch)
    .eq('customer_id', claim.customer_id)
    .select('customer_id,name,phone,email,portal_status,claimed_auth_user_id,updated_at')
    .single();

  if (updateCustomerError) return jsonError(updateCustomerError.message, 500);
  if (!updatedCustomer?.customer_id) return jsonError('Customer update result is missing.', 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: action === 'approve' ? 'customer_claim_request_approved' : 'customer_claim_request_rejected',
    objectType: 'customer_account_claims',
    objectId: claimId,
    before: { claim, customer: customerBefore ?? null },
    after: { claim: updatedClaim, customer: updatedCustomer, note: note || null },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({ ok: true, action, claim: updatedClaim, customer: updatedCustomer });
}
