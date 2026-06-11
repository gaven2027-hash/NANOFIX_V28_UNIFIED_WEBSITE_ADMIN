export type CustomerPortalNavItem = {
  href: string;
  title: string;
  zh: string;
  shortTitle: string;
  shortZh: string;
  description: string;
  descriptionZh: string;
  legacyFrom: string[];
  includesReviewLink?: boolean;
};

export const customerPortalNavigation: CustomerPortalNavItem[] = [
  {
    href: '/customer-portal#dashboard',
    title: 'Dashboard',
    zh: '我的首页',
    shortTitle: 'Home',
    shortZh: '首页',
    description: 'Current repair progress, pending quotation, outstanding payment, active warranty and quick support actions.',
    descriptionZh: '当前维修进度、待确认报价、待付款、有效保修和快捷客服操作。',
    legacyFrom: ['customer-register', 'customer-login']
  },
  {
    href: '/customer-portal#my-repairs',
    title: 'My Repairs',
    zh: '我的维修',
    shortTitle: 'Repairs',
    shortZh: '维修',
    description: 'Repair requests, inspection appointments, work schedule, status timeline, site photos and completion confirmation.',
    descriptionZh: '报修记录、查验预约、施工安排、状态时间线、现场照片和完工确认。',
    legacyFrom: ['submit-request', 'new-repair-request', 'warranty-claim', 'my-repair-requests']
  },
  {
    href: '/customer-portal#quotes-payments',
    title: 'Quotes & Payments',
    zh: '报价与付款',
    shortTitle: 'Payments',
    shortZh: '付款',
    description: 'Quotations, invoices, payment status, receipts, revision requests and payment proof uploads.',
    descriptionZh: '报价单、发票、付款状态、收据、报价修改申请和付款凭证上传。',
    legacyFrom: ['my-quotations', 'my-invoices', 'my-payments-receipts']
  },
  {
    href: '/customer-portal#warranty-documents',
    title: 'Warranty & Documents',
    zh: '保修与文件',
    shortTitle: 'Warranty',
    shortZh: '保修',
    description: 'E-warranty, completion report, quotation PDFs, invoice PDFs, receipts, before/after photos and warranty claim records.',
    descriptionZh: '电子保修、完工报告、报价 PDF、发票 PDF、收据、施工前后照片和保修维修记录。',
    legacyFrom: ['my-warranties']
  },
  {
    href: '/customer-portal#support-account',
    title: 'Support & Account',
    zh: '支持与账号',
    shortTitle: 'Support',
    shortZh: '客服',
    description: 'Profile, WhatsApp support, leave a review, feedback, privacy choices and logout actions.',
    descriptionZh: '个人资料、WhatsApp 客服、我要评论、反馈、隐私授权和退出登录。',
    legacyFrom: ['submit-review-link', 'my-reviews', 'review-privacy-settings', 'my-profile'],
    includesReviewLink: true
  }
];

export const customerPortalBlockedInternalTerms = [
  'audit log',
  'webhook',
  'rls',
  'api credential',
  'binding review',
  'admin override',
  'super admin',
  'engineer internal task'
];
