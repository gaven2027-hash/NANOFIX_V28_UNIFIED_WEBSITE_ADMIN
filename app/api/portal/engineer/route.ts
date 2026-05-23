export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, ['engineer', 'super_admin', 'operations_admin', 'support']);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data: directJobs, error: directError } = await supabase
    .from('jobs')
    .select('job_id,service_request_id,quotation_id,engineer_id,scheduled_at,status,completion_notes,eta_json,created_at')
    .eq('engineer_id', auth.actor.profileId)
    .order('scheduled_at', { ascending: true })
    .limit(50);

  if (directError) return NextResponse.json({ ok: false, error: directError.message }, { status: 500 });

  const { data: assignments, error: assignmentError } = await supabase
    .from('job_assignments')
    .select('assignment_id,job_id,engineer_id,assignment_reason,created_at')
    .eq('engineer_id', auth.actor.profileId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (assignmentError) return NextResponse.json({ ok: false, error: assignmentError.message }, { status: 500 });

  const jobIds = Array.from(new Set([...(directJobs ?? []).map((item) => item.job_id), ...(assignments ?? []).map((item) => item.job_id)].filter(Boolean)));

  const [checklists, photos, signatures] = jobIds.length > 0 ? await Promise.all([
    supabase.from('job_checklists').select('checklist_id,job_id,engineer_id,checklist_json,required_items_completed,completed_at,created_at').in('job_id', jobIds).order('created_at', { ascending: false }).limit(50),
    supabase.from('job_photos').select('photo_id,job_id,storage_path,photo_type,uploaded_by,created_at').in('job_id', jobIds).order('created_at', { ascending: false }).limit(50),
    supabase.from('customer_signatures').select('signature_id,job_id,customer_id,storage_path,signed_at,created_at').in('job_id', jobIds).order('created_at', { ascending: false }).limit(50)
  ]) : [
    { data: [], error: null },
    { data: [], error: null },
    { data: [], error: null }
  ];

  const firstError = checklists.error ?? photos.error ?? signatures.error;
  if (firstError) return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    jobs: directJobs,
    assignments,
    checklists: checklists.data,
    photos: photos.data,
    signatures: signatures.data,
    data_loop: 'profile_id -> jobs/job_assignments -> checklists/photos/signatures'
  });
}
