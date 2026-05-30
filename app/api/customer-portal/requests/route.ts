export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;
const REQUEST_TYPES = ['new_repair', 'warranty_repair'] as const;
type RequestType = typeof REQUEST_TYPES[number];
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function requestType(value: unknown): RequestType {
  const text = cleanText(value, 80) as RequestType | null;
  return text && REQUEST_TYPES.includes(text) ? text : 'new_repair';
}

function attachmentUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 700))
    .filter((item): item is string => Boolean(item))
    .slice(0, 12);
}

async function activeCustomerForProfile(profileId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id,name,phone,email,account_status,binding_status,created_at')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Active linked customer profile is required.');
  return data as Record<string, unknown>;
}

async function customerJobIds(customerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('jobs').select('job_id').eq('customer_id', customerId).limit(100);
  if (error) throw new Error(error.message);
  return unique((data ?? []).map((row) => row.job_id as string));
}

async function verifyWarrantyOwner(customerId: string, warrantyId: string | null) {
  if (!warrantyId) return null;
  const supabase = createAdminClient();
  const jobIds = await customerJobIds(customerId);
  if (!jobIds.length) throw new Error('No linked jobs found for this customer warranty request.');
  const { data, error } = await supabase
    .from('warranties')
    .select('warranty_id,job_id,status,created_at')
    .eq('warranty_id', warrantyId)
    .in('job_id', jobIds)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Warranty is not linked to this customer.');
  return data as Record<string, unknown>;
}

