export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const STATUS_VALUES = ['reviewing', 'resolved', 'rejected', 'superseded'] as const;
type StatusValue = typeof STATUS_VALUES[number];
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanStatus(value: unknown): StatusValue {
  const text = cleanText(value, 80) as StatusValue | null;
  return text && STATUS_VALUES.includes(text) ? text : 'reviewing';
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;
  const supabase = createAdminClient();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 40), 1), 100);
  const status = cleanText(request.nextUrl.searchParams.get('status'), 80);
  const query = supabase
    .from('customer_document_feedback')
    .select('feedback_id,customer_id,submitted_by_profile_id,document_type,document_id,related_job_id,feedback_type,message,status,internal_response,reviewed_by,reviewed_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) query.eq('status', status);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_customer_document_feedback_read', objectType: 'customer_document_feedback', after: { count: data?.length ?? 0, status: status ?? 'all' }, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, feedback: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const feedbackId = cleanText(body.feedback_id, 120);
  if (action !== 'review_customer_document_feedback') return jsonError('Unsupported document feedback action.', 400);
  if (!isUuid(feedbackId)) return jsonError('Valid feedback_id is required.', 400);

  const status = cleanStatus(body.status);
  const internalResponse = cleanText(body.internal_response, 1600);
  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from('customer_document_feedback')
    .select('feedback_id,customer_id,document_type,document_id,related_job_id,feedback_type,message,status,internal_response,reviewed_by,reviewed_at,created_at')
    .eq('feedback_id', feedbackId)
    .maybeSingle();
  if (!before) return jsonError('Customer document feedback not found.', 404);

  const { data, error } = await supabase
    .from('customer_document_feedback')
    .update({ status, internal_response: internalResponse, reviewed_by: auth.actor.profileId, reviewed_at: new Date().toISOString() })
    .eq('feedback_id', feedbackId)
    .select('feedback_id,customer_id,document_type,document_id,related_job_id,feedback_type,message,status,internal_response,reviewed_by,reviewed_at,created_at')
    .single();
  if (error) return jsonError(error.message, 400);

  await supabase.from('unified_tasks').insert({
    source_module: 'service_operations',
    source_table: 'customer_document_feedback',
    source_id: feedbackId,
    title: 'Customer document feedback reviewed',
    description: `Document feedback ${feedbackId} reviewed as ${status}. If document changes are needed, regenerate and re-push from the relevant admin template module.`,
    priority: status === 'rejected' ? 'P2' : 'P1',
    assignee_role: data.document_type === 'invoice' || data.document_type === 'payment' ? 'finance' : 'operations_admin',
    status: 'open',
    metadata_json: { feedback_id: feedbackId, document_type: data.document_type, document_id: data.document_id, admin_can_repush_document: true, customer_cannot_edit_documents: true }
  }).throwOnError();

  if (data.customer_id) {
    await supabase.from('notification_outbox').insert({
      channel: 'internal',
      recipient_customer_id: data.customer_id,
      subject: 'NANOFIX document feedback reviewed',
      body: internalResponse || 'Your feedback has been reviewed. NANOFIX will update and re-push documents if needed.',
      payload_json: { feedback_id: feedbackId, document_type: data.document_type, document_id: data.document_id, status, source: 'customer_document_feedback_review' },
      delivery_status: 'queued',
      related_object_type: 'customer_document_feedback',
      related_object_id: feedbackId
    }).throwOnError();
  }

  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_customer_document_feedback_review', objectType: 'customer_document_feedback', objectId: feedbackId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, feedback: data });
}
