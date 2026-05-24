import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

const portalCards = {
  customer: [
    ['Customer Account Status', '客户账号状态', 'View registration, verification, active/suspended state and binding status.'],
    ['Repair Tracking Visibility', '维修追踪可见性', 'Control which repair, quotation, invoice, payment and warranty records are visible to customers.'],
    ['Login & OTP Settings', '登录与 OTP 设置', 'Review email/mobile/WhatsApp verification settings and reset requirements.'],
    ['Customer Binding Review', '客户绑定审核', 'Match public repair requests to registered customer accounts.']
  ],
  engineer: [
    ['Engineer Access Scope', '工程师访问范围', 'Manage engineer-only access by assigned engineer_id and job permissions.'],
    ['Assigned Jobs Board', '已分配工单看板', 'Review assigned jobs, ETA, arrival, work execution and completion actions.'],
    ['Checklist / Photos / Signature', '清单/照片/签名', 'Control required inspection checklists, before/after photos and customer signatures.'],
    ['Completion & Rework Rules', '完工与返工规则', 'Audit job completion, rework_required and warranty-linked field updates.']
  ]
};

export function PortalAdminManagement({ type }: { type: 'customer' | 'engineer' }) {
  const isCustomer = type === 'customer';
  const title = isCustomer ? 'Customer Portal Management / 客户门户管理' : 'Engineer Portal Management / 工程师门户管理';
  const description = isCustomer
    ? 'This is the admin-side management page. It keeps the full admin sidebar and does not switch into customer portal mode.'
    : 'This is the admin-side management page. It keeps the full admin sidebar and does not switch into engineer portal mode.';
  const standaloneHref = isCustomer ? '/portal/customer' : '/portal/engineer';
  const standaloneLabel = isCustomer ? 'Open Customer Portal / 打开客户独立门户' : 'Open Engineer Portal / 打开工程师独立门户';
  const rows = isCustomer ? portalCards.customer : portalCards.engineer;

  return (
    <div className="space-y-5">
      <SectionCard title={title} subtitle={description}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-3xl bg-adminBg p-5 ring-1 ring-slate-200">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="blue">Admin Shell 保留总后台菜单</Badge>
              <Badge tone="green">Portal Route 已隔离</Badge>
              <Badge tone="amber">RLS / 权限过滤</Badge>
            </div>
            <p className="text-sm font-semibold leading-7 text-slate-700">
              {isCustomer
                ? 'The left admin menu remains visible here. Use this page to manage customer portal rules, record visibility, binding review and login status. Customers should use the standalone portal route only.'
                : 'The left admin menu remains visible here. Use this page to manage engineer portal rules, assigned-job visibility, checklist/photo/signature requirements and completion workflow. Engineers should use the standalone portal route only.'}
            </p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Standalone Portal / 独立门户</div>
            <p className="mt-2 text-sm font-semibold text-slate-600">Use this only for role-isolated customer/engineer login experience, not for the main admin backend.</p>
            <Link href={standaloneHref} className="mt-4 inline-flex rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700">
              {standaloneLabel}
            </Link>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {rows.map(([cardTitle, zh, body]) => (
          <section key={cardTitle} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <h3 className="text-lg font-black text-slate-950">{cardTitle}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{zh}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
