import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const requiredFiles = [
  "app/page.tsx",
  "app/admin/page.tsx",
  "app/dashboard/page.tsx",
  "app/system-settings/page.tsx",
  "app/api/health/route.ts",
  "app/api/ready/route.ts",
  "app/api/public-repair-request/route.ts",
  "app/api/customer/register/route.ts",
  "app/api/portal/repair-tracking/route.ts",
  "app/api/admin/search/route.ts",
  "app/api/admin/global-search/route.ts",
  "app/api/global-search/route.ts",
  "app/api/admin/module-health/route.ts",
  "app/api/admin/entity-events/route.ts",
  "app/api/admin/cms/blocks/route.ts",
  "app/api/admin/backups/jobs/route.ts",
  "app/api/admin/payments/reconcile/route.ts",
  "app/api/admin/social/messages/route.ts",
  "app/api/admin/warranties/issue/route.ts",
  "app/api/admin/automation-notifications/route.ts",
  "app/api/admin/internal-inbox/route.ts",
  "app/api/admin/unified-tasks/route.ts",
  "app/api/admin/workflow-audit/route.ts",
  "app/api/admin/workflow-settings/route.ts",
  "app/api/system/health/route.ts",
  "app/api/system/modules/route.ts",
  "app/api/system/module-health-worker/route.ts",
  "app/api/cms/blocks/route.ts",
  "app/error.tsx",
  "middleware.ts",
  "components/AutomationNotificationWorkspace.tsx",
  "components/WorkflowAuditTrail.tsx",
  "components/WorkflowSettingsWorkspace.tsx",
  "lib/nanofix/seo.ts",
  "lib/nanofix/security.ts",
  "lib/nanofix/rbac.ts",
  "lib/nanofix/module-contracts.ts",
  "lib/nanofix/system-events.ts",
  "data/admin_backend_seed.json",
  "docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md",
  "docs/NANOFIX_V28_2_FINAL_DEPLOYMENT_RUNBOOK_20260529.md",
  "tools/e2e-smoke.mjs",
  "tools/deploy-readiness-check.mjs",
  "tools/static-v28-2-issue-scan.mjs",
  "tools/verify-v28-2-workflow-engine.mjs",
  "supabase/seed/20260522_central_admin_seed.sql",
  "supabase/seed/20260529_v28_2_workflow_engine_seed.sql",
  "supabase/migrations/20260521_central_admin_backend.sql",
  "supabase/migrations/20260522_v28_enhancements.sql",
  "supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql",
  "supabase/migrations/20260523_v28_production_hardening.sql",
  "supabase/migrations/202605290001_v28_2_automation_inbox_task_engine.sql",
  "supabase/migrations/202605290002_v28_2_workflow_settings.sql"
];

const bodyFiles = ["lib/legacy/body.html", "lib/legacy/body.en.html", "lib/legacy/body.zh.html"];
const stableMapNeedle = "https://www.google.com/maps?q=16%20Raffles%20Quay%2C%20Hong%20Leong%20Building%2C%20Singapore%20048581&output=embed";

function exists(file) {
  return fs.existsSync(path.join(projectRoot, file));
}

function read(file) {
  return fs.readFileSync(path.join(projectRoot, file), "utf8");
}

