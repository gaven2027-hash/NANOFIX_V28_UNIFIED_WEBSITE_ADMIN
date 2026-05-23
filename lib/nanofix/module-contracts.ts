export const SYSTEM_FOUNDATION_VERSION = "V28.4-unified-foundation";

export type ModuleStatus = "active" | "degraded" | "maintenance" | "disabled";
export type ModuleCriticality = "P0" | "P1" | "P2" | "P3";
export type DataSensitivity = "public" | "internal" | "confidential" | "restricted";

export type SystemModuleContract = {
  key: string;
  name: string;
  nameZh: string;
  category: "public_website" | "admin" | "operations" | "customer" | "ai" | "social" | "platform";
  deployTarget: "vercel_edge" | "vercel_node" | "supabase" | "external_service";
  criticality: ModuleCriticality;
  dataSensitivity: DataSensitivity;
  ownerRole: string;
  apiPrefixes: string[];
  databaseTables: string[];
  storageBuckets: string[];
  eventTopics: string[];
  dependencies: string[];
  canDegradeIndependently: boolean;
  degradationMode: string;
  healthChecks: string[];
  auditRequired: boolean;
};

export const systemModules: SystemModuleContract[] = [
  {
    key: "public-website",
    name: "Public Website",
    nameZh: "官网前台",
    category: "public_website",
    deployTarget: "vercel_edge",
    criticality: "P1",
    dataSensitivity: "public",
    ownerRole: "content_admin",
    apiPrefixes: ["/", "/en", "/zh", "/api/public-repair-request", "/api/public/repair-requests"],
    databaseTables: ["seo_routes", "cta_config", "unified_intake", "leads", "lead_attachments"],
    storageBuckets: ["lead-attachments"],
    eventTopics: ["website.public_repair_request", "website.content_published"],
    dependencies: ["data-core", "integration-bus"],
    canDegradeIndependently: true,
    degradationMode: "Static pages remain online; forms show safe fallback and queue outbox when admin webhook fails.",
    healthChecks: ["static-assets", "form-api", "seo-routes", "supabase-write"],
    auditRequired: true
  },
  {
    key: "central-admin",
    name: "Central Admin Backend",
    nameZh: "总管理后台",
    category: "admin",
    deployTarget: "vercel_node",
    criticality: "P0",
    dataSensitivity: "restricted",
    ownerRole: "super_admin",
    apiPrefixes: ["/admin", "/api/admin", "/api/system"],
    databaseTables: ["admin_profiles", "audit_logs", "search_logs", "module_health_events", "app_modules"],
    storageBuckets: [],
    eventTopics: ["admin.action", "admin.search", "module.health"],
    dependencies: ["data-core", "rbac-audit"],
    canDegradeIndependently: true,
    degradationMode: "Admin module cards stay visible with health warnings; write actions are blocked when role or database is not ready.",
    healthChecks: ["role-check", "audit-log-write", "module-registry", "global-search"],
    auditRequired: true
  },
  {
    key: "service-operations",
    name: "Service & Order Operations",
    nameZh: "业务订单运营",
    category: "operations",
    deployTarget: "vercel_node",
    criticality: "P0",
    dataSensitivity: "confidential",
    ownerRole: "operations_admin",
    apiPrefixes: ["/api/service-requests", "/api/admin/entity-events"],
    databaseTables: ["unified_intake", "leads", "service_requests", "site_inspections", "jobs", "quotations", "invoices", "payments", "warranties"],
    storageBuckets: ["lead-attachments", "job-media"],
    eventTopics: ["lead.created", "service_request.created", "job.updated", "quotation.approved", "invoice.issued"],
    dependencies: ["data-core", "customer-center", "integration-bus"],
    canDegradeIndependently: true,
    degradationMode: "Existing website and content stay online; failed operations events enter integration_outbox for retry.",
    healthChecks: ["workflow-state-machine", "priority-sla", "outbox-queue", "engineer-rls"],
    auditRequired: true
  },
  {
    key: "customer-center",
    name: "Customer Center & Portal",
    nameZh: "客户中心与会员门户",
    category: "customer",
    deployTarget: "vercel_node",
    criticality: "P1",
    dataSensitivity: "confidential",
    ownerRole: "operations_admin",
    apiPrefixes: ["/api/customer", "/api/portal"],
    databaseTables: ["customers", "customer_binding_suggestions", "portal_access_logs", "service_requests", "quotations", "invoices", "payments", "warranties"],
    storageBuckets: [],
    eventTopics: ["customer.registered", "customer.binding_suggested", "portal.viewed"],
    dependencies: ["data-core", "rbac-audit"],
    canDegradeIndependently: true,
    degradationMode: "Portal login can be paused while public repair intake remains open; admin binding queue remains review-only.",
    healthChecks: ["otp-policy", "customer-rls", "binding-suggestions", "portal-auth"],
    auditRequired: true
  },
  {
    key: "website-management",
    name: "Website Management",
    nameZh: "网站后台管理",
    category: "admin",
    deployTarget: "vercel_node",
    criticality: "P1",
    dataSensitivity: "internal",
    ownerRole: "content_admin",
    apiPrefixes: ["/admin/website", "/api/admin/website"],
    databaseTables: ["seo_routes", "cta_config", "website_pages", "website_publish_logs", "ai_drafts"],
    storageBuckets: ["website-media"],
    eventTopics: ["website.draft_created", "website.previewed", "website.published"],
    dependencies: ["data-core", "ai-center"],
    canDegradeIndependently: true,
    degradationMode: "Public website continues serving last published static build if CMS or AI draft flow fails.",
    healthChecks: ["draft-storage", "preview-render", "publish-audit", "schema-validation"],
    auditRequired: true
  },
  {
    key: "social-media",
    name: "Social Media Management",
    nameZh: "社媒管理中心",
    category: "social",
    deployTarget: "vercel_node",
    criticality: "P2",
    dataSensitivity: "confidential",
    ownerRole: "content_admin",
    apiPrefixes: ["/api/webhooks", "/api/admin/social"],
    databaseTables: ["inbound_events", "social_messages", "social_publish_drafts", "webhook_retry_jobs", "dead_letter_events"],
    storageBuckets: ["social-media"],
    eventTopics: ["social.inbound", "social.draft_created", "social.reviewed", "social.scheduled"],
    dependencies: ["integration-bus", "ai-center", "data-core"],
    canDegradeIndependently: true,
    degradationMode: "Website and operations remain normal; social events are accepted into retry queue/DLQ.",
    healthChecks: ["webhook-signature", "retry-queue", "dlq-count", "platform-token-expiry"],
    auditRequired: true
  },
  {
    key: "ai-center",
    name: "AI Intelligence Center",
    nameZh: "AI 智能中心",
    category: "ai",
    deployTarget: "vercel_node",
    criticality: "P2",
    dataSensitivity: "confidential",
    ownerRole: "super_admin",
    apiPrefixes: ["/admin/ai", "/api/admin/ai"],
    databaseTables: ["ai_drafts", "ai_logs", "ai_safety_rules", "ai_usage_costs"],
    storageBuckets: [],
    eventTopics: ["ai.draft_created", "ai.review_required", "ai.risk_blocked"],
    dependencies: ["data-core", "rbac-audit"],
    canDegradeIndependently: true,
    degradationMode: "AI suggestions stop; manual admin workflows remain available. AI never auto-publishes or auto-sends.",
    healthChecks: ["provider-key", "risk-policy", "review-queue", "cost-limit"],
    auditRequired: true
  },
  {
    key: "backup-download",
    name: "Backup & Download Center",
    nameZh: "备份与下载中心",
    category: "platform",
    deployTarget: "supabase",
    criticality: "P1",
    dataSensitivity: "restricted",
    ownerRole: "super_admin",
    apiPrefixes: ["/api/admin/backup-schedules"],
    databaseTables: ["backup_schedules", "backup_runs", "backup_files", "audit_logs"],
    storageBuckets: ["system-backups"],
    eventTopics: ["backup.scheduled", "backup.completed", "backup.failed", "backup.downloaded"],
    dependencies: ["data-core", "rbac-audit"],
    canDegradeIndependently: true,
    degradationMode: "Backup failures are isolated and create P1 alerts; daily admin and public website remain online.",
    healthChecks: ["schedule-validity", "signed-download", "retention-policy", "restore-log"],
    auditRequired: true
  },
  {
    key: "integration-bus",
    name: "Integration Bus & Outbox",
    nameZh: "集成事件总线与重试队列",
    category: "platform",
    deployTarget: "supabase",
    criticality: "P0",
    dataSensitivity: "internal",
    ownerRole: "super_admin",
    apiPrefixes: ["/api/webhooks", "/api/admin/entity-events"],
    databaseTables: ["integration_outbox", "entity_events", "inbound_events", "webhook_retry_jobs", "dead_letter_events"],
    storageBuckets: [],
    eventTopics: ["*.created", "*.updated", "*.failed", "*.dead_letter"],
    dependencies: ["data-core", "rbac-audit"],
    canDegradeIndependently: false,
    degradationMode: "When external integrations fail, events persist in outbox with retry and DLQ; no direct cross-module write coupling.",
    healthChecks: ["outbox-age", "dead-letter-count", "duplicate-event-key", "webhook-secret"],
    auditRequired: true
  },
  {
    key: "data-core",
    name: "Supabase Central Data Core",
    nameZh: "Supabase 统一数据中心",
    category: "platform",
    deployTarget: "supabase",
    criticality: "P0",
    dataSensitivity: "restricted",
    ownerRole: "super_admin",
    apiPrefixes: ["server-only"],
    databaseTables: ["admin_profiles", "audit_logs", "customers", "unified_intake", "leads", "service_requests", "app_modules"],
    storageBuckets: ["lead-attachments", "website-media", "system-backups"],
    eventTopics: ["data-core.health", "rls.policy.changed", "migration.applied"],
    dependencies: ["rbac-audit"],
    canDegradeIndependently: false,
    degradationMode: "If Supabase is unavailable, static website remains online; write actions return safe errors or queue where possible.",
    healthChecks: ["supabase-url", "service-role-server-only", "rls-enabled", "migration-version"],
    auditRequired: true
  },
  {
    key: "rbac-audit",
    name: "RBAC, RLS & Audit Layer",
    nameZh: "权限、RLS 与审计层",
    category: "platform",
    deployTarget: "supabase",
    criticality: "P0",
    dataSensitivity: "restricted",
    ownerRole: "super_admin",
    apiPrefixes: ["server-only"],
    databaseTables: ["admin_profiles", "audit_logs", "portal_access_logs"],
    storageBuckets: [],
    eventTopics: ["audit.logged", "permission.denied", "role.changed"],
    dependencies: ["data-core"],
    canDegradeIndependently: false,
    degradationMode: "Dangerous actions are denied when role cannot be verified; public website remains read-only.",
    healthChecks: ["role-resolution", "audit-write", "rls-policy", "secret-leak-check"],
    auditRequired: true
  }
];

export const defaultBackupSchedules = systemModules
  .filter((module) => module.auditRequired)
  .map((module, index) => ({
    module: module.key,
    frequency: module.criticality === "P0" ? "daily" : module.criticality === "P1" ? "daily" : "weekly",
    exact_run_time: `${String(2 + (index % 4)).padStart(2, "0")}:00`,
    timezone: "Asia/Singapore",
    retention_days: module.dataSensitivity === "restricted" ? 180 : 90,
    enabled: true
  }));

export function getModuleContract(key: string) {
  return systemModules.find((module) => module.key === key);
}

export function systemReadinessScore(env: Record<string, string | undefined>) {
  const checks = [
    Boolean(env.NEXT_PUBLIC_SITE_URL),
    Boolean(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL),
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    Boolean(env.ADMIN_REPAIR_REQUEST_URL) || env.ADMIN_WEBHOOK_ENABLED === "false",
    Boolean(env.NEXT_PUBLIC_MEMBER_PORTAL_URL),
    Boolean(env.CLOUDFLARE_TURNSTILE_SECRET_KEY) || env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === undefined
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}
