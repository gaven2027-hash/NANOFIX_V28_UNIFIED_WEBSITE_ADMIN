export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_ROLES = ['customer'] as const;
type DocumentType = 'quotation' | 'invoice' | 'warranty';
type Row = Record<string, unknown>;
type AdminClient = ReturnType<typeof createAdminClient>;

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function isDocumentType(value: string | null): value is DocumentType {
  return value === 'quotation' || value === 'invoice' || value === 'warranty';
}

function idOf(row: Row | null | undefined, key: string) {
  const value = row?.[key];
  return typeof value === 'string' && value ? value : null;
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

async function serviceRequestCustomerId(supabase: AdminClient, serviceRequestId: string | null) {
  if (!serviceRequestId) return null;
  const { data, error } = await supabase
    .from('service_requests')
    .select('service_request_id,customer_id')
    .eq('service_request_id', serviceRequestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return idOf(data as Row | null, 'customer_id');
}

async function jobCustomerId(supabase: AdminClient, jobId: string | null) {
  if (!jobId) return null;
  const { data, error } = await supabase
    .from('jobs')
    .select('job_id,service_request_id,customer_id')
    .eq('job_id', jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const job = data as Row | null;
  return idOf(job, 'customer_id') ?? await serviceRequestCustomerId(supabase, idOf(job, 'service_request_id'));
}

async function ownsDocument(supabase: AdminClient, documentType: DocumentType, row: Row, customerIds: Set<string>) {
  if (documentType === 'quotation') {
    const requestCustomerId = await serviceRequestCustomerId(supabase, idOf(row, 'service_request_id'));
    if (requestCustomerId && customerIds.has(requestCustomerId)) return true;
    const owner = await jobCustomerId(supabase, idOf(row, 'job_id'));
    return Boolean(owner && customerIds.has(owner));
  }

  if (documentType === 'invoice') {
    const owner = await jobCustomerId(supabase, idOf(row, 'job_id'));
    return Boolean(owner && customerIds.has(owner));
  }

  const directCustomerId = idOf(row, 'customer_id');
  if (directCustomerId && customerIds.has(directCustomerId)) return true;
  const owner = await jobCustomerId(supabase, idOf(row, 'job_id'));
  return Boolean(owner && customerIds.has(owner));
}

function parseStoragePath(rawPath: string) {
  const normalized = rawPath.trim().replace(/^supabase:\/\//, '').replace(/^storage:\/\//, '').replace(/^\/+/, '');
  if (!normalized || /^https?:\/\//i.test(normalized)) return null;
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return { bucket: parts[0], objectPath: parts.slice(1).join('/') };
}

async function loadRecord(supabase: AdminClient, documentType: DocumentType, documentId: string) {
  if (documentType === 'quotation') {
    const { data, error } = await supabase
      .from('quotations')
      .select('quotation_id,job_id,service_request_id,visible_to_customer,pdf_storage_path,public_ref,created_at')
      .eq('quotation_id', documentId)
      .eq('visible_to_customer', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as Row | null;
  }

  if (documentType === 'invoice') {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_id,invoice_no,job_id,visible_to_customer,pdf_storage_path,payment_url,public_ref,created_at')
      .eq('invoice_id', documentId)
      .eq('visible_to_customer', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as Row | null;
  }

  const { data, error } = await supabase
    .from('warranties')
    .select('warranty_id,job_id,customer_id,visible_to_customer,pdf_storage_path,public_ref,created_at')
    .eq('warranty_id', documentId)
    .eq('visible_to_customer', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Row | null;
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...ALLOWED_ROLES]);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Row;
  const documentType = cleanText(body.document_type, 80);
  const documentId = cleanText(body.document_id, 120);

  if (!isDocumentType(documentType)) return jsonError('document_type must be quotation, invoice or warranty.', 400);
  if (!documentId || !isUuid(documentId)) return jsonError('Valid document_id is required.', 400);

  const supabase = createAdminClient();
  const customerIds = await customerIdsForProfile(supabase, auth.actor.profileId);
  if (!customerIds.size) return jsonError('No active customer profile is linked to this account.', 403);

  const record = await loadRecord(supabase, documentType, documentId);
  if (!record) return jsonError('Document not found or not visible to this customer.', 404);

  const allowed = await ownsDocument(supabase, documentType, record, customerIds);
  if (!allowed) return jsonError('Document is not linked to your customer profile.', 404);

  const pdfStoragePath = idOf(record, 'pdf_storage_path');
  if (!pdfStoragePath) return jsonError('PDF is not available yet.', 404);

  const parsed = parseStoragePath(pdfStoragePath);
  if (!parsed) return jsonError('PDF storage path is not in signed-download format.', 409);

  const { data: signed, error: signError } = await supabase
    .storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.objectPath, 300);

  if (signError || !signed?.signedUrl) return jsonError(signError?.message ?? 'Unable to create signed document URL.', 500);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'customer_portal_document_download_link_create',
    objectType: documentType,
    objectId: documentId,
    after: { document_type: documentType, document_id: documentId, bucket: parsed.bucket, expires_in_seconds: 300 },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, document_type: documentType, document_id: documentId, url: signed.signedUrl, expires_in_seconds: 300 });
}
