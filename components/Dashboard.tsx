import Link from 'next/link';
import { moduleHealth, priorities, serviceFlow } from '@/data/adminData';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type BadgeTone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';

type MetricCard = {
  label: string;
  zh: string;
  value: string;
  trend: string;
  tone: BadgeTone;
  href: string;
  helper: string;
};

type ActionItem = {
  id: string;
  title: string;
  zh: string;
  owner: string;
  priority: 'P0' | 'P1' | 'P2';
  due: string;
  href: string;
  action: string;
};

type AlertItem = {
  id: string;
  title: string;
  zh: string;
  module: string;
  risk: 'High' | 'Watch' | 'Info';
  href: string;
};

const overviewCards: MetricCard[] = [
  { label: 'Today Leads', zh: '今日线索', value: '38', trend: '+12%', tone: 'green', href: '/service-operations#leads', helper: 'All new website, WhatsApp, social and ad leads / 所有网站、WhatsApp、社媒和广告新线索' },
  { label: 'Repair Requests', zh: '今日报修', value: '16', trend: 'Live', tone: 'blue', href: '/service-operations#service-requests', helper: 'New repair and warranty-claim submissions / 新增维修和保修范围申请' },
  { label: 'Pending Binding', zh: '待绑定客户', value: '7', trend: 'P1', tone: 'amber', href: '/customer-center#pending-customer-binding', helper: 'Quick repair requests waiting for customer profile match / 公开报修待匹配客户档案' },
  { label: 'Today Revenue', zh: '今日收款', value: '$8.4k', trend: '+18%', tone: 'green', href: '/service-operations#payments', helper: 'Confirmed payment and receipt records / 已确认付款与收据记录' },
  { label: 'Ad Spend Summary', zh: '广告花费摘要', value: '$950', trend: '2 alerts', tone: 'red', href: '/admin/advertising-center#roi-insights-alerts', helper: 'Paid ads only; organic social is separate / 只统计付费广告，自然社媒单独看' },
  { label: 'System Health', zh: '系统健康', value: '10/11', trend: 'OK', tone: 'cyan', href: '/system-settings#health-checks', helper: 'Module health, API status, backup and deployment checks / 模块、API、备份和部署健康' }
];

const urgentActions: ActionItem[] = [
  { id: 'URG-001', title: 'Overdue quotation approval', zh: '超时报价审批', owner: 'Admin / Operations', priority: 'P0', due: 'Overdue 3h', href: '/service-operations#quotation-approval', action: 'Open quotation approval list / 打开报价审批列表' },
  { id: 'URG-002', title: 'Customer binding required', zh: '客户绑定待确认', owner: 'Customer Center', priority: 'P1', due: 'Today', href: '/customer-center#pending-customer-binding', action: 'Review suggested phone/email match / 审核电话邮箱匹配建议' },
  { id: 'URG-003', title: 'Engineer task needs takeover', zh: '工程师任务需要接管', owner: 'Super Admin', priority: 'P0', due: 'Overdue 1d', href: '/service-operations#super-admin-takeover-override', action: 'Take over as Inspection & Repair / 以检修角色接管' },
  { id: 'URG-004', title: 'Review requires privacy redaction', zh: '客户评价需要隐私脱敏', owner: 'Customer Center', priority: 'P1', due: 'Today', href: '/customer-center#review-approval-privacy-redaction', action: 'Redact name/address/photo before approval / 公开前脱敏姓名地址图片' },
  { id: 'URG-005', title: 'High spend low conversion campaign', zh: '高花费低转化广告', owner: 'Advertising / Finance', priority: 'P1', due: 'Today', href: '/admin/advertising-center#roi-insights-alerts', action: 'Review budget or pause campaign / 审核预算或暂停广告' }
];

