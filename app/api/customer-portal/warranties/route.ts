export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const CUSTOMER_ROLES = ['customer'] as const;

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function customerIdsForProfile(profileId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('profile_id', profileId)
    .eq('account_status', 'active')
    .limit(20);
  if (error) throw new Error(error.message);
  return unique((data ?? []).map((row) => row.customer_id as string));
}

async function visibleWarrantyPdfs(customerIds: string[], warrantyIds: string[]) {
  const supabase = createAdminClient();
  if (!customerIds.length || !warrantyIds.length) return [];
  const { data, error } = await supabase
    .from('warranty_pdf_documents')
    .select('warranty_pdf_id,warranty_id,customer_id,job_id,warranty_version,storage_bucket,storage_path,file_name,mime_type,file_size_bytes,public_ref,generation_status,visible_to_customer,customer_visible_at,created_at')
    .in('customer_id', customerIds)
    .in('warranty_id', warrantyIds)
    .eq('visible_to_customer', true)
    .in('generation_status', ['generated', 'uploaded'])
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...CUSTOMER_ROLES]);
  if (!auth.ok) return auth.response;
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 50), 1), 100);
  try {
    const customerIds = await customerIdsForProfile(auth.actor.profileId);
    if (!customerIds.length) return jsonError('Active linked customer profile is required.', 403);
    const supabase = createAdminClient();
    const { data: warranties, error } = await supabase
      .from('warranties')
      .select('warranty_id,job_id,customer_id,status,coverage,starts_at,ends_at,warranty_years,source_quotation_id,source_acceptance_id,source_invoice_id,auto_generated,generation_source,generated_at,terms_snapshot,pdf_storage_path,visible_to_customer,customer_visible_at,customer_visibility_notes,created_at')
      .in('customer_id', customerIds)
      .eq('visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return jsonError(error.message, 500);
    const warrantyIds = unique((warranties ?? []).map((row) => row.warranty_id as string));
    const pdfs = await visibleWarrantyPdfs(customerIds, warrantyIds);
    await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'customer_portal_warranties_read', objectType: 'warranties', after: { warranty_count: warranties?.length ?? 0, pdf_count: pdfs.length }, ip: getClientIp(request) }).catch(() => undefined);
    return NextResponse.json({ ok: true, warranties: warranties ?? [], warranty_pdfs: pdfs });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
