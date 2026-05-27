import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const PublicServiceRequestSchema = z.object({
  requestType: z.enum(['new_repair', 'warranty_claim']).default('new_repair'),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  postalCode: z.string().trim().max(12).optional().or(z.literal('')),
  issueType: z.string().trim().max(120).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  warrantyId: z.string().trim().max(80).optional().or(z.literal('')),
  warrantyCode: z.string().trim().max(120).optional().or(z.literal('')),
  originalJobReference: z.string().trim().max(160).optional().or(z.literal('')),
  suspectedRecurringIssue: z.boolean().optional().default(false),
  preferredAppointmentTime: z.string().trim().max(120).optional().or(z.literal('')),
  sourcePlatform: z.string().trim().max(80).optional().default('website_quick_repair'),
  sourceType: z.enum(['organic','paid_ads','direct','referral','unknown']).optional().default('direct'),
  sourceMedium: z.string().trim().max(80).optional().default('public_form'),
  utmSource: z.string().trim().max(120).optional().or(z.literal('')),
  utmMedium: z.string().trim().max(120).optional().or(z.literal('')),
  utmCampaign: z.string().trim().max(180).optional().or(z.literal('')),
  registrationMode: z.enum(['quick_repair', 'registration', 'registration_with_repair', 'customer_portal']).default('quick_repair'),
  customerId: z.string().trim().max(80).optional().or(z.literal(''))
});

function estimatePriority(issue: string, requestType: string) {
  const normalized = issue.toLowerCase();
  if (requestType === 'warranty_claim') return 'P1';
  if (/(urgent|leak|ceiling|burst|flood|complaint|warranty)/i.test(normalized)) return 'P0';
  if (/(same day|inspection|quote|bathroom|toilet|seepage)/i.test(normalized)) return 'P1';
  return 'P2';
}

function validUuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value); }

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());

  const parsed = PublicServiceRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid public service request payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const now = new Date().toISOString();
  const issueText = [data.requestType, data.issueType, data.message, data.warrantyCode, data.originalJobReference].filter(Boolean).join(' ');
  const priority = estimatePriority(issueText, data.requestType);
  const requestSource = data.requestType === 'warranty_claim' ? 'customer_warranty_claim' : data.sourcePlatform;
  const customerId = validUuid(data.customerId) ? data.customerId : null;
  const bindingStatus = customerId ? 'linked' : data.registrationMode === 'registration_with_repair' ? 'linked' : 'pending';

  const intake = {
    source_platform: requestSource,
    source_type: data.sourceType,
    source_medium: data.sourceMedium,
    raw_message: data.message || null,
    extracted_data: {
      request_type: data.requestType,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      postal_code: data.postalCode || null,
      issue_type: data.issueType || null,
      warranty_id: data.warrantyId || null,
      warranty_code: data.warrantyCode || null,
      original_job_reference: data.originalJobReference || null,
      suspected_recurring_issue: data.suspectedRecurringIssue,
      preferred_appointment_time: data.preferredAppointmentTime || null,
      registration_mode: data.registrationMode,
      utm_source: data.utmSource || null,
      utm_medium: data.utmMedium || null,
      utm_campaign: data.utmCampaign || null
    },
    priority,
    urgency_score: priority === 'P0' ? 95 : priority === 'P1' ? 72 : 40,
    created_at: now
  };

  const serviceRequest = {
    customer_id: customerId,
    request_type: data.requestType,
    issue_type: data.issueType || (data.requestType === 'warranty_claim' ? 'Warranty claim' : 'Repair request'),
    address_text: data.address || null,
    postal_code: data.postalCode || null,
    binding_status: bindingStatus,
    priority,
    status: data.requestType === 'warranty_claim' ? 'warranty_review_required' : 'pending_review',
    source_platform: requestSource,
    source_type: data.sourceType,
    source_medium: data.sourceMedium,
    utm_source: data.utmSource || null,
    utm_medium: data.utmMedium || null,
    utm_campaign: data.utmCampaign || null,
    warranty_id: data.warrantyId || null,
    warranty_code: data.warrantyCode || null,
    created_at: now
  };

  const lead = {
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    address: data.address || null,
    source_platform: requestSource,
    source_type: data.sourceType,
    source_medium: data.sourceMedium,
    binding_status: bindingStatus,
    priority,
    urgency_score: intake.urgency_score,
    status: 'new',
    ai_extracted_data: intake.extracted_data,
    created_at: now
  };

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured. Public repair requests must be stored in unified_intake, leads and service_requests.' }, { status: 503 });
  }

  const { data: intakeRow, error: intakeError } = await supabase.from('unified_intake').insert(intake).select('intake_id').single();
  if (intakeError) return NextResponse.json({ ok: false, error: 'Intake creation failed', details: intakeError.message }, { status: 500 });

  const { data: leadRow, error: leadError } = await supabase.from('leads').insert({ ...lead, intake_id: intakeRow?.intake_id || null }).select('lead_id').single();
  if (leadError) return NextResponse.json({ ok: false, error: 'Lead creation failed', details: leadError.message }, { status: 500 });

  const { data: requestRow, error: requestError } = await supabase.from('service_requests').insert({ ...serviceRequest, intake_id: intakeRow?.intake_id || null, lead_id: leadRow?.lead_id || null }).select('service_request_id').single();
  if (requestError) return NextResponse.json({ ok: false, error: 'Service request creation failed', details: requestError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    source: 'supabase',
    requestType: data.requestType,
    bindingStatus,
    intakeId: intakeRow?.intake_id,
    leadId: leadRow?.lead_id,
    serviceRequestId: requestRow?.service_request_id,
    priority
  });
}