const crossModuleAlerts: AlertItem[] = [
  { id: 'ALT-ADS-002', title: 'Meta Ads CPL above limit', zh: 'Meta 广告 CPL 超过上限', module: 'Advertising', risk: 'High', href: '/admin/advertising-center#daily-spend-review' },
  { id: 'ALT-SVC-004', title: 'Quotation stuck before approval', zh: '报价卡在审批前', module: 'Service Operations', risk: 'High', href: '/service-operations#quotation-approval' },
  { id: 'ALT-WEB-001', title: 'Public form spike from one device', zh: '公开表单同设备提交异常', module: 'Website / Security', risk: 'Watch', href: '/system-settings#no-login-repair-intake-security' },
  { id: 'ALT-REV-003', title: 'Review photo may expose unit number', zh: '评价图片可能暴露门牌号', module: 'Customer Center', risk: 'Watch', href: '/customer-center#review-approval-privacy-redaction' },
  { id: 'ALT-SYS-006', title: 'One module is in degraded mode', zh: '一个模块处于降级模式', module: 'System Health', risk: 'Info', href: '/system-settings#error-boundaries-module-isolation' }
];

const intakeSources = [
  { label: 'Website Repair Entry', zh: '网站报修入口', leads: 9, jobs: 3, href: '/website-management#public-form-submissions' },
  { label: 'Member Registration', zh: '会员注册入口', leads: 5, jobs: 1, href: '/system-settings#customer-portal-login-registration' },
  { label: 'WhatsApp Enquiries', zh: 'WhatsApp 咨询', leads: 4, jobs: 1, href: '/social-media#whatsapp-ai-reply' },
  { label: 'Unknown Source', zh: '未知来源', leads: 3, jobs: 0, href: '/customer-center#lead-source-history' }
];

const channelSnapshots = [
  { label: 'Website Organic', zh: '网站自然', leads: 9, jobs: 3, revenue: '$3.2k', href: '/website-management#website-organic-leads' },
  { label: 'Website Paid', zh: '网站广告', leads: 11, jobs: 2, revenue: '$2.4k', href: '/website-management#website-paid-landing-leads' },
  { label: 'Social Organic', zh: '社媒自然', leads: 8, jobs: 2, revenue: '$2.1k', href: '/social-media#organic-social-leads' },
  { label: 'Social Paid Ads', zh: '社媒广告', leads: 6, jobs: 1, revenue: '$1.5k', href: '/admin/advertising-center#paid-social-ads' },
  { label: 'Google Business Organic', zh: 'Google 商家自然', leads: 5, jobs: 1, revenue: '$900', href: '/social-media#google-business-profile' },
  { label: 'Google Ads', zh: 'Google 广告', leads: 7, jobs: 2, revenue: '$2.8k', href: '/admin/advertising-center#google-ads' }
];

function riskTone(risk: AlertItem['risk']): BadgeTone {
  if (risk === 'High') return 'red';
  if (risk === 'Watch') return 'amber';
  return 'blue';
}

function priorityTone(priority: ActionItem['priority']): BadgeTone {
  if (priority === 'P0') return 'red';
  if (priority === 'P1') return 'amber';
  return 'blue';
}

