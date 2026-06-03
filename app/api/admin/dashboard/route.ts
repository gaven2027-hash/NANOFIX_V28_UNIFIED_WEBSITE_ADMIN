import { NextRequest, NextResponse } from 'next/server';
import { cleanText, getClientIp, requireAdminApi } from '@/lib/apiSecurity';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';
type Row = Record<string, unknown>;

type DashboardSpec = {
  key: string;
  label: string;
  zh: string;
  table: string;
  select: string;
  idField: string;
  route: string;
  tone: Tone;
  statusField?: string;
  statuses?: string[];
  orderColumn?: string;
  limit?: number;
};

const specs: DashboardSpec[] = [
  {
    key: 'new_leads',
    label: 'New Leads',
    zh: '新线索',
    table: 'leads',
    select: 'lead_id,name,phone,email,source_platform,request_origin,priority,status,binding_status,created_at,updated_at',
    idField: 'lead_id',
    route: '/service-operations#leads',
    tone: 'blue',
    statusField: 'status',
    statuses: ['new', 'open', 'pending', 'qualified'],
    limit: 40
  },
  {
    key: 'repair_requests',
    label: 'Repair Requests',
    zh: '报修 / 服务请求',
    table: 'service_requests',
    select: 'service_request_id,customer_id,contact_name,phone,whatsapp,email,issue_type,address_text,status,binding_status,priority,source_platform,created_at,updated_at',
    idField: 'service_request_id',
    route: '/service-operations#service-requests',
    tone: 'cyan',
    statusField: 'status',
    statuses: ['pending_review', 'scheduled', 'new', 'open'],
    limit: 40
  },
  {
    key: 'pending_binding',
    label: 'Pending Binding',
    zh: '待绑定客户',
    table: 'service_requests',
    select: 'service_request_id,customer_id,contact_name,phone,whatsapp,email,issue_type,status,binding_status,created_at,updated_at',
    idField: 'service_request_id',
    route: '/customer-center#pending-customer-binding',
    tone: 'amber',
    statusField: 'binding_status',
    statuses: ['pending', 'pending_review', 'manual_review', 'unclaimed'],
    limit: 40
  },
  {
    key: 'inspections',
    label: 'Inspections',
    zh: '查验',
    table: 'inspections',
    select: 'inspection_id,service_request_id,engineer_id,scheduled_at,status,created_at',
    idField: 'inspection_id',
    route: '/service-operations#inspections',
    tone: 'amber',
    statusField: 'status',
    statuses: ['scheduled', 'assigned', 'pending', 'in_progress'],
    limit: 40
  },
  {
    key: 'quotations',
    label: 'Quotations',
    zh: '报价',
    table: 'quotations',
    select: 'quotation_id,job_id,current_version,total,approval_status,created_at',
    idField: 'quotation_id',
    route: '/service-operations#quotations',
    tone: 'cyan',
    statusField: 'approval_status',
    statuses: ['draft', 'pending_review', 'sent', 'viewed'],
    limit: 40
  },
  {
    key: 'invoices',
    label: 'Invoices',
    zh: '发票',
    table: 'invoices',
    select: 'invoice_id,invoice_no,job_id,total,status,created_at',
    idField: 'invoice_id',
    route: '/service-operations#invoices',
    tone: 'red',
    statusField: 'status',
    statuses: ['draft', 'issued', 'sent', 'unpaid', 'overdue'],
    limit: 40
  },
  {
    key: 'payments',
    label: 'Payments',
    zh: '付款',
    table: 'payments',
    select: 'payment_id,invoice_id,amount,status,fee,reconciled_at,created_at',
    idField: 'payment_id',
    route: '/service-operations#payments',
    tone: 'green',
    statusField: 'status',
    statuses: ['processing', 'succeeded', 'paid', 'pending'],
    limit: 40
  },
  {
    key: 'module_health',
    label: 'Module Health',
    zh: '模块健康',
    table: 'app_modules',
    select: 'module_key,name,category,criticality,health_status,enabled,updated_at',
    idField: 'module_key',
    route: '/system-settings#health-checks',
    tone: 'green',
    orderColumn: 'updated_at',
    limit: 40
  },
  {
    key: 'backup_jobs',
    label: 'Backup Jobs',
    zh: '备份任务',
    table: 'backup_jobs',
    select: 'backup_id,module,schedule_cron,status,encrypted_file_path,signed_url_expires_at,created_at',
    idField: 'backup_id',
    route: '/system-settings#backup-download-center',
    tone: 'gray',
    limit: 40
  },
  {
    key: 'audit_logs',
    label: 'Audit Logs',
    zh: '审计日志',
    table: 'audit_logs',
    select: 'audit_id,actor_id,role,action,object_type,object_id,created_at',
    idField: 'audit_id',
    route: '/system-settings#audit-logs',
    tone: 'gray',
    limit: 40
  }
];

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

function isRow(value: unknown): value is Row {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asString(value: unknown) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

function rowHref(spec: DashboardSpec, row: Row) {
  const id = asString(row[spec.idField]);
  return id ? `${spec.route}?open=${encodeURIComponent(id)}` : spec.route;
}

function filterRows(rows: Row[], search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
}

async function safeList(supabase: ReturnType<typeof createAdminClient>, spec: DashboardSpec, search: string) {
  try {
    let query = supabase.from(spec.table).select(spec.select);
    if (spec.statusField && spec.statuses?.length) {
      query = query.in(spec.statusField, spec.statuses);
    }
    const { data, error } = await query
      .order(spec.orderColumn ?? 'created_at', { ascending: false })
      .limit(spec.limit ?? 30);

    if (error) return { spec, rows: [] as Row[], filteredRows: [] as Row[], error: error.message };

    const rows = (Array.isArray(data) ? data.filter(isRow) : []).map((row) => ({
      ...row,
      _dashboard_href: rowHref(spec, row)
    }));
    return { spec, rows, filteredRows: filterRows(rows, search), error: null };
  } catch (error) {
    return {
      spec,
      rows: [] as Row[],
      filteredRows: [] as Row[],
      error: error instanceof Error ? error.message : 'Dashboard query failed'
    };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support']);
  if (!auth.ok) return auth.response;

  const search = cleanText(request.nextUrl.searchParams.get('search'), 120) ?? '';
  const selectedKey = cleanText(request.nextUrl.searchParams.get('section'), 80) ?? 'new_leads';
  const supabase = createAdminClient();
  const results = await Promise.all(specs.map((spec) => safeList(supabase, spec, search)));
  const sections = results.map((result) => ({
    key: result.spec.key,
    label: result.spec.label,
    zh: result.spec.zh,
    route: result.spec.route,
    tone: result.spec.tone,
    count: result.filteredRows.length,
    error: result.error
  }));
  const kpis = sections.slice(0, 8).map((section) => ({
    key: section.key,
    label: section.label,
    zh: section.zh,
    value: section.count,
    tone: section.error ? 'red' : section.tone,
    href: section.route,
    warning: section.error
  }));
  const selected = results.find((result) => result.spec.key === selectedKey) ?? results[0];
  const errors = results
    .filter((result) => result.error)
    .map((result) => ({ key: result.spec.key, error: result.error }));

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'dashboard_live_core_read',
    objectType: 'dashboard',
    after: {
      selected_key: selected?.spec.key ?? null,
      search: search || null,
      error_count: errors.length,
      counts: Object.fromEntries(sections.map((section) => [section.key, section.count]))
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    search,
    selected_key: selected?.spec.key ?? selectedKey,
    kpis,
    sections,
    selectedRows: selected?.filteredRows ?? [],
    errors
  }, errors.length ? 207 : 200);
}
