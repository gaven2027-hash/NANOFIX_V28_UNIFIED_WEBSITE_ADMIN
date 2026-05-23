import { SectionCard } from './SectionCard';
import { Badge } from './Badge';

const lanes = [
  { title: 'Lead', items: ['Website quick repair form', 'WhatsApp photo consult', 'GMB review conversion'] },
  { title: 'Inspection', items: ['Assigned engineer', 'Thermal image checklist', 'Before photos required'] },
  { title: 'Quotation', items: ['Version 3 draft', 'Valid until reminder', 'Admin approval required'] },
  { title: 'Work Execution', items: ['En route', 'Arrived', 'Customer signature pending'] },
  { title: 'Finance', items: ['Invoice issued', 'Partial payment', 'Receipt signed link'] },
  { title: 'Warranty', items: ['Active coverage', 'Claim opened', 'Rework linked'] }
];

export function WorkflowBoard() {
  return (
    <SectionCard title="Dispatch & Field Work Board / 派工与现场作业" subtitle="Calendar and board view by engineer, date, job status and priority.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lanes.map((lane, index) => (
          <div key={lane.title} className="rounded-3xl border border-slate-200 bg-adminBg p-4">
            <div className="mb-3 flex items-center justify-between"><h4 className="font-black text-slate-900">{lane.title}</h4><Badge tone={index < 2 ? 'red' : index < 4 ? 'amber' : 'blue'}>{lane.items.length}</Badge></div>
            <div className="space-y-2">{lane.items.map((item) => <div key={item} className="rounded-2xl bg-white p-3 text-sm font-medium text-slate-700 shadow-sm">{item}</div>)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