export function Dashboard() {
  return (
    <div className="space-y-6">
      <section id="executive-overview" className="scroll-mt-32 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="group rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-500">{kpi.label}</div>
                <div className="text-xs text-slate-400">{kpi.zh}</div>
              </div>
              <Badge tone={kpi.tone}>{kpi.trend}</Badge>
            </div>
            <div className="mt-4 text-4xl font-black tracking-tight text-slate-950">{kpi.value}</div>
            <p className="mt-3 text-xs font-bold leading-5 text-slate-500">{kpi.helper}</p>
            <div className="mt-3 text-xs font-black text-activeBlue group-hover:underline">Open linked workspace / 打开对应处理页面 →</div>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Urgent Action Queue / 紧急待处理队列" subtitle="Click one urgent count or row to jump directly to the original module and process the item. / 点击数量或条目直接进入原模块处理。">
          <div id="urgent-action-queue" className="scroll-mt-32 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="p-3">Task / 任务</th><th className="p-3">Owner / 负责人</th><th className="p-3">Priority</th><th className="p-3">Due / 到期</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {urgentActions.map((item) => (
                  <tr key={item.id} className="bg-white hover:bg-blue-50/50">
                    <td className="p-3"><Link href={item.href} className="font-black text-slate-800 hover:text-activeBlue hover:underline">{item.title}</Link><div className="text-xs font-semibold text-slate-500">{item.zh}</div><div className="mt-1 text-xs font-bold text-activeBlue">{item.action}</div></td>
                    <td className="p-3 text-slate-600">{item.owner}</td>
                    <td className="p-3"><Badge tone={priorityTone(item.priority)}>{item.priority}</Badge></td>
                    <td className="p-3 text-xs font-bold text-slate-500">{item.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Cross-Module Alerts / 跨模块预警" subtitle="Dashboard only summarizes risks. Detailed operation stays in each original module. / 仪表盘只汇总风险，详细操作回到原模块。">
          <div id="cross-module-alerts" className="scroll-mt-32 space-y-3">
            {crossModuleAlerts.map((alert) => (
              <Link key={alert.id} href={alert.href} className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:ring-1 hover:ring-activeBlue">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{alert.title}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{alert.zh}</p></div><Badge tone={riskTone(alert.risk)}>{alert.risk}</Badge></div>
                <div className="mt-2 text-xs font-black text-activeBlue">{alert.module} → {alert.href}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Intake & Lead Summary / 入口与线索汇总" subtitle="Website repair, member registration, WhatsApp and unknown-source leads are separated before they enter Customer Center. / 网站报修、会员注册、WhatsApp 和未知来源先分开，再汇入客户中心。">
          <div id="intake-lead-summary" className="scroll-mt-32 grid gap-3 md:grid-cols-2">
            {intakeSources.map((source) => (
              <Link key={source.label} href={source.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-blue-50 hover:ring-1 hover:ring-activeBlue">
                <div className="text-sm font-black text-slate-900">{source.label}</div><div className="text-xs font-semibold text-slate-500">{source.zh}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3"><div className="text-2xl font-black text-slate-950">{source.leads}</div><div className="text-xs font-bold text-slate-500">Leads</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-2xl font-black text-slate-950">{source.jobs}</div><div className="text-xs font-bold text-slate-500">Jobs</div></div></div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Revenue & Finance Summary / 收入与财务摘要" subtitle="Finance summary highlights cash collection, overdue invoices and ad-spend impact, then links to finance operation pages. / 财务摘要突出收款、逾期发票和广告花费影响，并跳转对应页面。">
          <div id="revenue-finance-summary" className="scroll-mt-32 grid gap-3 md:grid-cols-2">
            {[
              { label: 'Today Collection', zh: '今日收款', value: '$8.4k', href: '/service-operations#payments', tone: 'green' as BadgeTone },
              { label: 'Overdue Invoices', zh: '逾期发票', value: '3', href: '/service-operations#invoices', tone: 'red' as BadgeTone },
              { label: 'Ad Cost Ratio', zh: '广告成本占比', value: '11.3%', href: '/admin/advertising-center#finance-review', tone: 'amber' as BadgeTone },
              { label: 'Receipt Pending', zh: '待生成收据', value: '4', href: '/service-operations#receipts', tone: 'blue' as BadgeTone }
            ].map((item) => (
              <Link key={item.label} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:ring-1 hover:ring-activeBlue"><div className="flex items-start justify-between gap-2"><div><div className="text-sm font-black text-slate-900">{item.label}</div><div className="text-xs font-semibold text-slate-500">{item.zh}</div></div><Badge tone={item.tone}>Open</Badge></div><div className="mt-3 text-3xl font-black text-slate-950">{item.value}</div></Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Operations Summary / 业务运营摘要" subtitle="Operational bottlenecks link to service records, assignment, execution and warranty review. / 运营瓶颈可直达报修、分配、施工和保修审核。">
        <div id="operations-summary" className="scroll-mt-32 flex flex-wrap gap-2">
          {serviceFlow.map((step, index) => (<div key={step} className="flex items-center gap-2"><Link href="/service-operations#status-flow-logs" className="rounded-2xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800 ring-1 ring-blue-100 hover:bg-activeBlue hover:text-white">{step}</Link>{index < serviceFlow.length - 1 ? <span className="text-slate-300">→</span> : null}</div>))}
        </div>
      </SectionCard>

      <SectionCard title="Channel Performance Snapshot / 渠道表现快照" subtitle="Organic and paid channels are shown separately. Advertising ROI uses paid data only. / 自然与广告分开展示，广告 ROI 只使用付费数据。">
        <div id="channel-performance-snapshot" className="scroll-mt-32 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {channelSnapshots.map((channel) => (
            <Link key={channel.label} href={channel.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:ring-1 hover:ring-activeBlue">
              <div className="text-sm font-black text-slate-900">{channel.label}</div><div className="text-xs font-semibold text-slate-500">{channel.zh}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-black text-slate-950">{channel.leads}</div><div className="text-[10px] font-bold text-slate-500">Leads</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-black text-slate-950">{channel.jobs}</div><div className="text-[10px] font-bold text-slate-500">Jobs</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-black text-slate-950">{channel.revenue}</div><div className="text-[10px] font-bold text-slate-500">Revenue</div></div></div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Approval Center Summary / 审批中心摘要" subtitle="Approvals stay in their modules. This panel is only the fast route for pending approvals and Super Admin takeover. / 审批留在原模块，这里只做快速入口。">
        <div id="approval-center-summary" className="scroll-mt-32 grid gap-3 md:grid-cols-3">
          {[
            { label: 'Quotation Approval', zh: '待审批报价', href: '/service-operations#quotation-approval', value: '6' },
            { label: 'Ad Budget Approval', zh: '待审批广告预算', href: '/admin/advertising-center#finance-review', value: '2' },
            { label: 'Website Publish Approval', zh: '待审批网站发布', href: '/website-management#publish-approval', value: '3' },
            { label: 'Social Publish Approval', zh: '待审批社媒发布', href: '/social-media#schedule-publish-approval', value: '5' },
            { label: 'Registration Review', zh: '待审核会员/管理员注册', href: '/system-settings#admin-registration-review', value: '4' },
            { label: 'Super Admin Takeover', zh: '待总管理员接管', href: '/service-operations#super-admin-takeover-override', value: '3' }
          ].map((item) => (<Link key={item.label} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:ring-1 hover:ring-activeBlue"><div className="text-3xl font-black text-slate-950">{item.value}</div><div className="mt-1 text-sm font-black text-slate-900">{item.label}</div><div className="text-xs font-semibold text-slate-500">{item.zh}</div></Link>))}
        </div>
      </SectionCard>

      <SectionCard title="System Health Summary / 系统健康摘要" subtitle="Each module keeps independent health, degraded mode and retry queue. / 每个模块独立健康检查、降级模式和重试队列。">
        <div id="system-health-summary" className="scroll-mt-32 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {moduleHealth.map((item) => (<Link key={item.module} href="/system-settings#health-checks" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:ring-1 hover:ring-activeBlue"><div className="flex items-center justify-between gap-3"><h4 className="font-bold text-slate-800">{item.module}</h4><Badge tone={item.degraded ? 'amber' : 'green'}>{item.status}</Badge></div><div className="mt-2 text-xs text-slate-500">Last sync: {item.lastSync}</div></Link>))}
        </div>
      </SectionCard>

      <SectionCard title="Notification SLA / 通知优先级" subtitle="P0/P1 can push to WhatsApp admin; P2/P3 stay in backend queue/logs.">
        <div className="space-y-3">
          {Object.entries(priorities).map(([key, item]) => (<div key={key} className="rounded-2xl border border-slate-200 bg-adminBg p-4"><div className="flex items-center gap-2"><Badge tone={key === 'P0' ? 'red' : key === 'P1' ? 'amber' : key === 'P2' ? 'blue' : 'gray'}>{key} {item.label}</Badge><span className="text-xs font-bold text-slate-500">{item.sla}</span></div><p className="mt-2 text-xs leading-5 text-slate-600">{item.rule}</p></div>))}
        </div>
      </SectionCard>
    </div>
  );
}
