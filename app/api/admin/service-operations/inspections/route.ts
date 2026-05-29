export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'support', 'engineer'] as const;
const MANAGER_ROLES = ['super_admin', 'operations_admin', 'support'] as const;

type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanDate(value: unknown) {
  return cleanText(value, 100) || null;
}

function cleanBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false;
}

function uuidOrNull(value: unknown) {
  const text = cleanText(value, 120);
  return isUuid(text) ? text : null;
}

function inspectionPayload(body: ApiPayload, actorId: string) {
  return {
    service_request_id: uuidOrNull(body.service_request_id),
    job_id: uuidOrNull(body.job_id),
    customer_id: uuidOrNull(body.customer_id),
    engineer_id: uuidOrNull(body.engineer_id),
    scheduled_at: cleanDate(body.scheduled_at),
    status: cleanText(body.status, 80) ?? 'scheduled',
    location: cleanText(body.location, 500),
    findings: cleanText(body.findings, 1500),
    diagnosis: cleanText(body.diagnosis, 1500),
    recommended_action: cleanText(body.recommended_action, 1500),
    customer_present: cleanBoolean(body.customer_present),
    signature_required: cleanBoolean(body.signature_required),
    completed_at: cleanDate(body.completed_at),
    created_by: actorId
  };
}

function uploadPayload(body: ApiPayload, actorId: string) {
  return {
    service_request_id: uuidOrNull(body.service_request_id),
    job_id: uuidOrNull(body.job_id),
    inspection_id: uuidOrNull(body.inspection_id),
    uploaded_by: actorId,
    file_name: cleanText(body.file_name, 240),
    file_type: cleanText(body.file_type, 40) ?? 'image',
    storage_path: cleanText(body.storage_path, 500),
    review_status: cleanText(body.review_status, 80) ?? 'pending_review',
    review_notes: cleanText(body.review_notes, 1000)
  };
}

