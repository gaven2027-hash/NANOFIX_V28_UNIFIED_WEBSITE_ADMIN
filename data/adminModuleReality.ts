export type ModuleRealityStatus = 'live' | 'partial' | 'contract' | 'missing';
export type ModuleRisk = 'P0' | 'P1' | 'P2' | 'P3';

export type AdminModuleReality = {
  href: string;
  status: ModuleRealityStatus;
  risk: ModuleRisk;
  tables: string[];
  apis: string[];
  writeActions: string[];
  auditActions: string[];
  ownerRole: string;
  nextStep: string;
  evidence: string;
};

const liveWorkflow = {
  status: 'live' as const,
  risk: 'P1' as const,
  ownerRole: 'Operations Admin / Super Admin',
  evidence: 'V28.2 dedicated live workspace exists; reads/writes through server APIs and shows degraded/error state.'
};

const partialCore = {
  status: 'partial' as const,
  risk: 'P0' as const,
  ownerRole: 'Operations Admin / Super Admin',
  evidence: 'Menu and right-side panel exist, but full CRUD/write/audit workflow is not proven for every submodule.'
};

const contractGrowth = {
  status: 'contract' as const,
  risk: 'P2' as const,
  ownerRole: 'Module Owner / Super Admin',
  evidence: 'OA/ERP contract scaffold exists; production workflow requires dedicated API/table/audit implementation.'
};

const workflowTables = ['automation_rules', 'notification_outbox', 'internal_inbox_messages', 'unified_tasks', 'task_events', 'audit_logs'];
const workflowApis = ['/api/admin/automation-notifications', '/api/admin/internal-inbox', '/api/admin/unified-tasks', '/api/admin/workflow-audit'];

const serviceTables = ['leads', 'unified_intake', 'service_requests', 'jobs', 'quotations', 'invoices', 'payments', 'warranties', 'audit_logs'];
const cmsTables = ['cms_blocks', 'content_drafts', 'media_assets', 'unified_intake', 'audit_logs'];
const customerTables = ['customers', 'profiles', 'service_requests', 'quotations', 'invoices', 'payments', 'warranties', 'audit_logs'];
const systemTables = ['workflow_settings', 'profiles', 'role_permissions', 'backup_jobs', 'audit_logs'];

function entry(input: AdminModuleReality): AdminModuleReality { return input; }

