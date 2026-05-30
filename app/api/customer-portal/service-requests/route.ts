export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;
const REQUEST_TYPES = ['new_repair', 'warranty_repair'] as const;
type RequestType = typeof REQUEST_TYPES[number];
type ApiPayload = Record<string, unknown>;

function requestTypeFromBody(value: unknown): RequestType {
  const text = cleanText(value, 80);
  if (text === 'warranty_repair' || text === 'warranty_claim') return 'warranty_repair';
  return 'new_repair';
}

function estimatePriority(issue: string, requestType: RequestType) {
  const normalized = issue.toLowerCase();
  if (requestType === 'warranty_repair') return 'P1';
  if (/(urgent|leak|ceiling|burst|flood|complaint|warranty)/i.test(normalized)) return 'P0';
  if (/(same day|inspection|quote|bathroom|toilet|seepage)/i.test(normalized)) return 'P1';
  return 'P2';
}

function urgencyScore(priority: string) {
  if (priority === 'P0') return 95;
  if (priority === 'P1') return 72;
  return 40;
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function attachmentUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item, 700)).filter((item): item is string => Boolean(item)).slice(0, 12);
}

async function activeCustomerForProfile(profileId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,account_status,binding_status')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function warrantyBelongsToCustomer(warrantyId: string, customerId: string) {
  const supabase = createAdminClient();
  if (!isUuid(warrantyId)) return null;
  const { data: warranty, error } = await supabase
    .from('warranties')
    .select('warranty_id,job_id,status,coverage,starts_at,ends_at')
    .eq('warranty_id', warrantyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!warranty?.job_id) return null;
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('job_id,customer_id')
    .eq('job_id', warranty.job_id as string)
    .maybeSingle();
  if (jobError) throw new Error(jobError.message);
  return job?.customer_id === customerId ? warranty : null;
}

async function createCustomerPortalTaskAndInbox(input: { sourceId: string; title: string; description: string; priority: string; requestType: RequestType; customerId: string; leadId: string | null; warrantyId: string | null }) {
  const supabase = createAdminClient();
  const { data: task, error: taskError } = await supabase
    .from('unified_tasks')
    .insert({
      source_module: 'customer_portal',
      source_table: 'service_requests',
      source_id: input.sourceId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      assignee_role: 'operations_admin',
      status: 'open',
      metadata_json: {
        source: 'customer_portal_unified_service_request',
        request_origin: 'customer_portal',
        customer_portal_request_type: input.requestType,
        customer_id: input.customerId,
        lead_id: input.leadId,
        related_warranty_id: input.warrantyId
      }
    })
    .select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at')
    .single();
  if (taskError) throw new Error(taskError.message);

  await supabase.from('task_events').insert({ task_id: task.task_id, action: 'customer_portal_service_request_created_in_unified_queue', after_json: task }).throwOnError();

  const { data: inbox, error: inboxError } = await supabase
    .from('internal_inbox_messages')
    .insert({
      recipient_role: 'operations_admin',
      subject: input.title,
      body: input.description,
      category: 'customer_portal_request',
      priority: input.priority,
      related_object_type: 'service_request',
      related_object_id: input.sourceId,
      task_id: task.task_id
    })
    .select('message_id,recipient_role,subject,category,priority,related_object_type,related_object_id,task_id,created_at')
    .single();
  if (inboxError) throw new Error(inboxError.message);

  return { task, inbox };
}

