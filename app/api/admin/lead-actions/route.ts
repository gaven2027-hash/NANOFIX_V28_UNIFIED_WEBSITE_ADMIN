import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const leadColumns = 'lead_id,intake_id,customer_id,name,phone,email,address,address_text,issue_type,message,source_platform,ai_extracted_data,binding_status,priority,urgency_score,status,owner_id,created_at,updated_at';
const requestColumns = 'service_request_id,intake_id,lead_id,customer_id,contact_name,phone,whatsapp,email,issue_type,issue_description,leak_location,address_text,property_address,postal_code,property_type,preferred_time_text,binding_status,priority,source_platform,status,created_at,updated_at,admin_approval_required';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 8000) : fallback;
}

function isUniqueConflict(error: { code?: string; message?: string } | null) {
  return error?.code === '23505' || /duplicate key|unique/i.test(error?.message || '');
}

async function findExistingServiceRequest(supabase: ReturnType<typeof createSupabaseAdminClient>, leadId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('service_requests')
    .select(requestColumns)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function asObject(value: unknown): Payload {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Payload;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Payload;
    } catch {
      return {};
    }
  }
  return {};
}

function serviceRequestFromLead(lead: Payload, actorId?: string) {
  const meta = asObject(lead.ai_extracted_data);
  const address = cleanText(lead.address_text) || cleanText(lead.address);
  const issueType = cleanText(lead.issue_type) || 'Leakage / Repair Request';
  return {
    intake_id: validUuid(lead.intake_id) ? String(lead.intake_id) : null,
    lead_id: String(lead.lead_id),
    customer_id: validUuid(lead.customer_id) ? String(lead.customer_id) : null,
    contact_name: cleanText(lead.name, 'Customer'),
    phone: cleanText(lead.phone) || null,
    whatsapp: cleanText(lead.phone) || null,
    email: cleanText(lead.email) || null,
    issue_type: issueType,
    issue_description: cleanText(lead.message) || `Created from lead ${lead.lead_id}`,
    address_text: address || null,
    property_address: address || null,
    binding_status: cleanText(lead.binding_status, validUuid(lead.customer_id) ? 'linked' : 'pending'),
    priority: cleanText(lead.priority, 'P2'),
    source_platform: cleanText(lead.source_platform, 'lead'),
    status: 'pending_review',
    admin_approval_required: true,
    address_json: {
      source: 'lead_conversion',
      lead_id: lead.lead_id,
      source_message_id: meta.message_id || meta.source_message_id || null,
      source_channel: meta.channel || lead.source_platform || null,
      converted_by: actorId || null,
      converted_at: new Date().toISOString()
    }
  };
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:operations');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = cleanText(body.action);
  const leadId = String(body.lead_id || '');
  if (action !== 'create_service_request') return jsonError('Unsupported action.', 400);
  if (!validUuid(leadId)) return jsonError('A valid lead_id is required.');

  const { data: lead, error: leadError } = await supabase.from('leads').select(leadColumns).eq('lead_id', leadId).maybeSingle();
  if (leadError) return jsonError(leadError.message, 500);
  if (!lead) return jsonError('Lead not found.', 404);

  const existing = await findExistingServiceRequest(supabase, leadId);
  if (existing) {
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_service_request_from_lead', object_type: 'service_request', object_id: existing.service_request_id, after_data: { lead_id: leadId, service_request_id: existing.service_request_id } });
    return NextResponse.json({ ok: true, service_request: existing, existing: true });
  }

  const payload = serviceRequestFromLead(lead as Payload, context?.actorId);
  const { data: serviceRequest, error: createError } = await supabase.from('service_requests').insert(payload).select(requestColumns).single();
  if (createError) {
    if (isUniqueConflict(createError)) {
      const concurrentExisting = await findExistingServiceRequest(supabase, leadId);
      if (concurrentExisting) {
        await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_service_request_from_lead_conflict', object_type: 'service_request', object_id: concurrentExisting.service_request_id, after_data: { lead_id: leadId, service_request_id: concurrentExisting.service_request_id } });
        return NextResponse.json({ ok: true, service_request: concurrentExisting, existing: true, recovered_from_conflict: true });
      }
    }
    return jsonError(createError.message, 500);
  }

  const { data: updatedLead } = await supabase
    .from('leads')
    .update({ status: 'converted', updated_at: new Date().toISOString() })
    .eq('lead_id', leadId)
    .select(leadColumns)
    .maybeSingle();

  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_service_request_from_lead', object_type: 'service_request', object_id: serviceRequest.service_request_id, before_data: { lead }, after_data: { service_request: serviceRequest, lead: updatedLead } });

  return NextResponse.json({ ok: true, service_request: serviceRequest, lead: updatedLead, existing: false });
}
