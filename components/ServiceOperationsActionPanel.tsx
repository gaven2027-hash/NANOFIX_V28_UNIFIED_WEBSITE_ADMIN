'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

const items = [
  { id: 'SR-2026-019', title: 'HDB ceiling leak', zh: 'HDB 天花漏水', owner: 'Operations', status: 'pending_inspection', priority: 'P0', href: '/service-operations#service-requests', next: 'Schedule inspection / 安排查验' },
  { id: 'INS-2026-010', title: 'Inspection report pending', zh: '查验报告待提交', owner: 'Inspection & Repair', status: 'field_required', priority: 'P1', href: '/service-operations#inspections', next: 'Upload field report / 上传现场报告' },
  { id: 'QT-2026-022', title: 'Quotation approval required', zh: '报价需要审批', owner: 'Admin', status: 'approval_required', priority: 'P0', href: '/service-operations#quotation-approval', next: 'Approve or reject quote / 批准或驳回报价' },
  { id: 'JOB-2026-016', title: 'Customer sign-off pending', zh: '客户完工确认待处理', owner: 'Operations', status: 'signature_pending', priority: 'P1', href: '/service-operations#jobs', next: 'Collect customer confirmation / 收集客户确认' },
  { id: 'PAY-2026-034', title: 'Partial payment remaining', zh: '部分付款剩余待处理', owner: 'Finance', status: 'partial_paid', priority: 'P1', href: '/service-operations#payments', next: 'Record balance payment / 记录尾款' },
  { id: 'WCL-2026-041', title: 'Warranty claim review', zh: '保修范围申请审核', owner: 'Operations', status: 'claim_review', priority: 'P1', href: '/service-operations#warranty-generation-rules', next: 'Decide warranty scope / 判断保修范围' }
];

function tone(priority: string) {
  if (priority === 'P0') return 'red';
  if (priority === 'P1') return 'amber';
  return 'blue';
}

export function ServiceOperationsActionPanel() {
  const [selectedId, setSelectedId] = useState(items[0].id);
  const [logs, setLogs] = useState<string[]>([]);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  function log(action: string) {
    setLogs((current) => [`${new Date().toLocaleString()} — ${action} — ${selected.id}`, ...current].slice(0, 6));
  }

  return (
    <SectionCard title="Service Operations Action Panel / 服务运营操作面板" subtitle="Select one record, open the original processing area, assign owner, update status or create a Super Admin override audit note. / 选择条目后可打开处理区、指派、更新状态或创建总管理员强制流转审计记录。">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[1.2fr_130px_120px_70px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
            <span>Record / 条目</span><span>Owner / 负责人</span><span>Status / 状态</span><span>Priority</span>
          </div>
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`grid w-full grid-cols-[1.2fr_130px_120px_70px] gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-blue-50 ${selected.id === item.id ? 'bg-sky-50' : 'bg-white'}`}>
              <span><span className="block font-black text-slate-900">{item.title}</span><span className="block text-xs font-semibold text-slate-500">{item.zh} · {item.id}</span></span>
              <span className="font-bold text-slate-600">{item.owner}</span>
              <span className="font-bold text-slate-600">{item.status}</span>
              <Badge tone={tone(item.priority)}>{item.priority}</Badge>
            </button>
          ))}
        </div>

        <aside className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-300 to-blue-600 p-5 text-white">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-white/75">Selected / 当前选择</div>
            <h3 className="mt-2 text-xl font-black">{selected.title}</h3>
            <p className="mt-1 text-sm font-bold text-white/85">{selected.zh}</p>
          </div>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-3"><b>ID:</b> {selected.id}</div>
            <div className="rounded-2xl bg-slate-50 p-3"><b>Owner:</b> {selected.owner}</div>
            <div className="rounded-2xl bg-slate-50 p-3"><b>Next:</b> {selected.next}</div>
          </div>
          <div className="mt-4 grid gap-2">
            <Link href={selected.href} className="rounded-2xl bg-activeBlue px-4 py-3 text-center text-sm font-black text-white hover:bg-blue-700">Open processing workspace / 打开处理工作区</Link>
            <button type="button" onClick={() => log('Assign owner / 指派负责人')} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-200">Assign owner / 指派负责人</button>
            <button type="button" onClick={() => log('Update status / 更新状态')} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-200">Update status / 更新状态</button>
            <button type="button" onClick={() => log('Super Admin override / 总管理员强制流转')} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700">Super Admin override / 总管理员强制流转</button>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-black text-slate-900">Audit preview / 审计预览</div>
            <div className="mt-3 grid gap-2">
              {logs.length ? logs.map((item) => <div key={item} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">{item}</div>) : <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-100">No action yet / 暂无操作</div>}
            </div>
          </div>
        </aside>
      </div>
    </SectionCard>
  );
}
