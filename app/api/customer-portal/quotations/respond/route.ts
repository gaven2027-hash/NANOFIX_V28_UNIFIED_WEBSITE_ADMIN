export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_ROLES = ['customer'] as const;
const RESPONSE_TYPES = ['accept', 'request_revision', 'decline'] as const;

type Row = Record<string, unknown>;
type AdminClient = ReturnType<typeof createAdminClient>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function idOf(row: Row | null | undefined, key: string) {
  const value = row?.[key];
  return typeof value === 'string' && value ? value : null;
}

function numberOf(row: Row | null | undefined, key: string, fallback = 0) {
  const value = row?.[key];
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isResponseType(value: string | null): value is typeof RESPONSE_TYPES[number] {
  return value === 'accept' || value === 'request_revision' || value === 'decline';
}

async function customerIdsForProfile(supabase: AdminClient, profileId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .limit(20);

  if (error) throw new Error(error.message);

  return new Set(
    (Array.isArray(data) ? data : [])
      .map((row) => idOf(row as Row, 'customer_id'))
      .filter((value): value is string => Boolean(value))
  );
}

async function getServiceRequestCustomerId(supabase: AdminClient, serviceRequestId: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id')
    .eq('service_request_id', serviceRequestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return idOf(data as Row | null, 'customer_id');
}

async function resolveQuotationOwner(
  supabase: AdminClient,
  quotation: Row,
  customerIds: Set<string>
) {
  const directRequestId = idOf(quotation, 'service_request_id');
  if (directRequestId) {
    const requestCustomerId = await getServiceRequestCustomerId(supabase, directRequestId);
    if (requestCustomerId && customerIds.has(requestCustomerId)) return requestCustomerId;
  }

  const jobId = idOf(quotation, 'job_id');
  if (jobId) {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('job_id,service_request_id,customer_id')
      .eq('job_id', jobId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const jobCustomerId = idOf(job as Row | null, 'customer_id');
    if (jobCustomerId && customerIds.has(jobCustomerId)) return jobCustomerId;

    const jobRequestId = idOf(job as Row | null, 'service_request_id');
    if (jobRequestId) {
      const requestCustomerId = await getServiceRequestCustomerId(supabase, jobRequestId);
      if (requestCustomerId && customerIds.has(requestCustomerId)) return requestCustomerId;
    }
  }

  return null;
}

function statusForResponse(responseType: typeof RESPONSE_TYPES[number]) {
  if (responseType === 'accept') return 'customer_accepted';
  if (responseType === 'request_revision') return 'customer_revision_requested';
  return 'customer_declined';
}

function labelForResponse(responseType: typeof RESPONSE_TYPES[number]) {
  if (responseType === 'accept') return 'Customer accepted quotation';
  if (responseType === 'request_revision') return 'Customer requested quotation revision';
  return 'Customer declined quotation';
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...ALLOWED_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Row;
  const quotationId = cleanText(body.quotation_id, 120);
  const responseType = cleanText(body.response_type, 80);
  const customerMessage = cleanText(body.customer_message, 1200) ?? '';

  if (!isUuid(quotationId)) return jsonError('Valid quotation_id is required.', 400);
  if (!isResponseType(responseType)) return jsonError('response_type must be accept, request_revision or decline.', 400);
  if ((responseType === 'request_revision' || responseType === 'decline') && customerMessage.length < 3) {
    return jsonError('Please provide a short message for revision request or decline.', 400);
  }

  const supabase = createAdminClient();
  const warnings: string[] = [];
  const customerIds = await customerIdsForProfile(supabase, auth.actor.profileId);

  if (!customerIds.size) {
    return jsonError('No active customer profile is linked to this account.', 403);
  }

  const { data: quotationData, error: quotationError } = await supabase
    .from('quotations')
    .select('quotation_id,job_id,service_request_id,current_version,total,approval_status,visible_to_customer,pdf_storage_path,public_ref,created_at')
    .eq('quotation_id', quotationId)
    .eq('visible_to_customer', true)
    .maybeSingle();

  if (quotationError) return jsonError(quotationError.message, 400);
  if (!quotationData) return jsonError('Quotation not found or not visible to this customer.', 404);

  const quotation = quotationData as Row;
  const customerId = await resolveQuotationOwner(supabase, quotation, customerIds);
  if (!customerId) return jsonError('Quotation is not linked to your customer profile.', 404);

  const beforeStatus = String(quotation.approval_status ?? 'pending_customer');
  const afterStatus = statusForResponse(responseType);
  const currentVersion = numberOf(quotation, 'current_version', 1);
  const quotedTotal = numberOf(quotation, 'total', 0);

  const { data: response, error: responseError } = await supabase
    .from('quotation_customer_responses')
    .insert({
      quotation_id: quotationId,
      quotation_version: currentVersion,
      customer_id: customerId,
      response_type: responseType,
      response_status: 'submitted',
      quoted_total: quotedTotal,
      quoted_pdf_storage_path: typeof quotation.pdf_storage_path === 'string' ? quotation.pdf_storage_path : null,
      customer_message: customerMessage
    })
    .select('response_id,quotation_id,quotation_version,customer_id,response_type,response_status,quoted_total,quoted_pdf_storage_path,customer_message,created_at')
    .single();

  if (responseError) return jsonError(responseError.message, 400);

  const { data: updatedQuotation, error: updateError } = await supabase
    .from('quotations')
    .update({ approval_status: afterStatus })
    .eq('quotation_id', quotationId)
    .select('quotation_id,job_id,service_request_id,current_version,total,approval_status,visible_to_customer,pdf_storage_path,public_ref,created_at')
    .single();

  if (updateError) return jsonError(updateError.message, 400);

  const logResult = await supabase.from('status_transition_logs').insert({
    machine: 'quotation',
    object_id: quotationId,
    from_status: beforeStatus,
    to_status: afterStatus,
    reason: `${labelForResponse(responseType)} from Customer Portal.${customerMessage ? ` Message: ${customerMessage}` : ''}`,
    actor_role: auth.role
  });

  if (logResult.error) warnings.push(`status_transition_logs: ${logResult.error.message}`);

  if (responseType !== 'accept') {
    const taskResult = await supabase.from('unified_tasks').insert({
      source_module: 'customer_portal',
      source_table: 'quotation_customer_responses',
      source_id: (response as Row).response_id,
      title: labelForResponse(responseType),
      description: customerMessage || labelForResponse(responseType),
      priority: responseType === 'decline' ? 'P1' : 'P2',
      assignee_role: 'finance',
      status: 'open',
      metadata_json: {
        quotation_id: quotationId,
        response_id: (response as Row).response_id,
        response_type: responseType,
        customer_id: customerId,
        quotation_version: currentVersion,
        quoted_total: quotedTotal
      }
    });

    if (taskResult.error) warnings.push(`unified_tasks: ${taskResult.error.message}`);
  }

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_quotation_response_create',
    objectType: 'quotation',
    objectId: quotationId,
    before: quotation,
    after: { quotation: updatedQuotation, response, warnings },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    action: 'customer_portal_quotation_response_create',
    quotation: updatedQuotation,
    response,
    warnings
  }, { status: 201 });
}