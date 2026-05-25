import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const requestColumns = 'service_request_id,intake_id,lead_id,customer_id,contact_name,phone,whatsapp,email,issue_type,issue_description,leak_location,address_text,property_address,postal_code,property_type,preferred_time_text,binding_status,priority,source_platform,status,created_at,updated_at,admin_approval_required';
const bookingColumns = 'booking_id,service_request_id,customer_id,booking_type,scheduled_at,status,notes,created_at,updated_at';
const inspectionColumns = 'inspection_id,service_request_id,engineer_id,scheduled_at,checklist_json,photo_paths,status,created_at';

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

async function findExistingBooking(supabase: ReturnType<typeof createSupabaseAdminClient>, serviceRequestId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('bookings')
    .select(bookingColumns)
    .eq('service_request_id', serviceRequestId)
    .eq('booking_type', 'site_inspection')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function findExistingInspection(supabase: ReturnType<typeof createSupabaseAdminClient>, serviceRequestId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('inspections')
    .select(inspectionColumns)
    .eq('service_request_id', serviceRequestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function bookingPayloadFromRequest(serviceRequest: Payload, note?: string) {
  return {
    service_request_id: String(serviceRequest.service_request_id),
    customer_id: validUuid(serviceRequest.customer_id) ? String(serviceRequest.customer_id) : null,
    booking_type: 'site_inspection',
    scheduled_at: null,
    status: 'pending',
    notes: cleanText(note) || `Booking created from service request ${serviceRequest.service_request_id}`
  };
}

function inspectionPayloadFromRequest(serviceRequest: Payload) {
  return {
    service_request_id: String(serviceRequest.service_request_id),
    engineer_id: null,
    scheduled_at: null,
    checklist_json: {
      source: 'service_request_progression',
      service_request_id: serviceRequest.service_request_id,
      issue_type: serviceRequest.issue_type,
      priority: serviceRequest.priority,
      address_text: serviceRequest.address_text || serviceRequest.property_address || null,
      created_at: new Date().toISOString()
    },
    photo_paths: [],
    status: 'scheduled'
  };
}

async function loadServiceRequest(supabase: ReturnType<typeof createSupabaseAdminClient>, serviceRequestId: string) {
  if (!supabase) throw new Error('Supabase server client is not configured.');
  const { data, error } = await supabase.from('service_requests').select(requestColumns).eq('service_request_id', serviceRequestId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Service request not found.');
  return data as Payload;
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:operations');
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = cleanText(body.action);
  const serviceRequestId = String(body.service_request_id || '');
  if (!validUuid(serviceRequestId)) return jsonError('A valid service_request_id is required.');

  let serviceRequest: Payload;
  try {
    serviceRequest = await loadServiceRequest(supabase, serviceRequestId);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Service request query failed.', 500);
  }

  if (action === 'create_booking') {
    const existing = await findExistingBooking(supabase, serviceRequestId);
    if (existing) {
      await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_booking_from_service_request', object_type: 'booking', object_id: existing.booking_id, after_data: { service_request_id: serviceRequestId, booking_id: existing.booking_id } });
      return NextResponse.json({ ok: true, booking: existing, existing: true });
    }

    const { data: booking, error: bookingError } = await supabase.from('bookings').insert(bookingPayloadFromRequest(serviceRequest, body.note as string | undefined)).select(bookingColumns).single();
    if (bookingError) {
      if (isUniqueConflict(bookingError)) {
        const concurrentExisting = await findExistingBooking(supabase, serviceRequestId);
        if (concurrentExisting) {
          await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_booking_from_service_request_conflict', object_type: 'booking', object_id: concurrentExisting.booking_id, after_data: { service_request_id: serviceRequestId, booking_id: concurrentExisting.booking_id } });
          return NextResponse.json({ ok: true, booking: concurrentExisting, existing: true, recovered_from_conflict: true });
        }
      }
      return jsonError(bookingError.message, 500);
    }

    const { data: updatedRequest } = await supabase.from('service_requests').update({ status: 'scheduled', updated_at: new Date().toISOString() }).eq('service_request_id', serviceRequestId).select(requestColumns).maybeSingle();
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_booking_from_service_request', object_type: 'booking', object_id: booking.booking_id, before_data: { service_request: serviceRequest }, after_data: { booking, service_request: updatedRequest } });
    return NextResponse.json({ ok: true, booking, service_request: updatedRequest, existing: false });
  }

  if (action === 'create_inspection') {
    const existing = await findExistingInspection(supabase, serviceRequestId);
    if (existing) {
      await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_inspection_from_service_request', object_type: 'inspection', object_id: existing.inspection_id, after_data: { service_request_id: serviceRequestId, inspection_id: existing.inspection_id } });
      return NextResponse.json({ ok: true, inspection: existing, existing: true });
    }

    const { data: inspection, error: inspectionError } = await supabase.from('inspections').insert(inspectionPayloadFromRequest(serviceRequest)).select(inspectionColumns).single();
    if (inspectionError) {
      if (isUniqueConflict(inspectionError)) {
        const concurrentExisting = await findExistingInspection(supabase, serviceRequestId);
        if (concurrentExisting) {
          await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'open_existing_inspection_from_service_request_conflict', object_type: 'inspection', object_id: concurrentExisting.inspection_id, after_data: { service_request_id: serviceRequestId, inspection_id: concurrentExisting.inspection_id } });
          return NextResponse.json({ ok: true, inspection: concurrentExisting, existing: true, recovered_from_conflict: true });
        }
      }
      return jsonError(inspectionError.message, 500);
    }

    const { data: updatedRequest } = await supabase.from('service_requests').update({ status: 'scheduled', updated_at: new Date().toISOString() }).eq('service_request_id', serviceRequestId).select(requestColumns).maybeSingle();
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_inspection_from_service_request', object_type: 'inspection', object_id: inspection.inspection_id, before_data: { service_request: serviceRequest }, after_data: { inspection, service_request: updatedRequest } });
    return NextResponse.json({ ok: true, inspection, service_request: updatedRequest, existing: false });
  }

  return jsonError('Unsupported action.', 400);
}
