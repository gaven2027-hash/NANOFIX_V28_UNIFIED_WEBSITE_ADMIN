export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, cleanText, getClientIp } from '@/lib/apiSecurity';
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

type SearchTableConfig = {
  table: string;
  categories: string[];
  roles: string[];
  select: string;
  searchColumns: string[];
  orderColumn: string;
  limit: number;
  map: (row: Record<string, unknown>) => SearchResult;
};

type DynamicAllowlistQuery = {
  select: (columns: string) => {
    or: (filters: string) => {
      order: (column: string, options: { ascending: boolean }) => {
        limit: (count: number) => PromiseLike<{ data: unknown[] | null }>;
      };
    };
  };
};

const BUSINESS_ROLES = ['super_admin', 'operations_admin', 'finance', 'support'];
const CONTENT_ROLES = ['super_admin', 'operations_admin', 'content_admin', 'support'];

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}

function shortId(value: unknown) {
  const id = text(value);
  return id ? id.slice(0, 8) : 'unknown';
}

function money(value: unknown) {
  return typeof value === 'number' || typeof value === 'string' ? value : 0;
}

function workflowSettingHref(settingType: string | null | undefined) {
  if (settingType === 'notification_channel') return '/system-settings#notification-channel-settings';
  if (settingType === 'unified_task_sla' || settingType === 'escalation_rule') return '/system-settings#unified-task-sla-settings';
  return '/system-settings#automation-rule-settings';
}

