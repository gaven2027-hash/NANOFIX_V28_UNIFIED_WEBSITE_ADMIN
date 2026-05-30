export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'] as const;
const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance'] as const;
type ApiPayload = Record<string, unknown>;

function patchFromBody(body: ApiPayload, profileId: string) {
  return {
    company_name: cleanText(body.company_name, 160) || 'NANOFIX',
    company_tagline: cleanText(body.company_tagline, 220),
    uen: cleanText(body.uen, 80),
    gst_registration_no: cleanText(body.gst_registration_no, 80),
    address_line_1: cleanText(body.address_line_1, 240),
    address_line_2: cleanText(body.address_line_2, 240),
    phone: cleanText(body.phone, 80),
    whatsapp: cleanText(body.whatsapp, 80),
    email: cleanText(body.email, 160),
    website: cleanText(body.website, 240),
    logo_storage_path: cleanText(body.logo_storage_path, 500),
    invoice_prefix: cleanText(body.invoice_prefix, 40) || 'NFX-INV',
    quotation_prefix: cleanText(body.quotation_prefix, 40) || 'NFX-QUO',
    payment_instructions: cleanText(body.payment_instructions, 1000),
    warranty_footer: cleanText(body.warranty_footer, 1000),
    terms_footer: cleanText(body.terms_footer, 1000),
    primary_color: cleanText(body.primary_color, 40) || '#FF5F00',
    secondary_color: cleanText(body.secondary_color, 40) || '#1E293B',
    is_active: body.is_active !== false,
    updated_by: profileId
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('document_company_settings')
    .select('setting_id,setting_key,company_name,company_tagline,uen,gst_registration_no,address_line_1,address_line_2,phone,whatsapp,email,website,logo_storage_path,invoice_prefix,quotation_prefix,payment_instructions,warranty_footer,terms_footer,primary_color,secondary_color,is_active,updated_by,created_at,updated_at')
    .eq('setting_key', 'nanofix_default')
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_document_settings_read', objectType: 'document_company_settings', objectId: data?.setting_id, after: { found: Boolean(data) }, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, settings: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as ApiPayload;
  const action = cleanText(body.action, 100);
  if (action !== 'save_document_company_settings') return jsonError('Unsupported document settings action.', 400);
  const supabase = createAdminClient();
  const patch = patchFromBody(body, auth.actor.profileId);
  const { data: before } = await supabase
    .from('document_company_settings')
    .select('setting_id,setting_key,company_name,company_tagline,uen,gst_registration_no,address_line_1,address_line_2,phone,whatsapp,email,website,logo_storage_path,invoice_prefix,quotation_prefix,payment_instructions,warranty_footer,terms_footer,primary_color,secondary_color,is_active,updated_at')
    .eq('setting_key', 'nanofix_default')
    .maybeSingle();

  const { data, error } = await supabase
    .from('document_company_settings')
    .upsert({ setting_key: 'nanofix_default', ...patch }, { onConflict: 'setting_key' })
    .select('setting_id,setting_key,company_name,company_tagline,uen,gst_registration_no,address_line_1,address_line_2,phone,whatsapp,email,website,logo_storage_path,invoice_prefix,quotation_prefix,payment_instructions,warranty_footer,terms_footer,primary_color,secondary_color,is_active,updated_by,created_at,updated_at')
    .single();
  if (error) return jsonError(error.message, 400);

  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'service_operations_document_settings_save', objectType: 'document_company_settings', objectId: data.setting_id, before, after: data, ip: getClientIp(request) }).catch(() => undefined);
  return NextResponse.json({ ok: true, settings: data });
}
