import Link from 'next/link';
import { SectionCard } from './SectionCard';
import { Badge } from './Badge';

type Lane = {
  id: string;
  title: string;
  zh: string;
  href: string;
  tone: 'red' | 'amber' | 'blue' | 'green' | 'cyan';
  items: Array<{ id: string; title: string; zh: string; owner: string; status: string; href: string }>;
};

const lanes: Lane[] = [
  {
    id: 'lead',
    title: 'Leads',
    zh: '线索',
    href: '/service-operations#leads',
    tone: 'red',
    items: [
      { id: 'LEAD-WEB-001', title: 'Website quick repair form', zh: '网站快速报修表单', owner: 'Operations', status: 'new', href: '/service-operations#service-requests' },
      { id: 'LEAD-WA-002', title: 'WhatsApp photo consult', zh: 'WhatsApp 图片咨询', owner: 'Customer Service', status: 'needs_reply', href: '/social-media#whatsapp-ai-reply' },
      { id: 'LEAD-GMB-003', title: 'Google Business enquiry', zh: 'Google 商家咨询', owner: 'Operations', status: 'qualify', href: '/social-media#google-business-profile' }
    ]
  },
  {
    id: 'inspection',
    title: 'Inspection',
    zh: '查验',
    href: '/service-operations#inspections',
    tone: 'amber',
    items: [
      { id: 'INS-009', title: 'Assign Inspection & Repair staff', zh: '分配检修人员', owner: 'Operations', status: 'pending_assignment', href: '/service-operations#engineer-assignment' },
      { id: 'INS-010', title: 'Thermal image checklist', zh: '热成像检查清单', owner: 'Inspection & Repair', status: 'field_required', href: '/service-operations#inspections' },
      { id: 'INS-011', title: 'Before photos required', zh: '需上传施工前照片', owner: 'Inspection & Repair', status: 'upload_required', href: '/service-operations#progress-updates' }
    ]
  },
  {
    id: 'quotation',
    title: 'Quotation',
    zh: '报价',
    href: '/service-operations#quotations',
    tone: 'blue',
    items: [
      { id: 'QT-020', title: 'Quotation draft V3', zh: '报价草稿 V3', owner: 'Admin', status: 'draft', href: '/service-operations#quotations' },
      { id: 'QT-021', title: 'Validity reminder', zh: '报价有效期提醒', owner: 'Operations', status: 'customer_pending', href: '/service-operations#quotations' },
      { id: 'QT-022', title: 'Admin approval required', zh: '需要管理员审批', owner: 'Admin', status: 'approval_required', href: '/service-operations#quotation-approval' }
    ]
  },
  {
    id: 'work',
    title: 'Work Execution',
    zh: '施工执行',
    href: '/service-operations#work-execution',
    tone: 'cyan',
    items: [
      { id: 'JOB-014', title: 'Team en route', zh: '团队在路上', owner: 'Inspection & Repair', status: 'en_route', href: '/service-operations#work-execution' },
      { id: 'JOB-015', title: 'Arrived on site', zh: '已到现场', owner: 'Inspection & Repair', status: 'arrived', href: '/service-operations#progress-updates' },
      { id: 'JOB-016', title: 'Customer signature pending', zh: '客户签名待确认', owner: 'Operations', status: 'signature_pending', href: '/service-operations#jobs' }
    ]
  },
  {
    id: 'finance',
    title: 'Finance',
    zh: '财务',
    href: '/service-operations#payments',
    tone: 'green',
    items: [
      { id: 'INV-033', title: 'Invoice issued', zh: '发票已开', owner: 'Finance', status: 'issued', href: '/service-operations#invoices' },
      { id: 'PAY-034', title: 'Partial payment', zh: '部分付款', owner: 'Finance', status: 'partial_paid', href: '/service-operations#payments' },
      { id: 'REC-035', title: 'Receipt signed link', zh: '收据签署链接', owner: 'Finance', status: 'receipt_pending', href: '/service-operations#receipts' }
    ]
  },
  {
    id: 'warranty',
    title: 'Warranty',
    zh: '保修',
    href: '/service-operations#warranty-records',
    tone: 'amber',
    items: [
      { id: 'WTY-040', title: 'Active coverage', zh: '有效保修', owner: 'Customer Center', status: 'active', href: '/service-operations#warranty-records' },
      { id: 'WCL-041', title: 'Warranty claim opened', zh: '保修范围申请已开启', owner: 'Operations', status: 'claim_review', href: '/service-operations#warranty-generation-rules' },
      { id: 'RWK-042', title: 'Rework linked', zh: '返工已关联', owner: 'Super Admin', status: 'takeover_available', href: '/service-operations#super-admin-takeover-override' }
    ]
  }
];

const quickActions = [
  { title: 'Create repair request', zh: '新建报修单', href: '/service-operations#service-requests' },
  { title: 'Assign inspection', zh: '分配查验', href: '/service-operations#engineer-assignment' },
  { title: 'Approve quotation', zh: '审批报价', href: '/service-operations#quotation-approval' },
  { title: 'Issue invoice', zh: '开发票', href: '/service-operations#invoices' },
  { title: 'Record payment', zh: '记录付款', href: '/service-operations#payments' },
  { title: 'Super Admin takeover', zh: '总管理员接管', href: '/service-operations#super-admin-takeover-override' }
];

export function WorkflowBoard() {
  return (
    <SectionCard title="Dispatch & Field Work Board / 派工与现场作业" subtitle="Clickable lead-to-warranty board. Every card routes to its processing workspace inside AdminShell. / 可点击的线索到保修看板，每张卡片都留在总后台内处理。">
      <div className="mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-blue-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5">
            <span className="block">{action.title}</span>
            <span className="block text-xs font-bold text-white/80">{action.zh}</span>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lanes.map((lane) => (
          <div key={lane.id} id={lane.id} className="rounded-3xl border border-slate-200 bg-adminBg p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Link href={lane.href} className="group">
                <h4 className="font-black text-slate-900 group-hover:text-activeBlue">{lane.title}</h4>
                <div className="text-xs font-semibold text-slate-500">{lane.zh}</div>
              </Link>
              <Badge tone={lane.tone}>{lane.items.length}</Badge>
            </div>
            <div className="space-y-2">
              {lane.items.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-activeBlue">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-slate-800">{item.title}</div>
                      <div className="text-xs font-semibold text-slate-500">{item.zh}</div>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-activeBlue">{item.id}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                    <span>{item.owner}</span>
                    <span>•</span>
                    <span>{item.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