export const adminModuleReality: AdminModuleReality[] = [
  entry({ href: '/admin#global-search', status: 'partial', risk: 'P1', tables: ['customers','leads','jobs','invoices','warranties','ai_logs','automation_rules','notification_outbox','internal_inbox_messages','unified_tasks','workflow_settings'], apis: ['/api/global-search'], writeActions: [], auditActions: ['global_search'], ownerRole: 'Super Admin / Operations Admin', nextStep: 'Verify search result permissions and add per-result access filtering tests.', evidence: 'Global Search API exists and includes workflow_settings fallback; full result-level permission audit still required.' }),
  entry({ href: '/admin#module-launch-board', ...partialCore, tables: ['app_modules','audit_logs'], apis: ['/api/system/modules'], writeActions: [], auditActions: ['module_open'], nextStep: 'Bind launch cards to real module health and permission state.' }),
  entry({ href: '/admin#recent-activity', ...partialCore, tables: ['audit_logs','entity_events'], apis: ['/api/admin/entity-events'], writeActions: [], auditActions: ['activity_read'], nextStep: 'Show real audit/entity events instead of summary-only display.' }),
  entry({ href: '/admin#my-pending-tasks', ...partialCore, tables: ['unified_tasks','internal_inbox_messages'], apis: ['/api/admin/unified-tasks','/api/admin/internal-inbox'], writeActions: ['update_task_status','acknowledge_message'], auditActions: ['task_update','internal_inbox_acknowledge'], nextStep: 'Use V28.2 task/inbox APIs for the home pending-task card.' }),
  entry({ href: '/admin#quick-create', status: 'contract', risk: 'P1', tables: ['unified_intake','leads','service_requests','unified_tasks'], apis: [], writeActions: ['create_lead','create_service_request','create_task'], auditActions: ['quick_create'], ownerRole: 'Operations Admin', nextStep: 'Create a guarded quick-create API before enabling this button as production write.' , evidence: 'Quick-create is a UI contract until dedicated write APIs are connected.'}),
  entry({ href: '/admin#system-shortcut-panel', ...partialCore, tables: ['app_modules','audit_logs'], apis: ['/api/system/health'], writeActions: [], auditActions: ['shortcut_open'], nextStep: 'Bind shortcuts to real module health and role permission state.' }),

  entry({ href: '/dashboard#automation-notification-engine', ...liveWorkflow, tables: ['automation_rules','notification_outbox','audit_logs'], apis: ['/api/admin/automation-notifications'], writeActions: ['queue_notification'], auditActions: ['automation_rule_create','notification_queue_create'], nextStep: 'Run staging auth/session smoke and verify Supabase writes.' }),
  entry({ href: '/dashboard#internal-inbox', ...liveWorkflow, tables: ['internal_inbox_messages','unified_tasks','audit_logs'], apis: ['/api/admin/internal-inbox'], writeActions: ['acknowledge_message','archive_message','create_task'], auditActions: ['internal_inbox_acknowledge','internal_inbox_archive'], nextStep: 'Run staging role-based inbox visibility tests.' }),
  entry({ href: '/dashboard#unified-task-engine', ...liveWorkflow, tables: ['unified_tasks','task_events','audit_logs'], apis: ['/api/admin/unified-tasks'], writeActions: ['create_task','update_task_status'], auditActions: ['unified_task_create','unified_task_update'], nextStep: 'Run staging task status and SLA transition tests.' }),
  entry({ href: '/dashboard#executive-overview', ...partialCore, tables: ['dashboard_snapshots','app_modules','audit_logs'], apis: ['/api/ready','/api/system/health'], writeActions: [], auditActions: ['dashboard_read'], nextStep: 'Replace summary cards with real aggregate API.' }),
  entry({ href: '/dashboard#urgent-action-queue', ...partialCore, tables: ['unified_tasks','internal_inbox_messages'], apis: ['/api/admin/unified-tasks','/api/admin/internal-inbox'], writeActions: ['assign_owner','update_status'], auditActions: ['task_update'], nextStep: 'Use live task/inbox filters instead of generic rows.' }),
  ...['cross-module-alerts','intake-lead-summary','revenue-finance-summary','operations-summary','channel-performance-snapshot','approval-center-summary','system-health-summary'].map((anchor) => entry({ href: `/dashboard#${anchor}`, status: 'partial' as const, risk: 'P1' as const, tables: ['unified_tasks','audit_logs','app_modules'], apis: ['/api/ready','/api/system/health'], writeActions: [], auditActions: ['dashboard_summary_read'], ownerRole: 'Super Admin', nextStep: 'Create dedicated aggregate API and replace contract rows.', evidence: 'Dashboard summary entry exists but complete live aggregate binding is not proven.' })),

  ...['leads','service-requests','inspection-scheduling','inspections','quotations','quotation-approval','jobs','work-execution','engineer-assignment','progress-updates','invoices','payments','receipts','warranty-records','warranty-generation-rules','rework','status-flow-logs','super-admin-takeover-override'].map((anchor) => entry({ href: `/service-operations#${anchor}`, ...partialCore, tables: serviceTables, apis: ['/api/admin/service-operations or module-specific API'], writeActions: ['create_or_update_record','transition_status'], auditActions: ['service_operation_write','status_transition'], nextStep: 'Build dedicated list/create/update/status API, live UI binding and Audit Logs for this submodule.' })),

  ...['navigation-menu','homepage-content','customer-review-carousel','page-content','service-page-content','service-testimonials-block','track-record-warranty-content','client-testimonials-display','guide-library','faq-tips','seo-aeo-library','ai-website-content-generator','forms-public-submission','public-form-submissions','public-upload-review','website-organic-leads','website-paid-landing-leads','media-library','preview','publish-approval','version-history','website-leads-analytics'].map((anchor) => entry({ href: `/website-management#${anchor}`, status: 'partial' as const, risk: 'P1' as const, tables: cmsTables, apis: ['/api/admin/cms/blocks or module-specific API'], writeActions: ['edit_draft','preview','publish_request'], auditActions: ['cms_draft_update','cms_publish_approval'], ownerRole: 'Content Admin / Super Admin', nextStep: 'Connect each CMS submodule to real table/API, preview and publish audit workflow.', evidence: 'CMS foundation exists, but every second-level content/publish workflow still needs proof.' })),

  ...['social-accounts','google-business-profile','unified-social-inbox','whatsapp-ai-reply','transfer-to-human','live-chat-webhook-collector','review-comment-management','google-facebook-review-import','organic-social-leads','social-organic-conversion','ai-social-content-studio','multi-platform-preview-review','schedule-publish-approval','campaign-posting-queue','social-logs','social-performance'].map((anchor) => entry({ href: `/social-media#${anchor}`, ...contractGrowth, tables: ['social_accounts','social_messages','social_content_drafts','audit_logs'], apis: ['/api/admin/social/messages or platform-specific API'], writeActions: ['draft_reply','approve_content','schedule_post'], auditActions: ['social_action_audit'], nextStep: 'Verify platform API binding, human approval and publish logs before enabling production sends.' })),

  ...['campaign-dashboard','campaign-planning','create-campaign-draft','csv-excel-import','roi-insights-alerts','creatives-copy','budgets-strategy','approval-gates','ad-account-connections','paid-social-ads','google-ads','utm-landing-pages','click-to-whatsapp-ads','paid-lead-attribution','roi-comparison','daily-spend-review','finance-review','super-admin-takeover','ad-logs'].map((anchor) => entry({ href: `/admin/advertising-center#${anchor}`, ...contractGrowth, tables: ['ad_campaigns','ad_performance_daily','ad_budget_requests','audit_logs'], apis: ['/api/admin/advertising-center or submodule API'], writeActions: ['import_spend','review_budget','approve_campaign'], auditActions: ['ad_center_action'], nextStep: 'Connect real ad spend import, ROI calculations and finance review before production use.' })),

  ...['global-web-search','ai-website-assistant','ai-social-assistant','ai-conversation-intelligence','lead-discovery-scoring','ai-attribution-assistant','ai-review-moderation-assist','ai-privacy-redaction-assist','ai-rules','ai-api-settings','ai-analysis-logs','ai-alerts','material-ai-suggestions','usage-cost','quotation-ai-assist','invoice-ai-assist','prompt-safety-audit'].map((anchor) => entry({ href: `/ai-intelligence#${anchor}`, ...contractGrowth, tables: ['ai_logs','content_drafts','review_redaction_queue','audit_logs'], apis: ['/api/admin/ai-intelligence or module-specific API'], writeActions: ['create_ai_draft','regenerate_suggestion','approve_ai_output'], auditActions: ['ai_prompt_audit','ai_output_review'], nextStep: 'Keep AI output draft-only until review, cost, safety and audit APIs are verified.' })),

  ...['customer-list','customer-profiles','customer-360-timeline','pending-customer-binding','binding-review-merge','customer-binding-rules','data-matching-rules','lead-source-history','repair-tracking','customer-quotes','customer-invoices','customer-payments-receipts','customer-warranty-records','customer-portal-management','customer-submit-review','my-reviews-management','review-privacy-settings','testimonials-reviews','review-approval-privacy-redaction','review-display-locations','review-archive','review-deletion-audit','consent-pdpa-log','pdpa-privacy-requests','customer-access-control'].map((anchor) => entry({ href: `/customer-center#${anchor}`, status: 'partial' as const, risk: 'P0' as const, tables: customerTables, apis: ['/api/admin/customer-center or module-specific API'], writeActions: ['update_customer','bind_record','review_privacy_action'], auditActions: ['customer_record_update','pdpa_audit','review_privacy_audit'], ownerRole: 'Support / Super Admin', nextStep: 'Build dedicated permission-safe CRUD, privacy and audit workflows; verify customer cannot access internal admin data.', evidence: 'Customer Center contains sensitive data and privacy workflows; menu exists but full live permission/audit chain is not proven.' })),

  entry({ href: '/system-settings#automation-rule-settings', status: 'live', risk: 'P1', tables: ['workflow_settings','audit_logs'], apis: ['/api/admin/workflow-settings'], writeActions: ['toggle_setting','update_setting_json'], auditActions: ['workflow_setting_update'], ownerRole: 'Super Admin / Operations Admin', nextStep: 'Run staging patch test and verify Audit Logs.', evidence: 'WorkflowSettingsWorkspace reads and patches workflow_settings.' }),
  entry({ href: '/system-settings#notification-channel-settings', status: 'live', risk: 'P1', tables: ['workflow_settings','audit_logs'], apis: ['/api/admin/workflow-settings'], writeActions: ['toggle_notification_channel'], auditActions: ['workflow_setting_update'], ownerRole: 'Super Admin / Operations Admin', nextStep: 'Verify channel retry/ack values in staging.', evidence: 'WorkflowSettingsWorkspace includes notification_channel settings.' }),
  entry({ href: '/system-settings#unified-task-sla-settings', status: 'live', risk: 'P1', tables: ['workflow_settings','audit_logs'], apis: ['/api/admin/workflow-settings'], writeActions: ['toggle_sla_setting'], auditActions: ['workflow_setting_update'], ownerRole: 'Super Admin / Operations Admin', nextStep: 'Verify SLA setting changes are reflected in task creation/escalation workers.', evidence: 'WorkflowSettingsWorkspace includes unified_task_sla settings.' }),
  entry({ href: '/system-settings#backup-download-center', status: 'partial', risk: 'P0', tables: ['backup_jobs','audit_logs'], apis: ['/api/admin/backups/jobs'], writeActions: ['create_backup_job','download_backup'], auditActions: ['backup_job_create','backup_download'], ownerRole: 'Super Admin', nextStep: 'Run encrypted backup/restore drill and signed-link permissions test.', evidence: 'Backup component/API exists, but production restore drill must still pass.' }),
  ...['company-settings','logo-brand-assets','admin-login-branding','customer-portal-login-branding','internal-staff-login-registration','customer-portal-login-registration','api-integrations','supabase-settings','github-vercel-deployment-settings','search-settings','role-groups-permissions','admin-accounts','admin-registration-review','super-admin-override-rules','qr-backend-management','attribution-rules','public-api-monitor','no-login-repair-intake-security','review-privacy-publishing-rules','public-display-consent-rules','review-archive-deletion-rules','audit-logs','health-checks','error-boundaries-module-isolation','security-settings'].map((anchor) => entry({ href: `/system-settings#${anchor}`, status: 'partial' as const, risk: anchor.includes('security') || anchor.includes('login') || anchor.includes('admin') ? 'P0' as const : 'P1' as const, tables: systemTables, apis: ['/api/admin/system-settings or module-specific API'], writeActions: ['update_setting'], auditActions: ['system_setting_update'], ownerRole: 'Super Admin', nextStep: 'Connect this settings section to a dedicated validated API and Audit Logs before production edits.', evidence: 'System Settings menu exists; only V28.2 workflow settings are confirmed live.' }))
];

const realityByHref = new Map(adminModuleReality.map((item) => [item.href, item]));

export function getAdminModuleReality(href: string): AdminModuleReality | null {
  return realityByHref.get(href) ?? null;
}

export function getAdminModuleRealitySummary() {
  return adminModuleReality.reduce<Record<ModuleRealityStatus, number>>((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, { live: 0, partial: 0, contract: 0, missing: 0 });
}
