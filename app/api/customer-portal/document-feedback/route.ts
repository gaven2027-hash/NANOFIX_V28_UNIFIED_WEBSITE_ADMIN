export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;
const DOCUMENT_TYPES = ['quotation', 'invoice', 'warranty', 'payment', 'other'] as const;
const FEEDBACK_TYPES = ['comment', 'change_request', 'dispute', 'clarification'] as const;
type DocumentType = typeof DOCUMENT_TYPES[number];
type FeedbackType = typeof FEEDBACK_TYPES[number];
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function documentType(value: unknown): DocumentType {
  const text = cleanText(value, 80) as DocumentType | null;
  return text && DOCUMENT_TYPES.includes(text) ? text : 'other';
}

function feedbackType(value: unknown): FeedbackType {
  const text = cleanText(value, 80) as FeedbackType | null;
  return text && FEEDBACK_TYPES.includes(text) ? text : 'comment';
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
  const { data: directJobs, error: directJobError } = await supabase.from('jobs').select('job_id').eq('customer_id', customerId).limit(200);
  if (directJobError) throw new Error(directJobError.message);
  return unique((directJobs ?? []).map((row) => row.job_id as string));
}

async function verifyDocumentOwnership(customerId: string, type: DocumentType, documentId: string | null) {
  if (type === 'other' || !documentId) return { ok: true, relatedJobId: null as string | null };
  if (!isUuid(documentId)) throw new Error('document_id must be a valid UUID when provided.');
  const supabase = createAdminClient();
  const jobIds = await customerJobIds(customerId);
  if (!jobIds.length) throw new Error('No linked jobs found for this customer.');

  if (type === 'quotation') {
    const { data, error } = await supabase.from('quotations').select('quotation_id,job_id,visible_to_customer').eq('quotation_id', documentId).in('job_id', jobIds).eq('visible_to_customer', true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Quotation is not linked to this customer or not visible.');
    return { ok: true, relatedJobId: data.job_id as string | null };
  }
  if (type === 'invoice') {
    const { data, error } = await supabase.from('invoices').select('invoice_id,job_id,visible_to_customer').eq('invoice_id', documentId).in('job_id', jobIds).eq('visible_to_customer', true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Invoice is not linked to this customer or not visible.');
    return { ok: true, relatedJobId: data.job_id as string | null };
  }
  if (type === 'warranty') {
    const { data, error } = await supabase.from('warranties').select('warranty_id,job_id').eq('warranty_id', documentId).in('job_id', jobIds).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Warranty is not linked to this customer.');
    return { ok: true, relatedJobId: data.job_id as string | null };
  }
  if (type === 'payment') return { ok: true, relatedJobId: null };
  return { ok: true, relatedJobId: null };
}

async function createTaskInbox(input: { feedbackId: string; type: DocumentType; feedbackType: FeedbackType; message: string; relatedJobId: string | null }) {
  const supabase = createAdminClient();
  const subject = `Customer feedback on ${input.type}`;
  const { data: task, error: taskError } = await supabase.from('unified_tasks').insert({
    source_module: 'customer_portal',
    source_table: 'customer_document_feedback',
    source_id: input.feedbackId,
    title: subject,
    description: input.message,
    priority: input.feedbackType === 'dispute' || input.feedbackType === 'change_request' ? 'P1' : 'P2',
    assignee_role: input.type === 'invoice' || input.type === 'payment' ? 'finance' : 'operations_admin',
    status: 'open',
    metadata_json: { feedback_id: input.feedbackId, document_type: input.type, feedback_type: input.feedbackType, related_job_id: input.relatedJobId, customer_cannot_edit_documents: true }
  }).select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at').single();
  if (taskError) throw new Error(taskError.message);
  await supabase.from('task_events').insert({ task_id: task.task_id, action: 'customer_document_feedback_received', after_json: task }).throwOnError();
  await supabase.from('internal_inbox_messages').insert({
    recipient_role: input.type === 'invoice' || input.type === 'payment' ? 'finance' : 'operations_admin',
    subject,
    body: input.message,
    category: 'customer_document_feedback',
    priority: input.feedbackType === 'dispute' || input.feedbackType === 'change_request' ? 'P1' : 'P2',
    related_object_type: 'customer_document_feedback',
    related_object_id: input.feedbackId,
    task_id: task.task_id
  }).throwOnError();
  return task as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;
  const customer = await activeCustomerForProfile(auth.actor.profileId);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 20), 1), 50);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_document_feedback')
    .select('feedback_id,customer_id,document_type,document_id,related_job_id,feedback_type,message,status,internal_response,reviewed_at,created_at')
    .eq('customer_id', customer.customer_id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'customer_portal_document_feedback_read', objectType: 'customer_document_feedback', after: { count: data?.length ?? 0 }, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, feedback: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as ApiPayload;
  const type = documentType(body.document_type);
  const kind = feedbackType(body.feedback_type);
  const documentId = cleanText(body.document_id, 120);
  const message = cleanText(body.message, 2000);
  if (!message) return jsonError('Feedback message is required.', 400);

  const customer = await activeCustomerForProfile(auth.actor.profileId);
  const customerId = String(customer.customer_id);
  const verified = await verifyDocumentOwnership(customerId, type, documentId);
  const supabase = createAdminClient();

  const { data: feedback, error } = await supabase.from('customer_document_feedback').insert({
    customer_id: customerId,
    submitted_by_profile_id: auth.actor.profileId,
    document_type: type,
    document_id: documentId || null,
    related_job_id: verified.relatedJobId,
    feedback_type: kind,
    message,
    status: 'submitted'
  }).select('feedback_id,customer_id,document_type,document_id,related_job_id,feedback_type,message,status,created_at').single();
  if (error) return jsonError(error.message, 400);

  const task = await createTaskInbox({ feedbackId: String(feedback.feedback_id), type, feedbackType: kind, message, relatedJobId: verified.relatedJobId });
  await supabase.from('notification_outbox').insert({
    channel: 'internal',
    recipient_customer_id: customerId,
    subject: 'NANOFIX feedback received',
    body: 'Your feedback has been received. NANOFIX will review it and update documents from the admin system if needed.',
    payload_json: { feedback_id: feedback.feedback_id, document_type: type, document_id: documentId, source: 'customer_document_feedback' },
    delivery_status: 'queued',
    related_object_type: 'customer_document_feedback',
    related_object_id: String(feedback.feedback_id)
  }).throwOnError();

  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'customer_portal_document_feedback_submit', objectType: 'customer_document_feedback', objectId: String(feedback.feedback_id), after: { feedback, task, customer_cannot_edit_documents: true }, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, feedback, task }, { status: 201 });
}