function stripUndefined(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 12), 1), 50);

  const [inspectionsResult, uploadsResult] = await Promise.all([
    supabase
      .from('service_inspections')
      .select('inspection_id,service_request_id,job_id,customer_id,engineer_id,scheduled_at,status,location,findings,diagnosis,recommended_action,customer_present,signature_required,completed_at,created_by,created_at,updated_at')
      .order('scheduled_at', { ascending: false })
      .limit(limit),
    supabase
      .from('service_upload_reviews')
      .select('upload_review_id,service_request_id,job_id,inspection_id,uploaded_by,file_name,file_type,storage_path,review_status,review_notes,reviewed_by,reviewed_at,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)
  ]);

  const errors = [inspectionsResult.error?.message, uploadsResult.error?.message].filter(Boolean) as string[];

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'service_operations_inspection_upload_read',
    objectType: 'service_operations_inspections',
    after: {
      inspections: inspectionsResult.data?.length ?? 0,
      upload_reviews: uploadsResult.data?.length ?? 0,
      degraded: errors.length > 0
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({
    ok: errors.length === 0,
    degraded: errors.length > 0,
    errors,
    inspections: inspectionsResult.data ?? [],
    upload_reviews: uploadsResult.data ?? []
  }, { status: errors.length ? 207 : 200 });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const supabase = createAdminClient();

  if (action === 'schedule_inspection') {
    const payload = stripUndefined(inspectionPayload(body, auth.actor.profileId));
    if (!payload.service_request_id && !payload.job_id) return jsonError('service_request_id or job_id is required.', 400);
    if (!payload.scheduled_at) return jsonError('scheduled_at is required.', 400);

    const { data, error } = await supabase
      .from('service_inspections')
      .insert(payload)
      .select('inspection_id,service_request_id,job_id,customer_id,engineer_id,scheduled_at,status,location,findings,diagnosis,recommended_action,customer_present,signature_required,completed_at,created_by,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_inspection_schedule', objectType: 'service_inspection', objectId: data.inspection_id, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, inspection: data }, { status: 201 });
  }

  if (action === 'submit_inspection_form') {
    const inspectionId = cleanText(body.inspection_id, 120);
    if (!isUuid(inspectionId)) return jsonError('Valid inspection_id is required.', 400);
    const patch = stripUndefined({
      status: cleanText(body.status, 80) ?? 'completed',
      findings: cleanText(body.findings, 1500),
      diagnosis: cleanText(body.diagnosis, 1500),
      recommended_action: cleanText(body.recommended_action, 1500),
      customer_present: cleanBoolean(body.customer_present),
      signature_required: cleanBoolean(body.signature_required),
      completed_at: cleanDate(body.completed_at) ?? new Date().toISOString()
    });

    const { data: before } = await supabase
      .from('service_inspections')
      .select('inspection_id,status,findings,diagnosis,recommended_action,completed_at')
      .eq('inspection_id', inspectionId)
      .maybeSingle();
    const { data, error } = await supabase
      .from('service_inspections')
      .update(patch)
      .eq('inspection_id', inspectionId)
      .select('inspection_id,service_request_id,job_id,customer_id,engineer_id,scheduled_at,status,location,findings,diagnosis,recommended_action,customer_present,signature_required,completed_at,created_by,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_inspection_form_submit', objectType: 'service_inspection', objectId: inspectionId, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, inspection: data });
  }

  if (action === 'assign_engineer') {
    const role = auth.role;
    if (!MANAGER_ROLES.includes(role as typeof MANAGER_ROLES[number])) return jsonError('Only manager roles can assign engineers.', 403);
    const inspectionId = cleanText(body.inspection_id, 120);
    const engineerId = cleanText(body.engineer_id, 120);
    if (!isUuid(inspectionId) || !isUuid(engineerId)) return jsonError('Valid inspection_id and engineer_id are required.', 400);

    const { data, error } = await supabase
      .from('service_inspections')
      .update({ engineer_id: engineerId, status: cleanText(body.status, 80) ?? 'assigned' })
      .eq('inspection_id', inspectionId)
      .select('inspection_id,service_request_id,job_id,engineer_id,scheduled_at,status,location,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_engineer_assign', objectType: 'service_inspection', objectId: inspectionId, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, inspection: data });
  }

  if (action === 'create_upload_review') {
    const payload = stripUndefined(uploadPayload(body, auth.actor.profileId));
    if (!payload.inspection_id && !payload.service_request_id && !payload.job_id) return jsonError('inspection_id, service_request_id or job_id is required.', 400);
    if (!payload.file_name || !payload.storage_path) return jsonError('file_name and storage_path are required.', 400);

    const { data, error } = await supabase
      .from('service_upload_reviews')
      .insert(payload)
      .select('upload_review_id,service_request_id,job_id,inspection_id,uploaded_by,file_name,file_type,storage_path,review_status,review_notes,reviewed_by,reviewed_at,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_upload_review_create', objectType: 'service_upload_review', objectId: data.upload_review_id, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, upload_review: data }, { status: 201 });
  }

  if (action === 'review_upload') {
    const uploadReviewId = cleanText(body.upload_review_id, 120);
    if (!isUuid(uploadReviewId)) return jsonError('Valid upload_review_id is required.', 400);
    const reviewStatus = cleanText(body.review_status, 80) ?? 'approved';
    const patch = {
      review_status: reviewStatus,
      review_notes: cleanText(body.review_notes, 1000),
      reviewed_by: auth.actor.profileId,
      reviewed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('service_upload_reviews')
      .update(patch)
      .eq('upload_review_id', uploadReviewId)
      .select('upload_review_id,service_request_id,job_id,inspection_id,uploaded_by,file_name,file_type,storage_path,review_status,review_notes,reviewed_by,reviewed_at,created_at,updated_at')
      .single();
    if (error) return jsonError(error.message, 400);

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_upload_review_update', objectType: 'service_upload_review', objectId: uploadReviewId, after: data, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, upload_review: data });
  }

  return jsonError('Unsupported inspection/upload action.', 400);
}
