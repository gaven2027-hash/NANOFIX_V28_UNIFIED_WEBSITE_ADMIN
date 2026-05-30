export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance'] as const;
type ApiPayload = Record<string, unknown>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function cleanNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanBoolean(value: unknown) {
  return value === true || value === 'true';
}

async function loadWarranty(warrantyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('warranties')
    .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,terms_snapshot,pdf_storage_path,visible_to_customer,created_at')
    .eq('warranty_id', warrantyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function nextWarrantyVersion(warrantyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('warranty_pdf_documents')
    .select('warranty_version')
    .eq('warranty_id', warrantyId)
    .order('warranty_version', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return Number(data?.[0]?.warranty_version ?? 0) + 1;
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;
  const warrantyId = cleanText(request.nextUrl.searchParams.get('warranty_id'), 120);
  if (!isUuid(warrantyId)) return jsonError('Valid warranty_id is required.', 400);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('warranty_pdf_documents')
    .select('warranty_pdf_id,warranty_id,customer_id,job_id,warranty_version,storage_bucket,storage_path,file_name,mime_type,file_size_bytes,checksum_sha256,public_ref,generation_status,visible_to_customer,customer_visible_at,customer_visible_by,generated_by,generated_at,generation_notes,metadata_json,created_at,updated_at')
    .eq('warranty_id', warrantyId)
    .order('warranty_version', { ascending: false })
    .limit(30);
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_warranty_pdf_read', objectType: 'warranty', objectId: warrantyId, after: { count: data?.length ?? 0 }, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, warranty_id: warrantyId, warranty_pdfs: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  const warrantyId = cleanText(body.warranty_id, 120);
  if (!isUuid(warrantyId)) return jsonError('Valid warranty_id is required.', 400);
  const supabase = createAdminClient();

  if (action === 'generate_warranty_pdf' || action === 'regenerate_warranty_pdf') {
    const warranty = await loadWarranty(warrantyId);
    if (!warranty) return jsonError('Warranty not found.', 404);
    const version = await nextWarrantyVersion(warrantyId);
    const storageBucket = cleanText(body.storage_bucket, 160) || 'service-uploads';
    const defaultFileName = `NANOFIX-Warranty-${warrantyId}-v${version}.pdf`;
    const fileName = cleanText(body.file_name, 240) || defaultFileName;
    const storagePath = cleanText(body.storage_path, 700) || `warranties/${warranty.customer_id ?? 'unlinked'}/${warrantyId}/v${version}/${fileName}`;
    const visible = cleanBoolean(body.visible_to_customer);
    const publicRef = cleanText(body.public_ref, 160) || `NF-WTY-${String(warrantyId).slice(0, 8).toUpperCase()}-V${version}`;

    if (version > 1) {
      await supabase.from('warranty_pdf_documents').update({ generation_status: 'superseded', visible_to_customer: false }).eq('warranty_id', warrantyId).neq('generation_status', 'revoked');
    }

    const { data: pdf, error: pdfError } = await supabase
      .from('warranty_pdf_documents')
      .insert({
        warranty_id: warrantyId,
        customer_id: warranty.customer_id,
        job_id: warranty.job_id,
        warranty_version: version,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: 'application/pdf',
        file_size_bytes: cleanNumber(body.file_size_bytes, 0),
        checksum_sha256: cleanText(body.checksum_sha256, 120),
        public_ref: publicRef,
        generation_status: 'generated',
        visible_to_customer: visible,
        customer_visible_at: visible ? new Date().toISOString() : null,
        customer_visible_by: visible ? auth.actor.profileId : null,
        generated_by: auth.actor.profileId,
        generated_at: new Date().toISOString(),
        generation_notes: cleanText(body.generation_notes, 1200),
        metadata_json: { source: action, warranty, generated_from_template: true }
      })
      .select('warranty_pdf_id,warranty_id,customer_id,job_id,warranty_version,storage_bucket,storage_path,file_name,mime_type,file_size_bytes,checksum_sha256,public_ref,generation_status,visible_to_customer,customer_visible_at,generated_by,generated_at,generation_notes,metadata_json,created_at')
      .single();
    if (pdfError) return jsonError(pdfError.message, 400);

    const { data: updatedWarranty, error: warrantyError } = await supabase
      .from('warranties')
      .update({ pdf_storage_path: storagePath, visible_to_customer: visible, customer_visible_at: visible ? new Date().toISOString() : null, customer_visible_by: visible ? auth.actor.profileId : null, customer_visibility_notes: cleanText(body.customer_visibility_notes, 1000) || 'Warranty PDF generated from admin template.' })
      .eq('warranty_id', warrantyId)
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,pdf_storage_path,visible_to_customer,customer_visible_at,customer_visible_by,customer_visibility_notes,created_at')
      .single();
    if (warrantyError) return jsonError(warrantyError.message, 400);

    const { data: task } = await supabase.from('unified_tasks').insert({
      source_module: 'service_operations',
      source_table: 'warranty_pdf_documents',
      source_id: pdf.warranty_pdf_id,
      title: visible ? 'Warranty PDF generated and pushed to customer' : 'Warranty PDF generated for review',
      description: `Warranty PDF ${pdf.public_ref} generated for warranty ${warrantyId}.`,
      priority: 'P2',
      assignee_role: 'operations_admin',
      status: 'open',
      metadata_json: { warranty_id: warrantyId, warranty_pdf_id: pdf.warranty_pdf_id, visible_to_customer: visible }
    }).select('task_id,source_module,source_table,source_id,title,status,priority,assignee_role,created_at').maybeSingle();

    if (task?.task_id) {
      await supabase.from('task_events').insert({ task_id: task.task_id, action: 'warranty_pdf_generated', after_json: { warranty: updatedWarranty, pdf } }).throwOnError();
      await supabase.from('internal_inbox_messages').insert({
        recipient_role: 'operations_admin',
        subject: visible ? 'Warranty PDF pushed to customer' : 'Warranty PDF ready for review',
        body: `Warranty PDF ${pdf.public_ref} is ${visible ? 'visible to customer' : 'not yet visible to customer'}.`,
        category: 'warranty_pdf',
        priority: 'P2',
        related_object_type: 'warranty_pdf_document',
        related_object_id: pdf.warranty_pdf_id,
        task_id: task.task_id
      }).throwOnError();
    }

    if (visible && warranty.customer_id) {
      await supabase.from('notification_outbox').insert({
        channel: 'internal',
        recipient_customer_id: warranty.customer_id,
        subject: 'NANOFIX warranty certificate is ready',
        body: 'Your NANOFIX warranty certificate is ready in Customer Portal.',
        payload_json: { warranty_id: warrantyId, warranty_pdf_id: pdf.warranty_pdf_id, source: 'warranty_pdf_generated' },
        delivery_status: 'queued',
        related_object_type: 'warranty_pdf_document',
        related_object_id: pdf.warranty_pdf_id
      }).throwOnError();
    }

    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: `service_operations_${action}`, objectType: 'warranty_pdf_document', objectId: pdf.warranty_pdf_id, before: warranty, after: { warranty: updatedWarranty, pdf, task }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, warranty: updatedWarranty, warranty_pdf: pdf, task }, { status: 201 });
  }

  if (action === 'set_warranty_pdf_customer_visibility') {
    const warrantyPdfId = cleanText(body.warranty_pdf_id, 120);
    if (!isUuid(warrantyPdfId)) return jsonError('Valid warranty_pdf_id is required.', 400);
    const visible = cleanBoolean(body.visible_to_customer);
    const { data: before } = await supabase.from('warranty_pdf_documents').select('warranty_pdf_id,warranty_id,customer_id,visible_to_customer,storage_path,public_ref,created_at').eq('warranty_pdf_id', warrantyPdfId).maybeSingle();
    const { data: pdf, error } = await supabase
      .from('warranty_pdf_documents')
      .update({ visible_to_customer: visible, customer_visible_at: visible ? new Date().toISOString() : null, customer_visible_by: visible ? auth.actor.profileId : null })
      .eq('warranty_pdf_id', warrantyPdfId)
      .select('warranty_pdf_id,warranty_id,customer_id,job_id,warranty_version,storage_bucket,storage_path,file_name,public_ref,generation_status,visible_to_customer,customer_visible_at,customer_visible_by,created_at')
      .single();
    if (error) return jsonError(error.message, 400);
    await supabase.from('warranties').update({ visible_to_customer: visible, customer_visible_at: visible ? new Date().toISOString() : null, customer_visible_by: visible ? auth.actor.profileId : null, pdf_storage_path: pdf.storage_path }).eq('warranty_id', warrantyId).throwOnError();
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_warranty_pdf_customer_visibility_set', objectType: 'warranty_pdf_document', objectId: warrantyPdfId, before, after: pdf, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, action, warranty_pdf: pdf });
  }

  return jsonError('Unsupported warranty PDF action.', 400);
}
