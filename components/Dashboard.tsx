import { dashboardKpis, intakeItems, moduleHealth, priorities, serviceFlow } from '@/data/adminData';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type BadgeTone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';

function toneToBadge(tone: string): BadgeTone {
  if (tone === 'green') return 'green';
  if (tone === 'amber') return 'amber';
  if (tone === 'red') return 'red';
  if (tone === 'cyan') return 'cyan';
  return 'blue';
}

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardKpis.map((kpi) => (
          <div key={kpi.label} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-500">{kpi.label}</div>
                <div className="text-xs text-slate-400">{kpi.zh}</div>
              </div>
              <Badge tone={toneToBadge(kpi.tone)}>{kpi.trend}</Badge>
            </div>
            <div className="mt-4 text-4xl font-black tracking-tight text-slate-950">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Unified Intake / 统一入口" subtitle="Website, WhatsApp, GMB, social and live-chat messages enter here before formal jobs/invoices.">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="p-3">Source</th><th className="p-3">Customer</th><th className="p-3">Issue</th><th className="p-3">Priority</th><th className="p-3">SLA</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {intakeItems.map((item) => (
                  <tr key={`${item.source}-${item.customer}`} className="bg-white hover:bg-blue-50/50">
                    <td className="p-3 font-medium text-slate-700">{item.source}</td>
                    <td className="p-3">{item.customer}</td>
                    <td className="p-3 text-slate-600">{item.issue}</td>
                    <td className="p-3"><Badge tone={item.priority === 'P0' ? 'red' : item.priority === 'P1' ? 'amber' : 'blue'}>{item.priority}</Badge></td>
                    <td className="p-3 text-xs font-bold text-slate-500">{item.sla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Notification SLA / 通知优先级" subtitle="P0/P1 can push to WhatsApp admin; P2/P3 stay in backend queue/logs.">
          <div className="space-y-3">
            {Object.entries(priorities).map(([key, item]) => (
              <div key={key} className="rounded-2xl border border-slate-200 bg-adminBg p-4">
                <div className="flex items-center gap-2"><Badge tone={key === 'P0' ? 'red' : key === 'P1' ? 'amber' : key === 'P2' ? 'blue' : 'gray'}>{key} {item.label}</Badge><span className="text-xs font-bold text-slate-500">{item.sla}</span></div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.rule}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Approved Service Flow / 核准业务链路" subtitle="Records cannot jump to invoice, paid, closed or warranty without approved transition logs.">
        <div className="flex flex-wrap items-center gap-2">
          {serviceFlow.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-2xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{step}</span>
              {index < serviceFlow.length - 1 ? <span className="text-slate-300">→</span> : null}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Module Health / 模块健康检查" subtitle="Each module has independent health, last sync, degraded mode and retry queue.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {moduleHealth.map((item) => (
            <div key={item.module} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3"><h4 className="font-bold text-slate-800">{item.module}</h4><Badge tone={item.degraded ? 'amber' : 'green'}>{item.status}</Badge></div>
              <div className="mt-2 text-xs text-slate-500">Last sync: {item.lastSync}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
