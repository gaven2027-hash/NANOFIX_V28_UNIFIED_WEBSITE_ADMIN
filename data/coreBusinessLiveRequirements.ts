export type CoreBusinessLiveStatus = 'live' | 'partial' | 'planned';

export type CoreBusinessLiveRequirement = {
  id: string;
  title: string;
  zh: string;
  route: string;
  currentStatus: CoreBusinessLiveStatus;
  targetStatus: 'live';
  requiredTables: string[];
  requiredApis: string[];
  requiredPanels: string[];
  requiredAuditActions: string[];
  productionDefinition: string;
  nextImplementationStep: string;
};

export const coreBusinessLiveRequirements: CoreBusinessLiveRequirement[] = [
  {
    id: 'core-service-requests',
    title: 'Service Requests Live CRUD',
    zh: '服务请求真实增删改查',
    route: '/service-operations#service-requests',
    currentStatus: 'partial',
    targetStatus: 'live',
    requiredTables: ['unified_intake', 'leads', 'service_requests', 'audit_logs', 'status_transition_logs'],
    requiredApis: ['/api/admin/service-operations/service-requests'],
    requiredPanels: ['ServiceOperationsServiceRequestsWorkspace'],
    requiredAuditActions: ['service_request_read', 'service_request_create', 'service_request_update', 'service_request_status_transition'],
    productionDefinition: 'Admin can list, search, create, update, assign and transition service requests through guarded server APIs with audit logs.',
    nextImplementationStep: 'Create dedicated service request API/workspace and replace generic contract rows for this submodule.'
  },
  {
    id: 'core-jobs',
    title: 'Jobs Live Operations',
    zh: '工单真实操作',
    route: '/service-operations#jobs',
    currentStatus: 'partial',
    targetStatus: 'live',
    requiredTables: ['jobs', 'service_requests', 'profiles', 'job_events', 'audit_logs', 'status_transition_logs'],
    requiredApis: ['/api/admin/service-operations/jobs'],
    requiredPanels: ['ServiceOperationsJobsWorkspace'],
    requiredAuditActions: ['job_read', 'job_create', 'job_assign', 'job_progress_update', 'job_status_transition'],
    productionDefinition: 'Admin can create jobs from service requests, assign staff, update progress and close jobs through audited APIs.',
    nextImplementationStep: 'Create job list/detail/update workspace and status transition API.'
  },
  {
    id: 'core-invoices',
    title: 'Invoices Live Control',
    zh: '发票真实控制',
    route: '/service-operations#invoices',
    currentStatus: 'partial',
    targetStatus: 'live',
    requiredTables: ['invoices', 'service_requests', 'customers', 'payments', 'audit_logs'],
    requiredApis: ['/api/admin/service-operations/invoices'],
    requiredPanels: ['ServiceOperationsInvoicesWorkspace'],
    requiredAuditActions: ['invoice_read', 'invoice_create', 'invoice_update', 'invoice_customer_visibility_update'],
    productionDefinition: 'Admin can list, create, update status and control customer-visible invoice records without client-side fake success.',
    nextImplementationStep: 'Promote existing invoice PDF and visibility panels into one live invoice workspace.'
  },
  {
    id: 'core-payments',
    title: 'Payments & Receipts Live Reconciliation',
    zh: '付款与收据真实对账',
    route: '/service-operations#payments',
    currentStatus: 'partial',
    targetStatus: 'live',
    requiredTables: ['payments', 'invoices', 'receipts', 'payment_events', 'audit_logs'],
    requiredApis: ['/api/admin/service-operations/payments', '/api/admin/payments/reconcile'],
    requiredPanels: ['ServiceOperationsPaymentsWorkspace'],
    requiredAuditActions: ['payment_read', 'payment_reconcile', 'receipt_issue', 'payment_status_update'],
    productionDefinition: 'Finance/Admin can reconcile payments, update payment status, issue receipts and audit every change.',
    nextImplementationStep: 'Unify checkout/payment intent/reconcile into a Finance-ready live workspace.'
  },
  {
    id: 'core-customer-center',
    title: 'Customer Center Live Management',
    zh: '客户中心真实管理',
    route: '/customer-center#customer-profiles',
    currentStatus: 'partial',
    targetStatus: 'live',
    requiredTables: ['customers', 'profiles', 'service_requests', 'quotations', 'invoices', 'payments', 'warranties', 'audit_logs'],
    requiredApis: ['/api/admin/customer-center/customers'],
    requiredPanels: ['CustomerCenterLiveManagementWorkspace'],
    requiredAuditActions: ['customer_read', 'customer_update', 'customer_bind_record', 'customer_access_control_update'],
    productionDefinition: 'Support/Admin can safely manage customer profiles, binding, access control and linked records with role checks and audit logs.',
    nextImplementationStep: 'Create permission-safe customer-center API and replace sensitive generic rows for customer profile/binding sections.'
  },
  {
    id: 'core-website-publish-approval',
    title: 'Website Publish Approval Live Flow',
    zh: '网站发布审批真实流程',
    route: '/website-management#publish-approval',
    currentStatus: 'partial',
    targetStatus: 'live',
    requiredTables: ['cms_blocks', 'content_drafts', 'media_assets', 'publish_requests', 'audit_logs'],
    requiredApis: ['/api/admin/cms/blocks', '/api/admin/website/publish-approval'],
    requiredPanels: ['WebsitePublishApprovalWorkspace'],
    requiredAuditActions: ['cms_draft_update', 'cms_publish_request', 'cms_publish_approve', 'cms_publish_reject'],
    productionDefinition: 'Website content changes are draft-first, previewed, approved and published with full audit history.',
    nextImplementationStep: 'Add publish request/approval API and connect Website Management publish approval section.'
  },
  {
    id: 'core-social-inbox',
    title: 'Social Inbox Live Lead Handling',
    zh: '社媒收件箱真实线索处理',
    route: '/social-media#unified-social-inbox',
    currentStatus: 'partial',
    targetStatus: 'live',
    requiredTables: ['social_accounts', 'social_messages', 'leads', 'unified_tasks', 'audit_logs'],
    requiredApis: ['/api/admin/social/messages'],
    requiredPanels: ['SocialInboxLiveWorkspace'],
    requiredAuditActions: ['social_message_read', 'social_message_reply_draft', 'social_message_convert_to_lead', 'social_message_transfer_to_human'],
    productionDefinition: 'Admin can read social messages, draft replies, transfer to human and convert messages to leads with approval/audit.',
    nextImplementationStep: 'Promote social messages API/panel into a real inbox-to-lead workspace.'
  }
];

export function coreBusinessSummary() {
  return coreBusinessLiveRequirements.reduce<Record<CoreBusinessLiveStatus, number>>((acc, item) => {
    acc[item.currentStatus] += 1;
    return acc;
  }, { live: 0, partial: 0, planned: 0 });
}
