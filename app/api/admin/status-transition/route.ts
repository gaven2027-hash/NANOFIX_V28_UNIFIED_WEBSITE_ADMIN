export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, cleanText, getClientIp } from '@/lib/apiSecurity';
import { assertTransition, type StatusMachineName } from '@/lib/statusMachine';
import { createAdminClient } from '@/lib/supabase/admin';

type StatusConfig = {
  table: string;
  idColumn: string;
  statusColumn: string;
};

const statusConfig: Record<StatusMachineName, StatusConfig> = {
  lead: { table: 'leads', idColumn: 'lead_id', statusColumn: 'status' },
  service_request: { table: 'service_requests', idColumn: 'service_request_id', statusColumn: 'status' },
  inspection: { table: 'inspections', idColumn: 'inspection_id', statusColumn: 'status' },
  quotation: { table: 'quotations', idColumn: 'quotation_id', statusColumn: 'approval_status' },
  job: { table: 'jobs', idColumn: 'job_id', statusColumn: 'status' },
  invoice: { table: 'invoices', idColumn: 'invoice_id', statusColumn: 'status' },
  payment: { table: 'payments', idColumn: 'payment_id', statusColumn: 'status' },
  receipt: { table: 'receipts', idColumn: 'receipt_id', statusColumn: 'status' },
  warranty: { table: 'warranties', idColumn: 'warranty_id', statusColumn: 'status' }
};

function isStatusMachine(value: string): value is StatusMachineName {
  return Object.keys(statusConfig).includes(value);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'finance', 'support']);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const machineText = String(body.machine ?? '');
  if (!isStatusMachine(machineText)) {
    return NextResponse.json({ ok: false, error: 'Valid machine is required.' }, { status: 400 });
  }

  const objectId = cleanText(body.object_id, 80);
  const toStatus = cleanText(body.to_status, 80);
  const reason = cleanText(body.reason, 500) ?? '';
  if (!objectId || !toStatus) {
    return NextResponse.json({ ok: false, error: 'object_id and to_status are required.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Lightweight pre-check gives a clear API error before the database transaction.
  // The SQL RPC repeats this validation inside one transaction and is the final source of truth.
  const config = statusConfig[machineText];
  const { data: current, error: readError } = await supabase
    .from(config.table)
    .select(`${config.idColumn},${config.statusColumn}`)
    .eq(config.idColumn, objectId)
    .maybeSingle();

  if (readError) return NextResponse.json({ ok: false, error: readError.message }, { status: 500 });
  if (!current) return NextResponse.json({ ok: false, error: 'Record not found.' }, { status: 404 });

  const fromStatus = String(current[config.statusColumn as keyof typeof current] ?? '');
  try {
    assertTransition(machineText, fromStatus, toStatus);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Invalid transition' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('transition_status_tx', {
    p_machine: machineText,
    p_object_id: objectId,
    p_to_status: toStatus,
    p_reason: reason,
    p_actor_id: auth.actor.profileId,
    p_actor_role: auth.role,
    p_ip: getClientIp(request)
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, transition: data });
}
