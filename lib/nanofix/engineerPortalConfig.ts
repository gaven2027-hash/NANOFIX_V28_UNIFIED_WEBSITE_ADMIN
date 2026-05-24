export type EngineerPortalSectionKey =
  | 'assigned-jobs'
  | 'field-work-board'
  | 'site-inspection'
  | 'job-checklists'
  | 'job-photos'
  | 'customer-signatures'
  | 'arrival-eta-status'
  | 'completion-rework'
  | 'warranty-linked-field-updates'
  | 'engineer-access-scope';

export type EngineerPortalSectionConfig = {
  key: EngineerPortalSectionKey;
  href: string;
  title: string;
  zh: string;
  tab: 'jobs' | 'inspections' | 'checklists' | 'photos' | 'signatures' | 'access' | 'versions';
  helper: string;
};

export const engineerPortalSections: EngineerPortalSectionConfig[] = [
  { key: 'assigned-jobs', href: '/engineer-portal/assigned-jobs', title: 'Assigned Jobs', zh: '已分配工单', tab: 'jobs', helper: 'Admin-side view of engineer assigned jobs and work execution status.' },
  { key: 'field-work-board', href: '/engineer-portal/field-work-board', title: 'Field Work Board', zh: '现场施工看板', tab: 'jobs', helper: 'Review en route, arrived, in progress, completed and rework-required job states.' },
  { key: 'site-inspection', href: '/engineer-portal/site-inspection', title: 'Site Inspection', zh: '现场查验', tab: 'inspections', helper: 'Admin-side view of real inspection records, assigned engineer and schedule.' },
  { key: 'job-checklists', href: '/engineer-portal/job-checklists', title: 'Job Checklists', zh: '工单检查清单', tab: 'checklists', helper: 'Review job_checklists records submitted from field work.' },
  { key: 'job-photos', href: '/engineer-portal/job-photos', title: 'Job Photos', zh: '工单照片', tab: 'photos', helper: 'Review job_photos records, before/after photo metadata and upload status.' },
  { key: 'customer-signatures', href: '/engineer-portal/customer-signatures', title: 'Customer Signatures', zh: '客户签名', tab: 'signatures', helper: 'Review customer_signatures records and completion sign-off status.' },
  { key: 'arrival-eta-status', href: '/engineer-portal/arrival-eta-status', title: 'Arrival / ETA Status', zh: '到场/ETA 状态', tab: 'jobs', helper: 'Manage ETA notes and job arrival status from the admin-side engineer portal.' },
  { key: 'completion-rework', href: '/engineer-portal/completion-rework', title: 'Completion / Rework', zh: '完工/返工', tab: 'jobs', helper: 'Review completion notes and rework_required status.' },
  { key: 'warranty-linked-field-updates', href: '/engineer-portal/warranty-linked-field-updates', title: 'Warranty-Linked Field Updates', zh: '保修关联现场更新', tab: 'jobs', helper: 'Review field updates that may affect warranty creation or warranty claim handling.' },
  { key: 'engineer-access-scope', href: '/engineer-portal/engineer-access-scope', title: 'Engineer Access Scope', zh: '工程师访问范围', tab: 'access', helper: 'Manage admin-side notes for engineer access by assigned engineer_id and job scope.' }
];

export function getEngineerPortalSection(key: string | undefined) {
  return engineerPortalSections.find((section) => section.key === key) || null;
}
