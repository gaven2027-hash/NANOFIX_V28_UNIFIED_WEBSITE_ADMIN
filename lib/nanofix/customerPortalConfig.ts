export type CustomerPortalSectionKey =
  | 'my-repair-requests'
  | 'my-quotes'
  | 'my-invoices'
  | 'my-payments-receipts'
  | 'my-warranties'
  | 'submit-new-repair-request'
  | 'registration-with-optional-repair-request';

export type CustomerPortalSectionConfig = {
  key: CustomerPortalSectionKey;
  href: string;
  title: string;
  zh: string;
  tab: 'requests' | 'quotes' | 'invoices' | 'payments' | 'warranties' | 'submit' | 'versions';
  helper: string;
};

export const customerPortalSections: CustomerPortalSectionConfig[] = [
  { key: 'my-repair-requests', href: '/customer-portal/my-repair-requests', title: 'My Repair Requests', zh: '我的报修', tab: 'requests', helper: 'Admin-side view of customer-visible repair requests and service request records.' },
  { key: 'my-quotes', href: '/customer-portal/my-quotes', title: 'My Quotes', zh: '我的报价', tab: 'quotes', helper: 'Admin-side view of customer-visible quotation records.' },
  { key: 'my-invoices', href: '/customer-portal/my-invoices', title: 'My Invoices', zh: '我的发票', tab: 'invoices', helper: 'Admin-side view of customer-visible invoice records.' },
  { key: 'my-payments-receipts', href: '/customer-portal/my-payments-receipts', title: 'My Payments / Receipts', zh: '我的付款/收据', tab: 'payments', helper: 'Admin-side view of customer-visible payments and receipts.' },
  { key: 'my-warranties', href: '/customer-portal/my-warranties', title: 'My Warranties', zh: '我的保修', tab: 'warranties', helper: 'Admin-side view of customer-visible warranty records.' },
  { key: 'submit-new-repair-request', href: '/customer-portal/submit-new-repair-request', title: 'Submit New Repair Request', zh: '提交新报修', tab: 'submit', helper: 'Create a real service request on behalf of a customer from the admin-side portal management page.' },
  { key: 'registration-with-optional-repair-request', href: '/customer-portal/registration-with-optional-repair-request', title: 'Registration With Optional Repair Request', zh: '注册时可选同时提交报修', tab: 'submit', helper: 'Manage optional repair request flow during customer registration. Registration itself does not auto-create jobs, quotations, invoices or warranties.' }
];

export function getCustomerPortalSection(key: string | undefined) {
  return customerPortalSections.find((section) => section.key === key) || null;
}
