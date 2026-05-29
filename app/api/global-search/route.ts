export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, cleanText } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

type SearchResult = {
  type: string;
  title: string;
  subtitle: string;
  href: string;
  status: string | null;
  created_at: string | null;
};

function like(input: string) {
  return `%${input.replaceAll('%', '').replaceAll('_', '').slice(0, 80)}%`;
}

function normalizeCategory(category: string) {
  return category.toLowerCase().replace(/\s+/g, '_');
}

async function fallbackSearch(q: string, category: string): Promise<SearchResult[]> {
  const supabase = createAdminClient();
  const pattern = like(q);
  const normalized = normalizeCategory(category);
  const tasks: PromiseLike<SearchResult[]>[] = [];

  if (category === 'all' || normalized === 'customers') {
    tasks.push(supabase
      .from('customers')
      .select('customer_id,name,phone,email,binding_status,created_at')
      .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }): SearchResult[] => (data ?? []).map((row) => ({
        type: 'customer',
        title: row.name ?? 'Customer',
        subtitle: [row.phone, row.email].filter(Boolean).join(' · '),
        href: `/customer-center#customer-${row.customer_id}`,
        status: row.binding_status,
        created_at: row.created_at
      }))));
  }

  if (category === 'all' || normalized === 'leads') {
    tasks.push(supabase
      .from('leads')
      .select('lead_id,source_platform,priority,status,created_at')
      .or(`source_platform.ilike.${pattern},status.ilike.${pattern},priority.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }): SearchResult[] => (data ?? []).map((row) => ({
        type: 'lead',
        title: `Lead ${row.lead_id?.slice(0, 8)}`,
        subtitle: `${row.source_platform} · priority ${row.priority}`,
        href: `/service-operations#lead-${row.lead_id}`,
        status: row.status,
        created_at: row.created_at
      }))));
  }

  if (category === 'all' || normalized === 'jobs') {
    tasks.push(supabase
      .from('jobs')
      .select('job_id,status,scheduled_at,created_at')
      .or(`status.ilike.${pattern},completion_notes.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }): SearchResult[] => (data ?? []).map((row) => ({
        type: 'job',
        title: `Job ${row.job_id?.slice(0, 8)}`,
        subtitle: row.scheduled_at ? `Scheduled ${row.scheduled_at}` : 'No schedule yet',
        href: `/service-operations#job-${row.job_id}`,
        status: row.status,
        created_at: row.created_at
      }))));
  }

  if (category === 'all' || normalized === 'invoices') {
    tasks.push(supabase
      .from('invoices')
      .select('invoice_id,invoice_no,total,status,created_at')
      .or(`invoice_no.ilike.${pattern},status.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }): SearchResult[] => (data ?? []).map((row) => ({
        type: 'invoice',
        title: row.invoice_no ?? `Invoice ${row.invoice_id?.slice(0, 8)}`,
        subtitle: `Total SGD ${row.total ?? 0}`,
        href: `/service-operations#invoice-${row.invoice_id}`,
        status: row.status,
        created_at: row.created_at
      }))));
  }

  if (category === 'all' || normalized === 'warranties') {
    tasks.push(supabase
      .from('warranties')
      .select('warranty_id,status,coverage,created_at')
      .or(`status.ilike.${pattern},coverage.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }): SearchResult[] => (data ?? []).map((row) => ({
        type: 'warranty',
        title: `Warranty ${row.warranty_id?.slice(0, 8)}`,
        subtitle: row.coverage ?? 'Warranty record',
        href: `/service-operations#warranty-${row.warranty_id}`,
        status: row.status,
        created_at: row.created_at
      }))));
  }

  if (category === 'all' || normalized === 'ai_logs') {
    tasks.push(supabase
      .from('ai_logs')
      .select('ai_log_id,module,safety_status,created_at')
      .or(`module.ilike.${pattern},safety_status.ilike.${pattern},input_summary.ilike.${pattern},output_summary.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }): SearchResult[] => (data ?? []).map((row) => ({
        type: 'ai_log',
        title: `AI Log ${row.ai_log_id?.slice(0, 8)}`,
        subtitle: row.module ?? 'AI module',
        href: `/ai-intelligence#ai-log-${row.ai_log_id}`,
        status: row.safety_status,
        created_at: row.created_at
      }))));
  }

  if (category === 'all' || normalized === 'tasks' || normalized === 'unified_tasks') {
    tasks.push(supabase
      .from('unified_tasks')
      .select('task_id,title,source_module,status,priority,created_at')
      .or(`title.ilike.${pattern},description.ilike.${pattern},source_module.ilike.${pattern},status.ilike.${pattern},priority.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }): SearchResult[] => (data ?? []).map((row) => ({
        type: 'unified_task',
        title: row.title ?? `Task ${row.task_id?.slice(0, 8)}`,
        subtitle: `${row.source_module ?? 'module'} · priority ${row.priority ?? 'P2'}`,
        href: `/dashboard#unified-task-${row.task_id}`,
        status: row.status,
        created_at: row.created_at
      }))));
  }

  if (category === 'all' || normalized === 'inbox' || normalized === 'internal_inbox') {
    tasks.push(supabase
      .from('internal_inbox_messages')
      .select('message_id,subject,recipient_role,priority,read_at,created_at')
      .or(`subject.ilike.${pattern},body.ilike.${pattern},recipient_role.ilike.${pattern},priority.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }): SearchResult[] => (data ?? []).map((row) => ({
        type: 'internal_inbox',
        title: row.subject ?? `Message ${row.message_id?.slice(0, 8)}`,
        subtitle: `${row.recipient_role ?? 'role'} · priority ${row.priority ?? 'P2'}`,
        href: `/dashboard#internal-inbox-${row.message_id}`,
        status: row.read_at ? 'read' : 'unread',
        created_at: row.created_at
      }))));
  }

  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []).slice(0, 24);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const q = cleanText(searchParams.get('q'), 80) ?? '';
  const category = cleanText(searchParams.get('category'), 40)?.toLowerCase() ?? 'all';

  if (q.length < 2) {
    return NextResponse.json({ ok: true, query: q, category, results: [] });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('search_all_records', { search_text: q, max_results: 20 });
  const results = !error && Array.isArray(data) ? data as SearchResult[] : await fallbackSearch(q, category);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'global_search',
    objectType: 'global_search',
    objectId: q,
    after: { category, result_count: results.length }
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, query: q, category, results });
}
