export type CustomerCenterSectionKey =
  | 'customers'
  | 'customer-profiles'
  | 'customer-360'
  | 'customer-portal-management'
  | 'repair-tracking'
  | 'linked-leads'
  | 'linked-service-requests'
  | 'linked-jobs'
  | 'linked-quotes'
  | 'linked-invoices'
  | 'linked-payments-receipts'
  | 'linked-warranties'
  | 'customer-binding'
  | 'pending-binding-review'
  | 'customer-registration-login'
  | 'email-mobile-whatsapp-otp'
  | 'force-password-reset'
  | 'disable-freeze-blacklist'
  | 'delete-soft-delete-archive'
  | 'pdpa-access-correction-requests';

export type CustomerCenterSectionConfig = {
  key: CustomerCenterSectionKey;
  href: string;
  title: string;
  zh: string;
  tab: 'customers' | 'records' | 'linked' | 'binding' | 'pdpa' | 'versions';
  category: string;
  helper: string;
};

export const customerCenterSections: CustomerCenterSectionConfig[] = [
  { key: 'customers', href: '/customer-center/customers', title: 'Customers', zh: '客户', tab: 'customers', category: 'customer', helper: 'Create, search, filter and edit real customer records.' },
  { key: 'customer-profiles', href: '/customer-center/customer-profiles', title: 'Customer Profiles', zh: '客户档案', tab: 'customers', category: 'profile', helper: 'Manage customer identity, phone, WhatsApp, email, profile binding and status.' },
  { key: 'customer-360', href: '/customer-center/customer-360', title: 'Customer 360', zh: '客户全景', tab: 'linked', category: 'customer_360', helper: 'Review customer-linked leads, service requests, jobs, quotes, invoices, payments and warranties.' },
  { key: 'customer-portal-management', href: '/customer-center/customer-portal-management', title: 'Customer Portal Management', zh: '客户门户管理', tab: 'records', category: 'portal', helper: 'Manage customer portal visibility rules, login status and customer-only data access notes.' },
  { key: 'repair-tracking', href: '/customer-center/repair-tracking', title: 'Repair Tracking', zh: '维修进度追踪', tab: 'linked', category: 'repair_tracking', helper: 'Review repair tracking records linked to customers and service requests.' },
  { key: 'linked-leads', href: '/customer-center/linked-leads', title: 'Linked Leads', zh: '关联线索', tab: 'linked', category: 'leads', helper: 'Search customer-linked lead records.' },
  { key: 'linked-service-requests', href: '/customer-center/linked-service-requests', title: 'Linked Service Requests', zh: '关联服务请求', tab: 'linked', category: 'service_requests', helper: 'Search customer-linked service requests and repair submissions.' },
  { key: 'linked-jobs', href: '/customer-center/linked-jobs', title: 'Linked Jobs', zh: '关联工单', tab: 'linked', category: 'jobs', helper: 'Search customer-linked jobs and work execution records.' },
  { key: 'linked-quotes', href: '/customer-center/linked-quotes', title: 'Linked Quotes', zh: '关联报价', tab: 'linked', category: 'quotations', helper: 'Search customer-linked quotations and versions.' },
  { key: 'linked-invoices', href: '/customer-center/linked-invoices', title: 'Linked Invoices', zh: '关联发票', tab: 'linked', category: 'invoices', helper: 'Search customer-linked invoices and billing status.' },
  { key: 'linked-payments-receipts', href: '/customer-center/linked-payments-receipts', title: 'Linked Payments / Receipts', zh: '关联付款/收据', tab: 'linked', category: 'payments', helper: 'Search customer-linked payments and receipts.' },
  { key: 'linked-warranties', href: '/customer-center/linked-warranties', title: 'Linked Warranties', zh: '关联保修', tab: 'linked', category: 'warranties', helper: 'Search customer-linked warranty records and claims.' },
  { key: 'customer-binding', href: '/customer-center/customer-binding', title: 'Customer Binding', zh: '客户绑定', tab: 'binding', category: 'binding', helper: 'Review customer binding suggestions and approve/reject binding records.' },
  { key: 'pending-binding-review', href: '/customer-center/pending-binding-review', title: 'Pending Binding Review', zh: '待绑定审核', tab: 'binding', category: 'binding_review', helper: 'Review pending customer-service request matching suggestions.' },
  { key: 'customer-registration-login', href: '/customer-center/customer-registration-login', title: 'Customer Registration / Login', zh: '客户注册/登录', tab: 'records', category: 'login', helper: 'Manage customer registration, login and portal access policy notes.' },
  { key: 'email-mobile-whatsapp-otp', href: '/customer-center/email-mobile-whatsapp-otp', title: 'Email / Mobile / WhatsApp OTP', zh: '邮箱/手机/WhatsApp OTP', tab: 'records', category: 'otp', helper: 'Review OTP policy and verification settings for email, mobile and WhatsApp.' },
  { key: 'force-password-reset', href: '/customer-center/force-password-reset', title: 'Force Password Reset', zh: '强制重置密码', tab: 'records', category: 'password_reset', helper: 'Manage password reset policy records. Plain passwords must never be visible.' },
  { key: 'disable-freeze-blacklist', href: '/customer-center/disable-freeze-blacklist', title: 'Disable / Freeze / Blacklist', zh: '禁用/冻结/拉黑', tab: 'records', category: 'account_control', helper: 'Manage account control records for disabled, frozen or blacklisted customers.' },
  { key: 'delete-soft-delete-archive', href: '/customer-center/delete-soft-delete-archive', title: 'Delete / Soft Delete / Archive', zh: '删除/软删除/归档', tab: 'records', category: 'archive', helper: 'Manage soft delete/archive policy records with audit trail.' },
  { key: 'pdpa-access-correction-requests', href: '/customer-center/pdpa-access-correction-requests', title: 'PDPA Access / Correction Requests', zh: 'PDPA 访问/更正请求', tab: 'pdpa', category: 'pdpa', helper: 'Review PDPA access, correction, deletion and privacy requests.' }
];

export function getCustomerCenterSection(key: string | undefined) {
  return customerCenterSections.find((section) => section.key === key) || null;
}
