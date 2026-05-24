export type OperationModuleKey =
  | 'leads'
  | 'service-requests'
  | 'bookings'
  | 'inspections'
  | 'quotations'
  | 'jobs'
  | 'invoices'
  | 'payments'
  | 'warranties';

export type OperationField = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'uuid';
  required?: boolean;
  readOnly?: boolean;
  options?: string[];
  placeholder?: string;
};

export type OperationModuleConfig = {
  key: OperationModuleKey;
  title: string;
  zh: string;
  table: string;
  objectType: string;
  primaryKey: string;
  route: string;
  permission: string;
  columns: string[];
  searchFields: string[];
  statusOptions: string[];
  formFields: OperationField[];
  summaryFields: string[];
  boardLane: 'Lead' | 'Inspection' | 'Quotation' | 'Work Execution' | 'Finance' | 'Warranty';
};

const priorityOptions = ['P0', 'P1', 'P2', 'P3'];
const bindingOptions = ['pending', 'linked', 'unlinked'];

export const operationModules: OperationModuleConfig[] = [
  {
    key: 'leads',
    title: 'Leads',
    zh: '线索',
    table: 'leads',
    objectType: 'lead',
    primaryKey: 'lead_id',
    route: '/service-operations/leads',
    permission: 'write:operations',
    columns: ['lead_id', 'intake_id', 'customer_id', 'name', 'phone', 'email', 'address', 'address_text', 'issue_type', 'message', 'source_platform', 'binding_status', 'priority', 'urgency_score', 'status', 'owner_id', 'created_at', 'updated_at'],
    searchFields: ['name', 'phone', 'email', 'address', 'address_text', 'issue_type', 'message', 'source_platform'],
    statusOptions: ['new', 'qualified', 'converted', 'duplicate', 'lost', 'archived'],
    formFields: [
      { name: 'name', label: 'Name / 姓名', required: true },
      { name: 'phone', label: 'Phone / 电话' },
      { name: 'email', label: 'Email / 邮箱' },
      { name: 'address', label: 'Address / 地址' },
      { name: 'issue_type', label: 'Issue Type / 问题类型' },
      { name: 'message', label: 'Message / 备注', type: 'textarea' },
      { name: 'source_platform', label: 'Source Platform / 来源', placeholder: 'manual' },
      { name: 'priority', label: 'Priority / 优先级', type: 'select', options: priorityOptions },
      { name: 'binding_status', label: 'Binding Status / 绑定状态', type: 'select', options: bindingOptions }
    ],
    summaryFields: ['name', 'phone', 'issue_type', 'priority', 'status', 'source_platform', 'created_at'],
    boardLane: 'Lead'
  },
  {
    key: 'service-requests',
    title: 'Service Requests',
    zh: '服务请求 / 报修单',
    table: 'service_requests',
    objectType: 'service_request',
    primaryKey: 'service_request_id',
    route: '/service-operations/service-requests',
    permission: 'write:operations',
    columns: ['service_request_id', 'intake_id', 'lead_id', 'customer_id', 'contact_name', 'phone', 'whatsapp', 'email', 'issue_type', 'issue_description', 'leak_location', 'address_text', 'property_address', 'postal_code', 'property_type', 'preferred_time_text', 'binding_status', 'priority', 'source_platform', 'status', 'created_at', 'updated_at', 'admin_approval_required'],
    searchFields: ['contact_name', 'phone', 'whatsapp', 'email', 'issue_type', 'issue_description', 'address_text', 'property_address', 'postal_code'],
    statusOptions: ['pending_review', 'scheduled', 'inspected', 'quoted', 'approved', 'cancelled'],
    formFields: [
      { name: 'contact_name', label: 'Contact Name / 联系人' },
      { name: 'phone', label: 'Phone / 电话' },
      { name: 'whatsapp', label: 'WhatsApp' },
      { name: 'email', label: 'Email / 邮箱' },
      { name: 'issue_type', label: 'Issue Type / 问题类型', required: true },
      { name: 'issue_description', label: 'Issue Description / 问题描述', type: 'textarea' },
      { name: 'address_text', label: 'Address / 地址' },
      { name: 'postal_code', label: 'Postal Code / 邮编' },
      { name: 'priority', label: 'Priority / 优先级', type: 'select', options: priorityOptions },
      { name: 'binding_status', label: 'Binding Status / 绑定状态', type: 'select', options: bindingOptions },
      { name: 'source_platform', label: 'Source Platform / 来源', placeholder: 'manual' }
    ],
    summaryFields: ['contact_name', 'phone', 'issue_type', 'priority', 'status', 'binding_status', 'created_at'],
    boardLane: 'Lead'
  },
  {
    key: 'bookings',
    title: 'Bookings',
    zh: '预约',
    table: 'bookings',
    objectType: 'booking',
    primaryKey: 'booking_id',
    route: '/service-operations/bookings',
    permission: 'write:operations',
    columns: ['booking_id', 'service_request_id', 'customer_id', 'booking_type', 'scheduled_at', 'status', 'notes', 'created_at', 'updated_at'],
    searchFields: ['booking_type', 'notes'],
    statusOptions: ['pending', 'confirmed', 'assigned', 'completed', 'rescheduled', 'cancelled', 'no_show'],
    formFields: [
      { name: 'service_request_id', label: 'Service Request ID / 报修单ID', type: 'uuid' },
      { name: 'customer_id', label: 'Customer ID / 客户ID', type: 'uuid' },
      { name: 'booking_type', label: 'Booking Type / 预约类型', type: 'select', options: ['site_inspection', 'repair_work', 'follow_up', 'warranty_claim', 'other'] },
      { name: 'scheduled_at', label: 'Scheduled At / 预约时间', type: 'datetime-local' },
      { name: 'notes', label: 'Notes / 备注', type: 'textarea' }
    ],
    summaryFields: ['booking_type', 'scheduled_at', 'status', 'notes', 'created_at'],
    boardLane: 'Inspection'
  },
  {
    key: 'inspections',
    title: 'Inspections',
    zh: '查验',
    table: 'inspections',
    objectType: 'inspection',
    primaryKey: 'inspection_id',
    route: '/service-operations/inspections',
    permission: 'write:operations',
    columns: ['inspection_id', 'service_request_id', 'engineer_id', 'scheduled_at', 'checklist_json', 'photo_paths', 'status', 'created_at'],
    searchFields: ['status'],
    statusOptions: ['scheduled', 'assigned', 'in_progress', 'completed', 'rescheduled', 'cancelled'],
    formFields: [
      { name: 'service_request_id', label: 'Service Request ID / 报修单ID', type: 'uuid', required: true },
      { name: 'engineer_id', label: 'Engineer ID / 工程师ID', type: 'uuid' },
      { name: 'scheduled_at', label: 'Scheduled At / 查验时间', type: 'datetime-local' }
    ],
    summaryFields: ['service_request_id', 'engineer_id', 'scheduled_at', 'status', 'created_at'],
    boardLane: 'Inspection'
  },
  {
    key: 'quotations',
    title: 'Quotations',
    zh: '报价',
    table: 'quotations',
    objectType: 'quotation',
    primaryKey: 'quotation_id',
    route: '/service-operations/quotations',
    permission: 'write:finance',
    columns: ['quotation_id', 'service_request_id', 'customer_id', 'version', 'total_amount', 'currency', 'valid_until', 'status', 'approved_by', 'created_at', 'updated_at'],
    searchFields: ['currency', 'status'],
    statusOptions: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised', 'cancelled'],
    formFields: [
      { name: 'service_request_id', label: 'Service Request ID / 报修单ID', type: 'uuid' },
      { name: 'customer_id', label: 'Customer ID / 客户ID', type: 'uuid' },
      { name: 'version', label: 'Version / 版本', type: 'number' },
      { name: 'total_amount', label: 'Total Amount / 总额', type: 'number' },
      { name: 'currency', label: 'Currency / 币种', placeholder: 'SGD' },
      { name: 'valid_until', label: 'Valid Until / 有效期', type: 'date' }
    ],
    summaryFields: ['version', 'total_amount', 'currency', 'valid_until', 'status', 'created_at'],
    boardLane: 'Quotation'
  },
  {
    key: 'jobs',
    title: 'Jobs / Work Execution',
    zh: '工单 / 施工执行',
    table: 'jobs',
    objectType: 'job',
    primaryKey: 'job_id',
    route: '/service-operations/jobs',
    permission: 'write:operations',
    columns: ['job_id', 'service_request_id', 'quotation_id', 'engineer_id', 'scheduled_at', 'status', 'completion_notes', 'notes', 'eta_json', 'created_at', 'updated_at'],
    searchFields: ['completion_notes', 'notes', 'status'],
    statusOptions: ['assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'rework_required', 'cancelled'],
    formFields: [
      { name: 'service_request_id', label: 'Service Request ID / 报修单ID', type: 'uuid' },
      { name: 'quotation_id', label: 'Quotation ID / 报价ID', type: 'uuid' },
      { name: 'engineer_id', label: 'Engineer ID / 工程师ID', type: 'uuid' },
      { name: 'scheduled_at', label: 'Scheduled At / 施工时间', type: 'datetime-local' },
      { name: 'notes', label: 'Notes / 备注', type: 'textarea' },
      { name: 'completion_notes', label: 'Completion Notes / 完工备注', type: 'textarea' }
    ],
    summaryFields: ['service_request_id', 'engineer_id', 'scheduled_at', 'status', 'created_at'],
    boardLane: 'Work Execution'
  },
  {
    key: 'invoices',
    title: 'Invoices',
    zh: '发票',
    table: 'invoices',
    objectType: 'invoice',
    primaryKey: 'invoice_id',
    route: '/service-operations/invoices',
    permission: 'write:finance',
    columns: ['invoice_id', 'invoice_no', 'customer_id', 'job_id', 'total_amount', 'currency', 'due_date', 'status', 'created_at'],
    searchFields: ['invoice_no', 'currency', 'status'],
    statusOptions: ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void'],
    formFields: [
      { name: 'invoice_no', label: 'Invoice No. / 发票号', required: true },
      { name: 'customer_id', label: 'Customer ID / 客户ID', type: 'uuid' },
      { name: 'job_id', label: 'Job ID / 工单ID', type: 'uuid' },
      { name: 'total_amount', label: 'Total Amount / 总额', type: 'number' },
      { name: 'currency', label: 'Currency / 币种', placeholder: 'SGD' },
      { name: 'due_date', label: 'Due Date / 到期日', type: 'date' }
    ],
    summaryFields: ['invoice_no', 'total_amount', 'currency', 'due_date', 'status', 'created_at'],
    boardLane: 'Finance'
  },
  {
    key: 'payments',
    title: 'Payments',
    zh: '付款',
    table: 'payments',
    objectType: 'payment',
    primaryKey: 'payment_id',
    route: '/service-operations/payments',
    permission: 'write:finance',
    columns: ['payment_id', 'invoice_id', 'customer_id', 'gateway', 'transaction_id', 'amount', 'currency', 'status', 'reconciled_at', 'created_at'],
    searchFields: ['gateway', 'transaction_id', 'currency', 'status'],
    statusOptions: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded'],
    formFields: [
      { name: 'invoice_id', label: 'Invoice ID / 发票ID', type: 'uuid', required: true },
      { name: 'customer_id', label: 'Customer ID / 客户ID', type: 'uuid' },
      { name: 'gateway', label: 'Gateway / 支付渠道' },
      { name: 'transaction_id', label: 'Transaction ID / 交易号' },
      { name: 'amount', label: 'Amount / 金额', type: 'number', required: true },
      { name: 'currency', label: 'Currency / 币种', placeholder: 'SGD' }
    ],
    summaryFields: ['gateway', 'transaction_id', 'amount', 'currency', 'status', 'created_at'],
    boardLane: 'Finance'
  },
  {
    key: 'warranties',
    title: 'Warranties',
    zh: '保修',
    table: 'warranties',
    objectType: 'warranty',
    primaryKey: 'warranty_id',
    route: '/service-operations/warranties',
    permission: 'write:operations',
    columns: ['warranty_id', 'job_id', 'customer_id', 'coverage', 'starts_on', 'ends_on', 'status', 'created_at'],
    searchFields: ['coverage', 'status'],
    statusOptions: ['active', 'expiring', 'expired', 'claim_opened', 'claim_approved', 'claim_rejected', 'resolved'],
    formFields: [
      { name: 'job_id', label: 'Job ID / 工单ID', type: 'uuid' },
      { name: 'customer_id', label: 'Customer ID / 客户ID', type: 'uuid' },
      { name: 'coverage', label: 'Coverage / 保修范围', type: 'textarea' },
      { name: 'starts_on', label: 'Starts On / 开始日期', type: 'date' },
      { name: 'ends_on', label: 'Ends On / 结束日期', type: 'date' }
    ],
    summaryFields: ['coverage', 'starts_on', 'ends_on', 'status', 'created_at'],
    boardLane: 'Warranty'
  }
];

export const boardLanes = ['Lead', 'Inspection', 'Quotation', 'Work Execution', 'Finance', 'Warranty'] as const;

export function getOperationModule(key: string) {
  return operationModules.find((module) => module.key === key);
}

export function getOperationModuleByObjectType(objectType: string) {
  return operationModules.find((module) => module.objectType === objectType);
}

export function getPublicModuleConfig(config: OperationModuleConfig) {
  return {
    key: config.key,
    title: config.title,
    zh: config.zh,
    primaryKey: config.primaryKey,
    route: config.route,
    statusOptions: config.statusOptions,
    formFields: config.formFields,
    summaryFields: config.summaryFields,
    boardLane: config.boardLane
  };
}
