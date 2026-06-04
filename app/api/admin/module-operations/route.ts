export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { menu } from '@/data/adminNavigation';
import { getAdminModuleReality } from '@/data/adminModuleReality';
import { cleanText, getClientIp, jsonError, requireActorApi } from '@/lib/apiSecurity';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer'] as const;
const WRITE_ROLES = READ_ROLES;

const routeTables: Record<string, string[]> = {
  '/admin': ['audit_logs', 'unified_tasks', 'internal_inbox_messages', 'app_modules'],
  '/dashboard': ['unified_tasks', 'internal_inbox_messages', 'notification_outbox', 'audit_logs'],
  '/service-operations': ['leads', 'unified_intake', 'service_requests', 'jobs', 'quotations', 'invoices', 'payments', 'warranties', 'status_transition_logs', 'audit_logs'],
  '/website-management': ['website_pages', 'website_content_blocks', 'content_drafts', 'service_requests', 'leads', 'audit_logs'],
  '/social-media': ['social_accounts', 'social_messages', 'social_content_drafts', 'leads', 'audit_logs'],
  '/admin/advertising-center': ['ad_campaigns', 'ad_performance_daily', 'ad_budget_requests', 'audit_logs'],
  '/ai-intelligence': ['ai_logs', 'content_drafts', 'notification_outbox', 'audit_logs'],
  '/customer-center': ['customers', 'profiles', 'customer_account_claims', 'customer_record_links', 'service_requests', 'quotations', 'invoices', 'payments', 'warranties', 'audit_logs'],
  '/system-settings': ['workflow_settings', 'backup_jobs', 'app_modules', 'audit_logs']
};

const routeApis: Record<string, string[]> = {
  '/admin': ['/api/admin/global-search', '/api/admin/entity-events', '/api/admin/unified-tasks'],
  '/dashboard': ['/api/admin/dashboard', '/api/admin/automation-notifications', '/api/admin/internal-inbox', '/api/admin/unified-tasks'],
  '/service-operations': ['/api/admin/service-operations', '/api/admin/status-transition'],
  '/website-management': ['/api/admin/website-management', '/api/admin/cms/blocks'],
  '/social-media': ['/api/admin/social/messages'],
  '/admin/advertising-center': ['/api/admin/advertising-center', '/api/admin/advertising-center/insights'],
  '/ai-intelligence': ['/api/admin/ai/drafts'],
  '/customer-center': ['/api/admin/customers/unclaimed', '/api/admin/customers/timeline', '/api/admin/customer-center/documents'],
  '/system-settings': ['/api/admin/workflow-settings', '/api/admin/backups/jobs', '/api/admin/module-health']
};