const missing = requiredFiles.filter((file) => !exists(file));
const mapChecks = bodyFiles.map((file) => {
  const text = fs.readFileSync(path.join(projectRoot, file), "utf8");
  return {
    file,
    stable_map_iframes: (text.match(new RegExp(stableMapNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length,
    old_pb_embed_iframes: (text.match(/maps\/embed\?pb=/g) || []).length,
    eager_iframes: (text.match(/loading="eager"/g) || []).length
  };
});

const seoText = read("lib/nanofix/seo.ts");
const sitemapText = read("public/sitemap.xml");
const layoutText = read("app/layout.tsx");
const middlewareText = read("middleware.ts");
const rbacText = read("lib/nanofix/rbac.ts");
const authText = read("lib/nanofix/auth.ts");
const productionHardeningSql = read("supabase/migrations/20260523_v28_production_hardening.sql");
const schemaBridgeSql = read("supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql");
const workflowSql = read("supabase/migrations/202605290001_v28_2_automation_inbox_task_engine.sql");
const workflowSettingsSql = read("supabase/migrations/202605290002_v28_2_workflow_settings.sql");
const legacyPageText = read("components/LegacyWebsitePage.tsx");
const dashboardText = read("app/dashboard/page.tsx");
const systemSettingsText = read("app/system-settings/page.tsx");
const workflowWorkspaceText = read("components/AutomationNotificationWorkspace.tsx");
const auditTrailText = read("components/WorkflowAuditTrail.tsx");
const settingsWorkspaceText = read("components/WorkflowSettingsWorkspace.tsx");
const workflowAuditApiText = read("app/api/admin/workflow-audit/route.ts");
const workflowSettingsApiText = read("app/api/admin/workflow-settings/route.ts");
const globalSearchText = read("app/api/global-search/route.ts");
const readyRouteText = read("app/api/ready/route.ts");
const e2eSmokeText = read("tools/e2e-smoke.mjs");
const staticScanText = read("tools/static-v28-2-issue-scan.mjs");
const masterMemoryText = read("docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md");
const runbookText = read("docs/NANOFIX_V28_2_FINAL_DEPLOYMENT_RUNBOOK_20260529.md");

const chainChecks = {
  public_to_admin_paths: ["/admin", "/member-sign-up-login", "/api/public-repair-request", "/api/customer/register"],
  admin_api_protection: middlewareText.includes("/api/admin/:path*") && middlewareText.includes("x-nanofix-auth-verified"),
  verified_middleware_rbac: rbacText.includes("getAdminContext") && authText.includes("x-nanofix-auth-verified"),
  admin_token_fallback_disabled_by_default: middlewareText.includes('NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED !== "true"'),
  transactional_status_rpc: schemaBridgeSql.includes("transition_status_tx") && schemaBridgeSql.includes("revoke execute on function public.transition_status_tx"),
  cg_hardening_rpc_restricted: productionHardeningSql.includes("record_payment_and_reconcile") && productionHardeningSql.includes("revoke execute on function public.record_payment_and_reconcile"),
  cms_runtime_and_api_present: exists("app/api/cms/blocks/route.ts") && legacyPageText.includes("nanofix-cms-published-overrides"),
  encrypted_backup_job_present: exists("app/api/admin/backups/jobs/route.ts") && read("app/api/admin/backups/jobs/route.ts").includes("aes-256-gcm"),
  module_worker_cron_present: exists("app/api/system/module-health-worker/route.ts") && read("vercel.json").includes("/api/system/module-health-worker"),
  seo_routes_present: (seoText.match(/path:/g) || []).length >= 20,
  sitemap_hreflang: sitemapText.includes("hreflang=\"en-SG\"") && sitemapText.includes("hreflang=\"zh-SG\"") && layoutText.includes("hrefLang=\"en-sg\"") && layoutText.includes("hrefLang=\"zh-sg\"")
};

const securityChecks = {
  middleware_present: exists("middleware.ts"),
  security_module_present: exists("lib/nanofix/security.ts"),
  admin_rbac_present: exists("lib/nanofix/rbac.ts"),
  public_form_rate_limit_present: read("lib/public-repair-request.ts").includes("checkSupabaseRateLimit"),
  upload_magic_byte_validation_present: read("lib/public-repair-request.ts").includes("detectMime"),
  no_client_role_header_trust: middlewareText.includes("headers.delete(key)") && middlewareText.includes("x-nanofix-role") && middlewareText.includes("x-admin-role"),
  no_service_request_public_write: read("app/api/service-requests/route.ts").includes("requireAdmin"),
  backup_requires_encryption_key: read("app/api/admin/backups/jobs/route.ts").includes("NANOFIX_BACKUP_ENCRYPTION_KEY")
};

const v282WorkflowChecks = {
  master_memory_is_current_basis: masterMemoryText.includes("Use this file as the single project memory reference") && masterMemoryText.includes("Automation & Notification Engine → Internal Inbox → Unified Task Engine"),
  final_runbook_present: runbookText.includes("NANOFIX V28.2 Final Deployment Runbook") && runbookText.includes("Final go/no-go checklist") && runbookText.includes("Rollback plan"),
  dashboard_renders_workflow_workspace: dashboardText.includes("AutomationNotificationWorkspace"),
  system_settings_renders_settings_workspace: systemSettingsText.includes("WorkflowSettingsWorkspace") && !systemSettingsText.includes("AutomationNotificationWorkspace"),
  live_read_apis_bound: ["/api/admin/automation-notifications", "/api/admin/internal-inbox", "/api/admin/unified-tasks"].every((marker) => workflowWorkspaceText.includes(marker)),
  live_write_apis_bound: ["writeApi", "POST", "PATCH", "acknowledgeInboxMessage", "createTaskFromInbox", "advanceTask", "queueNotification"].every((marker) => workflowWorkspaceText.includes(marker)),
  demo_rows_not_writable: workflowWorkspaceText.includes("Demo rows cannot be acknowledged") && workflowWorkspaceText.includes("Demo rows cannot be updated"),
  no_browser_storage_workflow_state: !/localStorage|sessionStorage/.test(workflowWorkspaceText + auditTrailText + settingsWorkspaceText),
  audit_trail_ui_bound: auditTrailText.includes("/api/admin/workflow-audit?limit=12") && auditTrailText.includes("task_events") && auditTrailText.includes("audit_logs") && auditTrailText.includes("notification_delivery"),
  audit_api_explicit_fields_and_audited: workflowAuditApiText.includes("workflow_audit_trail_read") && workflowAuditApiText.includes("writeAuditLog") && !/select\(['"]\*['"]\)/.test(workflowAuditApiText),
  settings_ui_bound: settingsWorkspaceText.includes("/api/admin/workflow-settings") && settingsWorkspaceText.includes("automation_rule_setting") && settingsWorkspaceText.includes("notification_channel") && settingsWorkspaceText.includes("unified_task_sla") && settingsWorkspaceText.includes("PATCH"),
  settings_api_explicit_fields_and_audited: workflowSettingsApiText.includes("workflow_settings_read") && workflowSettingsApiText.includes("workflow_setting_upsert") && workflowSettingsApiText.includes("workflow_setting_update") && workflowSettingsApiText.includes("writeAuditLog") && !/select\(['"]\*['"]\)/.test(workflowSettingsApiText),
  workflow_tables_exist_in_migrations: ["automation_rules", "notification_outbox", "internal_inbox_messages", "unified_tasks", "task_events", "workflow_settings"].every((table) => (workflowSql + workflowSettingsSql).includes(`public.${table}`)),
  workflow_settings_defaults_exist: ["notification.channel.internal.default", "unified_task.sla.p0.repair_triage", "automation.rules.safe_write_policy"].every((marker) => workflowSettingsSql.includes(marker)),
  ready_checks_workflow_settings: ["automation_rules", "notification_outbox", "internal_inbox_messages", "unified_tasks", "task_events", "workflow_settings"].every((table) => readyRouteText.includes(table)),
  global_search_includes_workflow_settings: ["workflow_settings", "workflowSettingHref", "/system-settings#automation-rule-settings", "/system-settings#notification-channel-settings", "/system-settings#unified-task-sla-settings", "mergeResults", "rpc_result_count", "fallback_result_count"].every((marker) => globalSearchText.includes(marker)),
  e2e_smoke_covers_settings_audit: ["/api/admin/workflow-audit", "/api/admin/workflow-settings", "workflow_settings", "checkStaticV282SettingsSearchMarkers"].every((marker) => e2eSmokeText.includes(marker)),
  static_scan_present_and_guarding: ["Supabase select", "localStorage", "sessionStorage", "Admin API route", "workflow_settings", "Conflicting stale memory file"].every((marker) => staticScanText.includes(marker))
};

const report = {
  ok:
    missing.length === 0 &&
    mapChecks.every((check) => check.stable_map_iframes >= 2 && check.old_pb_embed_iframes === 0) &&
    Object.values(chainChecks).every(Boolean) &&
    Object.values(securityChecks).every(Boolean) &&
    Object.values(v282WorkflowChecks).every(Boolean),
  generated_at: new Date().toISOString(),
  package: "NANOFIX V28.2 Automation Inbox Task Engine Final Preflight",
  missing_required_files: missing,
  map_checks: mapChecks,
  chain_checks: chainChecks,
  security_checks: securityChecks,
  v28_2_workflow_checks: v282WorkflowChecks
};

fs.writeFileSync(path.join(projectRoot, "VALIDATION_REPORT_V28.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exitCode = 1;
