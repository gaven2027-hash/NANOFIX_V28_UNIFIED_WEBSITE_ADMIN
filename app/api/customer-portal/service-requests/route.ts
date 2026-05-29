export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;
type ApiPayload = Record<string, unknown>;

function estimatePriority(issue: string, requestType: string) {
  const normalized = issue.toLowerCase();
  if (requestType === 'warranty_claim') return 'P1';
  if (/(urgent|leak|ceiling|burst|flood|complaint|warranty)/i.test(normalized)) return 'P0';
  if (/(same day|inspection|quote|bathroom|toilet|seepage)/i.test(normalized)) return 'P1';
  return 'P2';
}

function urgencyScore(priority: string) {
  if (priority === 'P0') return 95;
  if (priority === 'P1') return 72;
  return 40;
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

async function createCustomerPortalTaskAndInbox(input: { sourceId: string; title: string; description: string; priority: string }) {
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
      metadata_json: { source: 'customer_portal_submit_repair' }
    })
    .select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at')
    .single();
  if (taskError) throw new Error(taskError.message);

  await supabase.from('task_events').insert({ task_id: task.task_id, action: 'customer_portal_repair_request_created', after_json: task }).throwOnError();

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

async function queueCustomerConfirmation(input: { customerId: string; serviceRequestId: string; requestType: string }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('notification_outbox')
    .insert({
      channel: 'internal',
      recipient_customer_id: input.customerId,
      subject: input.requestType === 'warranty_claim' ? 'NANOFIX warranty claim received' : 'NANOFIX repair request received',
      body: input.requestType === 'warranty_claim'
        ? 'Your warranty claim has been received and will be reviewed by NANOFIX.'
        : 'Your repair request has been received and will be reviewed by NANOFIX.',
      payload_json: { source: 'customer_portal_submit_repair', service_request_id: input.serviceRequestId },
      delivery_status: 'queued',
      related_object_type: 'service_request',
      related_object_id: input.serviceRequestId
    })
    .select('notification_id,channel,recipient_customer_id,subject,delivery_status,related_object_type,related_object_id,created_at')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const requestType = cleanText(body.requestType, 40) === 'warranty_claim' ? 'warranty_claim' : 'new_repair';
  const name = cleanText(body.name, 120);
  const phone = cleanText(body.phone, 40);
  const email = cleanText(body.email, 160);
  const address = cleanText(body.address, 500);
  const postalCode = cleanText(body.postalCode, 20);
  const issueType = cleanText(body.issueType, 120) ?? (requestType === 'warranty_claim' ? 'Warranty scope review' : 'Repair request');
  const message = cleanText(body.message, 2000);
  const preferredAppointmentTime = cleanText(body.preferredAppointmentTime, 160);
  const warrantyId = cleanText(body.warrantyId, 120);
  const warrantyCode = cleanText(body.warrantyCode, 160);
  const originalJobReference = cleanText(body.originalJobReference, 200);
  const suspectedRecurringIssue = body.suspectedRecurringIssue === true;

  if (!name) return jsonError('name is required.', 400);
  if (!phone && !email) return jsonError('phone or email is required.', 400);
  if (!message) return jsonError('message is required.', 400);

  const customer = await activeCustomerForProfile(auth.actor.profileId);
  if (!customer?.customer_id) return jsonError('Active linked customer profile is required before submitting a customer portal request.', 403);

  const now = new Date().toISOString();
  const issueText = [requestType, issueType, message, warrantyCode, originalJobReference].filter(Boolean).join(' ');
  const priority = estimatePriority(issueText, requestType);
  const score = urgencyScore(priority);
  const supabase = createAdminClient();
  const sourcePlatform = requestType === 'warranty_claim' ? 'customer_portal_warranty_claim' : 'customer_portal_new_repair';
  const extractedData = {
    request_type: requestType,
    name,
    phone,
    email,
    address,
    postal_code: postalCode,
    issue_type: issueType,
    warranty_id: warrantyId,
    warranty_code: warrantyCode,
    original_job_reference: originalJobReference,
    suspected_recurring_issue: suspectedRecurringIssue,
    preferred_appointment_time: preferredAppointmentTime,
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
      message,
      pdpa_consent: true,
      binding_status: 'linked',
      owner_id: auth.actor.profileId,
      raw_message: { text: message },
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
      message,
      source_platform: sourcePlatform,
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
      leak_location: issueType,
      issue_description: message,
      preferred_time_text: preferredAppointmentTime,
      request_type: requestType,
      issue_type: issueType,
      binding_status: 'linked',
      priority,
      status: requestType === 'warranty_claim' ? 'warranty_review_required' : 'pending_review',
      source_platform: sourcePlatform,
      source_type: 'direct',
      source_medium: 'customer_portal_form',
      warranty_id: warrantyId,
      warranty_code: warrantyCode,
      created_at: now
    })
    .select('service_request_id,customer_id,status,priority,binding_status')
    .single();
  if (requestError) return jsonError(`Service request creation failed: ${requestError.message}`, 500);

  const [workflow, confirmation] = await Promise.all([
    createCustomerPortalTaskAndInbox({
      sourceId: requestRow.service_request_id,
      title: requestType === 'warranty_claim' ? 'Customer warranty claim submitted' : 'Customer repair request submitted',
      description: `${name} submitted ${requestType}. Issue: ${issueType}. ${message}`,
      priority
    }),
    queueCustomerConfirmation({ customerId: customer.customer_id, serviceRequestId: requestRow.service_request_id, requestType })
  ]);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_service_request_submit',
    objectType: 'service_request',
    objectId: requestRow.service_request_id,
    after: { intake_id: intakeRow.intake_id, lead_id: leadRow.lead_id, service_request: requestRow, workflow, confirmation },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    source: 'customer_portal_linked',
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