const GLOBAL_SEARCH_TABLE_ALLOWLIST: SearchTableConfig[] = [
  {
    table: 'customers',
    categories: ['customers'],
    roles: BUSINESS_ROLES,
    select: 'customer_id,name,phone,email,binding_status,created_at',
    searchColumns: ['name', 'phone', 'email'],
    orderColumn: 'created_at',
    limit: 6,
    map: (row) => ({
      type: 'customer',
      title: text(row.name, 'Customer'),
      subtitle: [row.phone, row.email].map((item) => text(item)).filter(Boolean).join(' · '),
      href: `/customer-center#customer-${text(row.customer_id)}`,
      status: nullableText(row.binding_status),
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'leads',
    categories: ['leads'],
    roles: BUSINESS_ROLES,
    select: 'lead_id,source_platform,priority,status,created_at',
    searchColumns: ['source_platform', 'status', 'priority'],
    orderColumn: 'created_at',
    limit: 6,
    map: (row) => ({
      type: 'lead',
      title: `Lead ${shortId(row.lead_id)}`,
      subtitle: `${text(row.source_platform, 'unknown source')} · priority ${text(row.priority, 'P2')}`,
      href: `/service-operations#lead-${text(row.lead_id)}`,
      status: nullableText(row.status),
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'jobs',
    categories: ['jobs'],
    roles: BUSINESS_ROLES,
    select: 'job_id,service_request_id,customer_id,status,scheduled_at,notes,created_at',
    searchColumns: ['status', 'notes'],
    orderColumn: 'created_at',
    limit: 6,
    map: (row) => ({
      type: 'job',
      title: `Job ${shortId(row.job_id)}`,
      subtitle: text(row.scheduled_at) ? `Scheduled ${text(row.scheduled_at)}` : 'No schedule yet',
      href: `/service-operations#job-${text(row.job_id)}`,
      status: nullableText(row.status),
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'invoices',
    categories: ['invoices'],
    roles: BUSINESS_ROLES,
    select: 'invoice_id,invoice_no,total_amount,currency,status,created_at',
    searchColumns: ['invoice_no', 'status'],
    orderColumn: 'created_at',
    limit: 6,
    map: (row) => ({
      type: 'invoice',
      title: text(row.invoice_no, `Invoice ${shortId(row.invoice_id)}`),
      subtitle: `Total ${text(row.currency, 'SGD')} ${money(row.total_amount)}`,
      href: `/service-operations#invoice-${text(row.invoice_id)}`,
      status: nullableText(row.status),
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'warranties',
    categories: ['warranties'],
    roles: BUSINESS_ROLES,
    select: 'warranty_id,status,coverage,public_ref,created_at',
    searchColumns: ['status', 'coverage', 'public_ref'],
    orderColumn: 'created_at',
    limit: 6,
    map: (row) => ({
      type: 'warranty',
      title: text(row.public_ref, `Warranty ${shortId(row.warranty_id)}`),
      subtitle: text(row.coverage, 'Warranty record'),
      href: `/service-operations#warranty-${text(row.warranty_id)}`,
      status: nullableText(row.status),
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'ai_logs',
    categories: ['ai_logs'],
    roles: CONTENT_ROLES,
    select: 'ai_log_id,module,safety_status,created_at',
    searchColumns: ['module', 'safety_status', 'input_summary', 'output_summary'],
    orderColumn: 'created_at',
    limit: 6,
    map: (row) => ({
      type: 'ai_log',
      title: `AI Log ${shortId(row.ai_log_id)}`,
      subtitle: text(row.module, 'AI module'),
      href: `/ai-intelligence#ai-log-${text(row.ai_log_id)}`,
      status: nullableText(row.safety_status),
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'automation_rules',
    categories: ['automation', 'automation_rules'],
    roles: CONTENT_ROLES,
    select: 'rule_id,rule_key,name,module,trigger_event,is_enabled,priority,created_at',
    searchColumns: ['rule_key', 'name', 'module', 'trigger_event', 'priority'],
    orderColumn: 'created_at',
    limit: 8,
    map: (row) => ({
      type: 'automation_rule',
      title: text(row.name, `Automation ${shortId(row.rule_id)}`),
      subtitle: `${text(row.module, 'module')} · ${text(row.trigger_event, text(row.rule_key, 'trigger'))} · priority ${text(row.priority, 'P2')}`,
      href: '/dashboard#automation-notification-engine',
      status: row.is_enabled === true ? 'enabled' : 'disabled',
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'notification_outbox',
    categories: ['notifications', 'notification_outbox'],
    roles: CONTENT_ROLES,
    select: 'notification_id,channel,target_role,subject,delivery_status,created_at',
    searchColumns: ['channel', 'target_role', 'subject', 'delivery_status'],
    orderColumn: 'created_at',
    limit: 8,
    map: (row) => ({
      type: 'notification_outbox',
      title: text(row.subject, `Notification ${shortId(row.notification_id)}`),
      subtitle: `${text(row.channel, 'internal')} · ${text(row.target_role, 'role')}`,
      href: '/dashboard#automation-notification-engine',
      status: nullableText(row.delivery_status),
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'unified_tasks',
    categories: ['tasks', 'unified_tasks'],
    roles: CONTENT_ROLES,
    select: 'task_id,title,source_module,status,priority,created_at',
    searchColumns: ['title', 'description', 'source_module', 'status', 'priority'],
    orderColumn: 'created_at',
    limit: 8,
    map: (row) => ({
      type: 'unified_task',
      title: text(row.title, `Task ${shortId(row.task_id)}`),
      subtitle: `${text(row.source_module, 'module')} · priority ${text(row.priority, 'P2')}`,
      href: '/dashboard#unified-task-engine',
      status: nullableText(row.status),
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'internal_inbox_messages',
    categories: ['inbox', 'internal_inbox'],
    roles: CONTENT_ROLES,
    select: 'message_id,subject,recipient_role,priority,read_at,created_at',
    searchColumns: ['subject', 'body', 'recipient_role', 'priority'],
    orderColumn: 'created_at',
    limit: 8,
    map: (row) => ({
      type: 'internal_inbox',
      title: text(row.subject, `Message ${shortId(row.message_id)}`),
      subtitle: `${text(row.recipient_role, 'role')} · priority ${text(row.priority, 'P2')}`,
      href: '/dashboard#internal-inbox',
      status: row.read_at ? 'read' : 'unread',
      created_at: nullableText(row.created_at)
    })
  },
  {
    table: 'workflow_settings',
    categories: ['settings', 'workflow_settings', 'automation_rule_settings', 'notification_channel_settings', 'unified_task_sla_settings'],
    roles: CONTENT_ROLES,
    select: 'setting_id,setting_key,setting_type,name,description,is_enabled,updated_at',
    searchColumns: ['setting_key', 'setting_type', 'name', 'description'],
    orderColumn: 'updated_at',
    limit: 10,
    map: (row) => {
      const settingType = nullableText(row.setting_type);
      return {
        type: 'workflow_setting',
        title: text(row.name, text(row.setting_key, `Workflow setting ${shortId(row.setting_id)}`)),
        subtitle: `${text(row.setting_type, 'workflow_setting')} · ${text(row.setting_key, 'setting')}`,
        href: workflowSettingHref(settingType),
        status: row.is_enabled === true ? 'enabled' : 'disabled',
        created_at: nullableText(row.updated_at)
      };
    }
  }
];

const CATEGORY_ALLOWLIST = new Set(['all', ...GLOBAL_SEARCH_TABLE_ALLOWLIST.flatMap((item) => item.categories)]);

function normalizeSearchQuery(value: string | null) {
  return (cleanText(value, 120) ?? '')
    .replace(/[\\%_(),.*:;{}[\]"'<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function normalizeCategory(value: string | null) {
  const cleaned = (cleanText(value, 40) ?? 'all').toLowerCase().replace(/[\s-]+/g, '_');
  return CATEGORY_ALLOWLIST.has(cleaned) ? cleaned : 'all';
}

function like(input: string) {
  return `%${input.replaceAll('%', '').replaceAll('_', '').slice(0, 80)}%`;
}

function roleCanAccess(role: string, config: SearchTableConfig) {
  return config.roles.includes(role);
}

function categoryCanAccess(category: string, config: SearchTableConfig) {
  return category === 'all' || config.categories.includes(category);
}

function allowedSearchConfigs(role: string, category: string) {
  return GLOBAL_SEARCH_TABLE_ALLOWLIST.filter((config) => roleCanAccess(role, config) && categoryCanAccess(category, config));
}

function buildOrQuery(columns: string[], pattern: string) {
  return columns.map((column) => `${column}.ilike.${pattern}`).join(',');
}

async function runAllowlistQuery(config: SearchTableConfig, pattern: string): Promise<SearchResult[]> {
  const supabase = createAdminClient();
  const fromAllowlistedTable = supabase.from.bind(supabase) as unknown as (table: string) => DynamicAllowlistQuery;
  const { data } = await fromAllowlistedTable(config.table)
    .select(config.select)
    .or(buildOrQuery(config.searchColumns, pattern))
    .order(config.orderColumn, { ascending: false })
    .limit(config.limit);

  return (Array.isArray(data) ? data : []).map((row) => config.map(row as Record<string, unknown>));
}

async function explicitAllowlistSearch(q: string, category: string, role: string): Promise<SearchResult[]> {
  const pattern = like(q);
  const tasks: Promise<SearchResult[]>[] = allowedSearchConfigs(role, category).map((config) => runAllowlistQuery(config, pattern));
  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []).slice(0, 30);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const q = normalizeSearchQuery(searchParams.get('q'));
  const category = normalizeCategory(searchParams.get('category'));
  const role = auth.role;
  const allowedTables = allowedSearchConfigs(role, category).map((config) => config.table);

  if (q.length < 2) {
    return NextResponse.json({
      ok: true,
      query: q,
      category,
      role,
      results: [],
      searchEngine: 'explicit_table_allowlist',
      rpcRetired: true,
      allowedTables
    });
  }

  const results = await explicitAllowlistSearch(q, category, role);

  await writeAuditLog({
    actorId: auth.actor.profileId,
    role: auth.role,
    action: 'global_search',
    objectType: 'global_search',
    objectId: q,
    after: {
      category,
      role,
      search_engine: 'explicit_table_allowlist',
      rpc_retired: true,
      allowed_tables: allowedTables,
      result_count: results.length
    },
    ip: getClientIp(request)
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    query: q,
    category,
    role,
    results,
    searchEngine: 'explicit_table_allowlist',
    rpcRetired: true,
    allowedTables
  });
}
