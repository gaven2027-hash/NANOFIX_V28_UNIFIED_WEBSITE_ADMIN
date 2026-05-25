import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const inspectionColumns = 'inspection_id,service_request_id,engineer_id,scheduled_at,checklist_json,photo_paths,status,created_at';
const requestColumns = 'service_request_id,intake_id,lead_id,customer_id,contact_name,phone,whatsapp,email,issue_type,issue_description,leak_location,address_text,property_address,postal_code,property_type,preferred_time_text,binding_status,priority,source_platform,status,created_at,updated_at,admin_approval_required';
const quotationColumns = 'quotation_id,service_request_id,customer_id,version,total_amount,currency,valid_until,status,approved_by,created_at,updated_at';
const versionColumns = 'version_id,quotation_id,version,line_items,total,created_by,approval_log,created_at';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 8000) : fallback;
}

function defaultValidUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function buildDefaultLineItems(inspection: Payload, serviceRequest: Payload) {
  return [
    {
      item: 'Site inspection follow-up proposal',
      description: cleanText(serviceRequest.issue_description) || cleanText(serviceRequest.issue_type, 'Waterproofing / leakage repair scope to be confirmed'),
      quantity: 1,
      unit: 'job',
      unit_price: 0,
      amount: 0,
      source: 'inspection',
      inspection_id: inspection.inspection_id
    }
  ];
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:finance');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = cleanText(body.action);
  const inspectionId = String(body.inspection_id || '');

  if (action !== 'create_quotation') return jsonError('Unsupported action.', 400);
  if (!validUuid(inspectionId)) return jsonError('A valid inspection_id is required.');

  const { data: inspection, error: inspectionError } = await supabase.from('inspections').select(inspectionColumns).eq('inspection_id', inspectionId).maybeSingle();
  if (inspectionError) return jsonError(inspectionError.message, 500);
  if (!inspection) return jsonError('Inspection not found.', 404);

  const serviceRequestId = String(inspection.service_request_id || '');
  if (!validUuid(serviceRequestId)) return jsonError('Inspection is not linked to a valid service request.', 400);

  const { data: serviceRequest, error: requestError } = await supabase.from('service_requests').select(requestColumns).eq('service_request_id', serviceRequestId).maybeSingle();
  if (requestError) return jsonError(requestError.message, 500);
  if (!serviceRequest) return jsonError('Linked service request not found.', 404);

  const { data: existing, error: existingError } = await supabase
    .from('quotations')
    .select(quotationColumns)
    .eq('service_request_id', serviceRequestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return jsonError(existingError.message, 500);
  if (existing) {
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_quotation_from_inspection', object_type: 'quotation', object_id: existing.quotation_id, after_data: { inspection_id: inspectionId, service_request_id: serviceRequestId, quotation_id: existing.quotation_id } });
    return NextResponse.json({ ok: true, quotation: existing, existing: true });
  }

  const quotationPayload = {
    service_request_id: serviceRequestId,
    customer_id: validUuid(serviceRequest.customer_id) ? String(serviceRequest.customer_id) : null,
    version: 1,
    total_amount: 0,
    currency: 'SGD',
    valid_until: defaultValidUntil(),
    status: 'draft',
    approved_by: null
  };

  const { data: quotation, error: quotationError } = await supabase.from('quotations').insert(quotationPayload).select(quotationColumns).single();
  if (quotationError) return jsonError(quotationError.message, 500);

  const lineItems = buildDefaultLineItems(inspection as Payload, serviceRequest as Payload);
  const { data: version, error: versionError } = await supabase.from('quotation_versions').insert({
    quotation_id: quotation.quotation_id,
    version: 1,
    line_items: lineItems,
    total: 0,
    created_by: validUuid(context?.actorId) ? context?.actorId : null,
    approval_log: {
      source: 'inspection_conversion',
      inspection_id: inspectionId,
      service_request_id: serviceRequestId,
      created_at: new Date().toISOString()
    }
  }).select(versionColumns).single();
  if (versionError) return jsonError(versionError.message, 500);

  const now = new Date().toISOString();
  const { data: updatedInspection } = await supabase.from('inspections').update({ status: 'completed' }).eq('inspection_id', inspectionId).select(inspectionColumns).maybeSingle();
  const { data: updatedRequest } = await supabase.from('service_requests').update({ status: 'quoted', updated_at: now }).eq('service_request_id', serviceRequestId).select(requestColumns).maybeSingle();

  await auditLog({
    actor_id: context?.actorId,
    actor_role: context?.role,
    action: 'create_quotation_from_inspection',
    object_type: 'quotation',
    object_id: quotation.quotation_id,
    before_data: { inspection, service_request: serviceRequest },
    after_data: { quotation, quotation_version: version, inspection: updatedInspection, service_request: updatedRequest }
  });

  return NextResponse.json({ ok: true, quotation, quotation_version: version, inspection: updatedInspection, service_request: updatedRequest, existing: false });
}
