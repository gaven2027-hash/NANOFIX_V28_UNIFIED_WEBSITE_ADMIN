import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

type QueryResult = {
  data: Row[];
  error: { message?: string } | null;
  count?: number | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanSearch(value: string | null) {
  return (value || '').replace(/[,%()]/g, ' ').trim().slice(0, 120);
}

async function safeList(label: string, promise: Promise<QueryResult>) {
  try {
    const result = await promise;
    if (result.error) return { label, rows: [], count: 0, error: result.error.message || 'Query failed' };
    return { label, rows: result.data ?? [], count: result.count ?? result.data?.length ?? 0, error: null };
  } catch (error) {
    return { label, rows: [], count: 0, error: error instanceof Error ? error.message : 'Query failed' };
  }
}

function filterRows(rows: Row[], search: string) {
  const q = search.toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
}

function statusTone(status: unknown) {
  const value = String(status || '').toLowerCase();
  if (/(active|approved|paid|completed|healthy|published|linked)/.test(value)) return 'green';
  if (/(pending|draft|scheduled|sent|open|degraded|review)/.test(value)) return 'amber';
  if (/(failed|cancelled|overdue|disabled|rejected|expired|critical)/.test(value)) return 'red';
  return 'blue';
}

async function getDashboardData(search: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase server client is not configured.');

  const [
    leads,
    pendingBinding,
    pendingInspections,
    pendingQuotes,
    unpaidInvoices,
    aiHandoff,
    modules,
    intake,
    socialMessages,
    searchLogs,
    auditLogs
  ] = await Promise.all([
    safeList('new_leads', supabase.from('leads').select('lead_id,customer_id,name,phone,email,source_platform,status,priority,created_at,updated_at').in('status', ['new', 'open', 'pending']).order('created_at', { ascending: false }).limit(120)),
    safeList('pending_binding', supabase.from('customer_binding_suggestions').select('suggestion_id,service_request_id,customer_id,match_score,match_reasons,status,created_at,updated_at').in('status', ['suggested', 'pending']).order('created_at', { ascending: false }).limit(120)),
    safeList('pending_inspections', supabase.from('inspections').select('inspection_id,service_request_id,engineer_id,scheduled_at,status,created_at').in('status', ['scheduled', 'assigned', 'pending', 'in_progress']).order('created_at', { ascending: false }).limit(120)),
    safeList('pending_quotes', supabase.from('quotations').select('quotation_id,customer_id,service_request_id,version,total_amount,currency,valid_until,status,created_at,updated_at').in('status', ['draft', 'sent', 'pending_review', 'pending']).order('created_at', { ascending: false }).limit(120)),
    safeList('unpaid_invoices', supabase.from('invoices').select('invoice_id,invoice_no,customer_id,job_id,total_amount,currency,due_date,status,created_at').in('status', ['unpaid', 'overdue', 'sent', 'issued']).order('created_at', { ascending: false }).limit(120)),
    safeList('ai_handoff', supabase.from('ai_drafts').select('draft_id,module,record_id,task,human_review_status,ai_risk_level,created_at').in('human_review_status', ['pending_review', 'rejected']).order('created_at', { ascending: false }).limit(120)),
    safeList('module_health', supabase.from('app_modules').select('module_key,name,category,criticality,health_status,enabled,updated_at').order('updated_at', { ascending: false }).limit(120)),
    safeList('intake', supabase.from('service_requests').select('service_request_id,customer_id,contact_name,phone,email,issue_type,address_text,status,priority,source_platform,created_at,updated_at').order('created_at', { ascending: false }).limit(120)),
    safeList('channel_alerts', supabase.from('social_messages').select('message_id,lead_id,customer_id,channel,direction,body,risk_level,created_at').order('created_at', { ascending: false }).limit(120)),
    safeList('global_search', supabase.from('search_logs').select('search_log_id,actor_id,query,filters,result_count,created_at').order('created_at', { ascending: false }).limit(120)),
    safeList('audit', supabase.from('audit_logs').select('audit_id,actor_id,actor_role,action,object_type,object_id,created_at').order('created_at', { ascending: false }).limit(120))
  ]);

  const filtered = {
    new_leads: filterRows(leads.rows, search),
    pending_binding: filterRows(pendingBinding.rows, search),
    pending_inspections: filterRows(pendingInspections.rows, search),
    pending_quotes: filterRows(pendingQuotes.rows, search),
    unpaid_invoices: filterRows(unpaidInvoices.rows, search),
    ai_handoff: filterRows(aiHandoff.rows, search),
    module_health: filterRows(modules.rows, search),
    intake: filterRows(intake.rows, search),
    channel_alerts: filterRows(socialMessages.rows, search),
    global_search: filterRows(searchLogs.rows, search),
    audit: filterRows(auditLogs.rows, search)
  };

  const unpaidAmount = unpaidInvoices.rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const degradedModules = modules.rows.filter((row) => String(row.health_status || '').toLowerCase() !== 'healthy');
  const healthPercent = modules.rows.length ? Math.max(0, Math.round(((modules.rows.length - degradedModules.length) / modules.rows.length) * 100)) : 100;

  const kpis = [
    { key: 'new_leads', label: 'New Leads', zh: '新线索', value: filtered.new_leads.length, trend: '+ live', tone: 'blue' },
    { key: 'pending_inspections', label: 'Pending Inspection', zh: '待查验', value: filtered.pending_inspections.length, trend: 'urgent', tone: 'amber' },
    { key: 'pending_quotes', label: 'Pending Quotes', zh: '待报价', value: filtered.pending_quotes.length, trend: 'open', tone: 'cyan' },
    { key: 'unpaid_invoices', label: 'Unpaid Invoices', zh: '未付款发票', value: `$${Math.round(unpaidAmount / 1000)}k`, rawValue: unpaidAmount, trend: 'unpaid', tone: 'red' },
    { key: 'ai_handoff', label: 'AI Human Handoff', zh: 'AI 转人工', value: filtered.ai_handoff.length, trend: 'review', tone: 'red' },
    { key: 'module_health', label: 'Module Health', zh: '模块健康', value: `${healthPercent}%`, rawValue: healthPercent, trend: `${degradedModules.length} degraded`, tone: degradedModules.length ? 'amber' : 'green' }
  ];

  const tasks = [...filtered.new_leads, ...filtered.pending_binding, ...filtered.pending_inspections, ...filtered.pending_quotes, ...filtered.unpaid_invoices].slice(0, 120);
  const notifications = [...filtered.channel_alerts, ...filtered.ai_handoff, ...filtered.audit].slice(0, 120);

  return {
    kpis,
    details: { ...filtered, tasks, notifications, reports: tasks, summary: tasks },
    errors: [leads, pendingBinding, pendingInspections, pendingQuotes, unpaidInvoices, aiHandoff, modules, intake, socialMessages, searchLogs, auditLogs].filter((item) => item.error).map((item) => ({ label: item.label, error: item.error }))
  };
}

export async function GET(request: Request) {
  const { context, response } = requireAdmin(request, 'read:*');
  if (response) return response;

  const url = new URL(request.url);
  const search = cleanSearch(url.searchParams.get('search'));
  const detail = url.searchParams.get('detail') || 'summary';

  try {
    const data = await getDashboardData(search);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'read', object_type: 'dashboard', after_data: { detail, search } });
    return NextResponse.json({ ok: true, detail, ...data, selectedRows: data.details[detail as keyof typeof data.details] || data.details.summary || [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Dashboard query failed.', 500);
  }
}