async function queueCustomerConfirmation(input: { customerId: string; serviceRequestId: string; requestType: RequestType }) {
  const supabase = createAdminClient();
  const warranty = input.requestType === 'warranty_repair';
  const { data, error } = await supabase
    .from('notification_outbox')
    .insert({
      channel: 'internal',
      recipient_customer_id: input.customerId,
      subject: warranty ? 'NANOFIX warranty repair request received' : 'NANOFIX repair request received',
      body: warranty
        ? 'Your warranty repair request has entered NANOFIX Service Operations for review and arrangement.'
        : 'Your repair request has entered NANOFIX Service Operations for review and arrangement.',
      payload_json: { source: 'customer_portal_unified_service_request', service_request_id: input.serviceRequestId, request_type: input.requestType },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: input.serviceRequestId
    })
    .select('notification_id,channel,recipient_customer_id,subject,delivery_status,related_object_type,related_object_id,created_at')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 20), 1), 50);
  const customer = await activeCustomerForProfile(auth.actor.profileId);
  if (!customer?.customer_id) return jsonError('Active linked customer profile is required.', 403);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id,contact_name,phone,whatsapp,email,address_text,postal_code,issue_type,leak_location,issue_description,preferred_time_text,status,binding_status,priority,request_origin,customer_portal_request_type,related_warranty_id,portal_attachment_urls,portal_customer_notes,created_at,updated_at')
    .eq('customer_id', customer.customer_id)
    .eq('request_origin', 'customer_portal')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'customer_portal_service_requests_read', objectType: 'service_requests', after: { count: data?.length ?? 0 }, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, service_requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const requestType = requestTypeFromBody(body.request_type ?? body.requestType);
  const customer = await activeCustomerForProfile(auth.actor.profileId);
  if (!customer?.customer_id) return jsonError('Active linked customer profile is required before submitting a customer portal request.', 403);

  const name = cleanText(body.contact_name ?? body.name, 120) || (customer.name as string | null) || 'Customer Portal Member';
  const phone = cleanText(body.phone, 40) || (customer.phone as string | null) || '';
  const email = cleanText(body.email, 160) || (customer.email as string | null) || '';
  const address = cleanText(body.address_text ?? body.address, 500);
  const postalCode = cleanText(body.postal_code ?? body.postalCode, 20);
  const leakLocation = cleanText(body.leak_location ?? body.issue_location, 240);
  const issueType = cleanText(body.issue_type ?? body.issueType, 120) ?? (requestType === 'warranty_repair' ? 'Warranty repair request' : 'Customer portal repair request');
  const issueDescription = cleanText(body.issue_description ?? body.message, 2000);
  const preferredAppointmentTime = cleanText(body.preferred_schedule ?? body.preferredAppointmentTime, 160);
  const relatedWarrantyId = cleanText(body.related_warranty_id ?? body.warrantyId, 120);
  const warrantyCode = cleanText(body.warranty_code ?? body.warrantyCode, 160);
  const originalJobReference = cleanText(body.original_job_reference ?? body.originalJobReference, 200);
  const suspectedRecurringIssue = body.suspected_recurring_issue === true || body.suspectedRecurringIssue === true;
  const attachments = attachmentUrls(body.attachment_urls ?? body.attachments);
  const customerNotes = cleanText(body.customer_notes ?? body.notes, 1200);

  if (!phone && !email) return jsonError('phone or email is required.', 400);
  if (!issueDescription) return jsonError('issue_description is required.', 400);
  if (requestType === 'warranty_repair' && !isUuid(relatedWarrantyId)) return jsonError('related_warranty_id is required for warranty repair.', 400);

  let warranty: Record<string, unknown> | null = null;
  if (requestType === 'warranty_repair') {
    warranty = await warrantyBelongsToCustomer(relatedWarrantyId, customer.customer_id as string);
    if (!warranty) return jsonError('Warranty not found or not linked to this customer.', 403);
  }

  const now = new Date().toISOString();
  const issueText = [requestType, issueType, issueDescription, warrantyCode, originalJobReference, customerNotes].filter(Boolean).join(' ');
  const priority = estimatePriority(issueText, requestType);
  const score = urgencyScore(priority);
  const supabase = createAdminClient();
  const sourcePlatform = requestType === 'warranty_repair' ? 'customer_portal_warranty_repair' : 'customer_portal_new_repair';
  const extractedData = {
    request_origin: 'customer_portal',
    customer_portal_request_type: requestType,
    name,
    phone,
    email,
    address,
    postal_code: postalCode,
    issue_type: issueType,
    leak_location: leakLocation,
    related_warranty_id: requestType === 'warranty_repair' ? relatedWarrantyId : null,
    warranty_code: warrantyCode,
    original_job_reference: originalJobReference,
    suspected_recurring_issue: suspectedRecurringIssue,
    preferred_appointment_time: preferredAppointmentTime,
    attachment_urls: attachments,
    customer_notes: customerNotes,
    registration_mode: 'customer_portal',
    linked_customer_id: customer.customer_id
  };

  const { data: intakeRow, error: intakeError } = await supabase
    .from('unified_intake')
    .insert({
      source_platform: sourcePlatform,
      source_type: 'direct',
      source_medium: 'customer_portal_form',
      source: sourcePlatform,
      source_form: 'customer_portal_service_request',
      customer_name: name,
      phone,
      email,
      postal_code: postalCode,
      address_text: address,
      issue_type: issueType,
      message: issueDescription,
      pdpa_consent: true,
      binding_status: 'linked',
      owner_id: auth.actor.profileId,
      raw_message: { text: issueDescription, customer_notes: customerNotes, attachment_urls: attachments },
      extracted_data: extractedData,
      priority,
      urgency_score: score,
      created_at: now
    })
    .select('intake_id')
    .single();
  if (intakeError) return jsonError(`Intake creation failed: ${intakeError.message}`, 500);

  const { data: leadRow, error: leadError } = await supabase
    .from('leads')
    .insert({
      intake_id: intakeRow.intake_id,
      name,
      phone,
      email,
      address,
      address_text: address,
      issue_type: issueType,
      message: issueDescription,
      source_platform: sourcePlatform,
      request_origin: 'customer_portal',
      customer_portal_request_type: requestType,
      related_warranty_id: requestType === 'warranty_repair' ? relatedWarrantyId : null,
      source_type: 'direct',
      source_medium: 'customer_portal_form',
      binding_status: 'linked',
      priority,
      urgency_score: score,
      status: 'new',
      ai_extracted_data: extractedData,
      created_at: now
    })
    .select('lead_id')
    .single();
  if (leadError) return jsonError(`Lead creation failed: ${leadError.message}`, 500);

  const { data: requestRow, error: requestError } = await supabase
    .from('service_requests')
    .insert({
      intake_id: intakeRow.intake_id,
      lead_id: leadRow.lead_id,
      customer_id: customer.customer_id,
      contact_name: name,
      phone,
      whatsapp: phone,
      email,
      address_text: address,
      postal_code: postalCode,
      leak_location: leakLocation || issueType,
      issue_description: issueDescription,
      preferred_time_text: preferredAppointmentTime,
      request_type: requestType,
      issue_type: issueType,
      binding_status: 'linked',
      priority,
      status: requestType === 'warranty_repair' ? 'warranty_review_required' : 'pending_review',
      request_origin: 'customer_portal',
      customer_portal_request_type: requestType,
      related_warranty_id: requestType === 'warranty_repair' ? relatedWarrantyId : null,
      portal_attachment_urls: attachments,
      portal_customer_notes: customerNotes,
      source_platform: sourcePlatform,
      source_type: 'direct',
      source_medium: 'customer_portal_form',
      warranty_id: requestType === 'warranty_repair' ? relatedWarrantyId : null,
      warranty_code: warrantyCode,
      created_at: now
    })
    .select('service_request_id,customer_id,status,priority,binding_status,request_origin,customer_portal_request_type,related_warranty_id,portal_attachment_urls,portal_customer_notes,created_at')
    .single();
  if (requestError) return jsonError(`Service request creation failed: ${requestError.message}`, 500);

  const [workflow, confirmation] = await Promise.all([
    createCustomerPortalTaskAndInbox({
      sourceId: requestRow.service_request_id,
      title: requestType === 'warranty_repair' ? 'Member customer warranty repair submitted' : 'Member customer new repair submitted',
      description: `${name} submitted ${requestType} through Customer Portal. It has entered the unified Service Operations queue. Issue: ${issueType}. ${issueDescription}`,
      priority,
      requestType,
      customerId: customer.customer_id as string,
      leadId: leadRow.lead_id,
      warrantyId: requestType === 'warranty_repair' ? relatedWarrantyId : null
    }),
    queueCustomerConfirmation({ customerId: customer.customer_id as string, serviceRequestId: requestRow.service_request_id, requestType })
  ]);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_service_request_submit_to_unified_queue',
    objectType: 'service_request',
    objectId: requestRow.service_request_id,
    after: { intake_id: intakeRow.intake_id, lead_id: leadRow.lead_id, service_request: requestRow, workflow, confirmation, warranty },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    source: 'customer_portal_linked_unified_queue',
    requestType,
    bindingStatus: 'linked',
    customerId: customer.customer_id,
    intakeId: intakeRow.intake_id,
    leadId: leadRow.lead_id,
    serviceRequestId: requestRow.service_request_id,
    priority,
    workflow,
    confirmation
  }, { status: 201 });
}
