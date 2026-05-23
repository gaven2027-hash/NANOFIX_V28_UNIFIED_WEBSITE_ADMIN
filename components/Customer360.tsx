import { customer360, successMessages } from '@/data/adminData';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

export function Customer360() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard title="Customer 360 / 客户全景" subtitle="Permission-controlled profile with binding, linked operations and audit trail.">
        <div className="rounded-2xl bg-adminBg p-4">
          <div className="flex items-start justify-between"><div><h4 className="text-xl font-black text-slate-900">{customer360.name}</h4><p className="text-sm text-slate-500">{customer360.phone}</p></div><Badge tone="amber">{customer360.risk}</Badge></div>
          <Badge tone="green">{customer360.status}</Badge>
        </div>
        <div className="mt-4 space-y-2">
          {customer360.records.map(([label, count, note]) => (
            <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
              <div><div className="font-bold text-slate-800">{label}</div><div className="text-xs text-slate-500">{note}</div></div>
              <div className="text-2xl font-black text-activeBlue">{count}</div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Customer Success Messages / 成功提示" subtitle="Quick no-login repair submission has no registration-style next-step buttons.">
        <div className="space-y-3">
          {successMessages.map((msg) => (
            <div key={msg.scenario} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-black text-slate-900">{msg.scenario}</div>
              <p className="mt-2 text-sm text-slate-700">{msg.en}</p>
              <p className="mt-1 text-sm text-slate-700">{msg.zh}</p>
              <p className="mt-2 text-xs font-bold text-activeBlue">Next buttons: {msg.nextButtons}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