async function insertServiceRequest(input: {
  customerId: string;
  portalRequestId: string;
  type: RequestType;
  title: string;
  issueLocation: string | null;
  issueDescription: string;
  preferredSchedule: string | null;
  relatedWarrantyId: string | null;
  relatedJobId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  attachments: string[];
}) {
  const supabase = createAdminClient();
  const payload = {
    customer_id: input.customerId,
    title: input.title,
    issue_location: input.issueLocation,
    issue_description: input.issueDescription,
    preferred_schedule: input.preferredSchedule,
    status: 'new',
    source: 'customer_portal',
    request_channel: 'customer_portal',
    customer_portal_request_id: input.portalRequestId,
    portal_source_type: input.type,
    portal_related_warranty_id: input.relatedWarrantyId,
    customer_attachment_urls: input.attachments,
    customer_feedback_notes: input.issueDescription,
    customer_submission_json: {
      source: 'customer_portal',
      request_type: input.type,
      related_warranty_id: input.relatedWarrantyId,
      related_job_id: input.relatedJobId,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      contact_email: input.contactEmail,
      attachment_urls: input.attachments
    }
  };
  const { data, error } = await supabase
    .from('service_requests')
    .insert(payload)
    .select('service_request_id,customer_id,title,status,source,request_channel,customer_portal_request_id,portal_source_type,portal_related_warranty_id,created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

async function createTaskInbox(input: { serviceRequestId: string; portalRequestId: string; type: RequestType; title: string; description: string }) {
  const supabase = createAdminClient();
  const priority = input.type === 'warranty_repair' ? 'P1' : 'P2';
  const subject = input.type === 'warranty_repair' ? 'Customer submitted warranty repair request' : 'Customer submitted new repair request';
  const { data: task, error: taskError } = await supabase.from('unified_tasks').insert({
    source_module: 'customer_portal',
    source_table: 'service_requests',
    source_id: input.serviceRequestId,
    title: subject,
    description: input.description,
    priority,
    assignee_role: 'operations_admin',
    status: 'open',
    metadata_json: { portal_request_id: input.portalRequestId, service_request_id: input.serviceRequestId, request_type: input.type, unified_service_operations_flow: true }
  }).select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at').single();
  if (taskError) throw new Error(taskError.message);
  await supabase.from('task_events').insert({ task_id: task.task_id, action: 'customer_portal_request_created_service_request', after_json: task }).throwOnError();
  await supabase.from('internal_inbox_messages').insert({
    recipient_role: 'operations_admin',
    subject,
    body: `${input.title}\n\n${input.description}`,
    category: 'customer_portal_request',
    priority,
    related_object_type: 'service_request',
    related_object_id: input.serviceRequestId,
    task_id: task.task_id
  }).throwOnError();
  return task as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;
  const supabase = createAdminClient();
  const customer = await activeCustomerForProfile(auth.actor.profileId);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 20), 1), 50);
  const { data, error } = await supabase
    .from('customer_portal_requests')
    .select('portal_request_id,customer_id,request_type,related_warranty_id,related_job_id,title,issue_location,issue_description,preferred_schedule,attachment_urls,status,created_service_request_id,created_at,updated_at')
    .eq('customer_id', customer.customer_id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'customer_portal_requests_read', objectType: 'customer_portal_requests', after: { count: data?.length ?? 0 }, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as ApiPayload;
  const type = requestType(body.request_type);
  const title = cleanText(body.title, 180) || (type === 'warranty_repair' ? 'Warranty repair request' : 'New repair request');
  const issueLocation = cleanText(body.issue_location, 240);
  const issueDescription = cleanText(body.issue_description, 2000);
  const preferredSchedule = cleanText(body.preferred_schedule, 240);
  const relatedWarrantyId = cleanText(body.related_warranty_id, 120);
  const relatedJobId = cleanText(body.related_job_id, 120);
  const contactName = cleanText(body.contact_name, 160);
  const contactPhone = cleanText(body.contact_phone, 80);
  const contactEmail = cleanText(body.contact_email, 160);
  const attachments = attachmentUrls(body.attachment_urls);

  if (!issueDescription) return jsonError('Issue description is required.', 400);
  if (type === 'warranty_repair' && !isUuid(relatedWarrantyId)) return jsonError('Valid related_warranty_id is required for warranty repair.', 400);
  if (relatedJobId && !isUuid(relatedJobId)) return jsonError('related_job_id must be a valid UUID when provided.', 400);

  const supabase = createAdminClient();
  const customer = await activeCustomerForProfile(auth.actor.profileId);
  const customerId = String(customer.customer_id);
  const warranty = await verifyWarrantyOwner(customerId, type === 'warranty_repair' ? relatedWarrantyId : null);

  const { data: portalRequest, error: portalError } = await supabase
    .from('customer_portal_requests')
    .insert({
      customer_id: customerId,
      submitted_by_profile_id: auth.actor.profileId,
      request_type: type,
      related_warranty_id: type === 'warranty_repair' ? relatedWarrantyId : null,
      related_job_id: relatedJobId || (typeof warranty?.job_id === 'string' ? warranty.job_id : null),
      title,
      issue_location: issueLocation,
      issue_description: issueDescription,
      preferred_schedule: preferredSchedule,
      contact_name: contactName || String(customer.name ?? ''),
      contact_phone: contactPhone || String(customer.phone ?? ''),
      contact_email: contactEmail || String(customer.email ?? ''),
      attachment_urls: attachments,
      status: 'submitted_to_service_operations'
    })
    .select('portal_request_id,customer_id,request_type,related_warranty_id,related_job_id,title,issue_location,issue_description,preferred_schedule,attachment_urls,status,created_at')
    .single();
  if (portalError) return jsonError(portalError.message, 400);

  const serviceRequest = await insertServiceRequest({
    customerId,
    portalRequestId: String(portalRequest.portal_request_id),
    type,
    title,
    issueLocation,
    issueDescription,
    preferredSchedule,
    relatedWarrantyId: type === 'warranty_repair' ? relatedWarrantyId : null,
    relatedJobId: relatedJobId || (typeof warranty?.job_id === 'string' ? warranty.job_id : null),
    contactName,
    contactPhone,
    contactEmail,
    attachments
  });

  await supabase.from('customer_portal_requests').update({ created_service_request_id: serviceRequest.service_request_id }).eq('portal_request_id', portalRequest.portal_request_id).throwOnError();

  const task = await createTaskInbox({
    serviceRequestId: String(serviceRequest.service_request_id),
    portalRequestId: String(portalRequest.portal_request_id),
    type,
    title,
    description: issueDescription
  });

  await supabase.from('notification_outbox').insert({
    channel: 'internal',
    recipient_customer_id: customerId,
    subject: type === 'warranty_repair' ? 'NANOFIX warranty repair request received' : 'NANOFIX repair request received',
    body: 'Your request has entered NANOFIX Service Operations for review and scheduling.',
    payload_json: { portal_request_id: portalRequest.portal_request_id, service_request_id: serviceRequest.service_request_id, request_type: type },
    delivery_status: 'queued',
    related_object_type: 'service_request',
    related_object_id: String(serviceRequest.service_request_id)
  }).throwOnError();

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_request_submit_to_service_operations',
    objectType: 'service_request',
    objectId: String(serviceRequest.service_request_id),
    after: { portal_request: portalRequest, service_request: serviceRequest, task, warranty },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, portal_request: portalRequest, service_request: serviceRequest, task }, { status: 201 });
}