function basePath(href: string) { return href.split('#')[0] || '/admin'; }
function anchorKey(href: string) { return href.includes('#') ? href.split('#')[1] : href.replace(/^\//, '').replace(/\//g, '-'); }
function moduleKey(href: string) { return `${basePath(href).replace(/^\//, '').replace(/\//g, '_')}_${anchorKey(href)}`.slice(0, 80); }
function unique(values: string[]) { return Array.from(new Set(values)); }
function validApi(path: string) { return /^\/api\/[a-z0-9_/?=&.#%-]+$/i.test(path) && !/\s|\bor\b|module-specific/i.test(path); }
function allChildren() { return menu.flatMap((parent) => parent.children.map((child) => ({ parent, child }))); }
function resolveChild(href: string | null) { const safe = cleanText(href, 220); return safe ? allChildren().find(({ child }) => child.href === safe) ?? null : null; }
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' } }); }
function tablesFor(href: string) { const reality = getAdminModuleReality(href); return unique([...(reality?.tables ?? []), ...(routeTables[basePath(href)] ?? [])]).filter((t) => /^[a-z][a-z0-9_]*$/i.test(t)).slice(0, 12); }
function apisFor(href: string) { const reality = getAdminModuleReality(href); return unique([...(reality?.apis ?? []), ...(routeApis[basePath(href)] ?? [])]).filter(validApi).slice(0, 6); }

async function tableProbe(supabase: ReturnType<typeof createAdminClient>, table: string) {
  try {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    return { table, count: count ?? null, ok: !error, error: error?.message ?? null };
  } catch (error) { return { table, count: null, ok: false, error: error instanceof Error ? error.message : 'Table probe failed' }; }
}

async function apiProbes(request: NextRequest, apis: string[]) {
  const cookie = request.headers.get('cookie') ?? '';
  const authorization = request.headers.get('authorization') ?? '';
  return Promise.all(apis.slice(0, 4).map(async (path) => {
    try {
      const response = await fetch(`${request.nextUrl.origin}${path}${path.includes('?') ? '&' : '?'}limit=5`, { headers: { accept: 'application/json', ...(cookie ? { cookie } : {}), ...(authorization ? { authorization } : {}) }, cache: 'no-store' });
      return { path, ok: response.ok, status: response.status, error: response.ok ? null : `HTTP ${response.status}` };
    } catch (error) { return { path, ok: false, status: null, error: error instanceof Error ? error.message : 'API probe failed' }; }
  }));
}

async function recentAudit(supabase: ReturnType<typeof createAdminClient>, href: string) {
  const key = moduleKey(href);
  const { data, error } = await supabase.from('audit_logs').select('audit_id,role,action,object_type,object_id,created_at').or(`object_type.eq.${key},object_type.eq.admin_submodule`).order('created_at', { ascending: false }).limit(8);
  return { rows: data ?? [], error: error?.message ?? null };
}

export async function GET(request: NextRequest) {
  const auth = await requireActorApi(request, [...READ_ROLES]);
  if (!auth.ok) return auth.response;
  const matched = resolveChild(request.nextUrl.searchParams.get('href'));
  if (!matched) return jsonError('Unknown admin submenu href.', 404);
  const href = matched.child.href;
  const supabase = createAdminClient();
  const reality = getAdminModuleReality(href);
  const apis = apisFor(href);
  const [tableResults, apiResults, audit] = await Promise.all([Promise.all(tablesFor(href).map((table) => tableProbe(supabase, table))), apiProbes(request, apis), recentAudit(supabase, href)]);
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: 'admin_submodule_live_read', objectType: moduleKey(href), after: { href, parent: matched.parent.href }, ip: getClientIp(request) }).catch(() => undefined);
  return json({ ok: true, module: { parent: matched.parent, child: matched.child, module_key: moduleKey(href), anchor: anchorKey(href), status: reality?.status ?? 'live', risk: reality?.risk ?? 'P1' }, operations: { tables: tableResults, apis, api_probes: apiResults, write_actions: reality?.writeActions ?? ['create_followup_task', 'record_audit_check'], audit_actions: reality?.auditActions ?? ['admin_submodule_operation'] }, audit });
}

export async function POST(request: NextRequest) {
  const auth = await requireActorApi(request, [...WRITE_ROLES]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const matched = resolveChild(cleanText(body.href, 220));
  if (!matched) return jsonError('Unknown admin submenu href.', 404);
  const action = ['record_audit_check', 'create_followup_task', 'api_probe', 'refresh_live_data'].includes(String(body.action)) ? String(body.action) : 'record_audit_check';
  const key = moduleKey(matched.child.href);
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  let task: Record<string, unknown> | null = null;
  if (action === 'create_followup_task') {
    const { data, error } = await supabase.from('unified_tasks').insert({ source_module: key, source_table: 'admin_submodule', title: `${matched.child.title} live operation follow-up`, description: `${matched.parent.title} / ${matched.child.title}`, priority: 'P2', assignee_role: 'operations_admin', created_by: auth.actor.profileId, status: 'open', metadata_json: { href: matched.child.href, parent: matched.parent.href, created_from: 'module_operations_panel' }, created_at: now, updated_at: now }).select('task_id,source_module,title,status,priority,assignee_role,created_at').single();
    if (error) return jsonError(error.message, 500);
    task = data as Record<string, unknown>;
  }
  const { data: event, error: eventError } = await supabase.from('entity_events').insert({ topic: 'admin_submodule_operation', entity_type: 'admin_submodule', entity_id: key, module_key: key, actor_role: auth.role, payload: { href: matched.child.href, parent_href: matched.parent.href, action, task, ip: getClientIp(request) }, idempotency_key: `admin_submodule_operation:${key}:${action}:${now}`, created_at: now }).select('event_id,topic,module_key,created_at').single();
  await writeAuditLog({ actorId: auth.actor.profileId, role: auth.role, action: action === 'create_followup_task' ? 'admin_submodule_followup_task_create' : 'admin_submodule_operation_recorded', objectType: key, objectId: typeof task?.task_id === 'string' ? task.task_id : null, after: { href: matched.child.href, parent: matched.parent.href, action, task, event: event ?? null, event_error: eventError?.message ?? null }, ip: getClientIp(request) });
  return json({ ok: true, action, module_key: key, task, event: event ?? null, event_error: eventError?.message ?? null }, action === 'create_followup_task' ? 201 : 200);
}
