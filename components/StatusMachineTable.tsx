import { statusMachines } from '@/data/adminData';
import { SectionCard } from './SectionCard';

export function StatusMachineTable() {
  return (
    <SectionCard title="Executable Status Machines / 状态机" subtitle="Server API must validate allowed transitions and write audit logs. / 服务器 API 必须校验允许的状态流转，并写入审计日志。">
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Object / 对象</th><th className="p-3">Allowed Statuses / Transition / 允许状态 / 流转</th><th className="p-3">Required Guard / 必要约束</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {statusMachines.map((row) => <tr key={row.object}><td className="p-3 font-bold text-slate-800">{row.object}</td><td className="p-3 text-slate-600">{row.statuses}</td><td className="p-3 text-slate-600">{row.guard}</td></tr>)}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
