import Link from 'next/link';
import { statusMachines } from '@/data/adminData';
import { SectionCard } from './SectionCard';
import { Badge } from './Badge';

const transitionActions = [
  { label: 'Validate transition', zh: '校验状态流转', href: '/service-operations#status-flow-logs', tone: 'blue' as const },
  { label: 'Write audit log', zh: '写入审计日志', href: '/system-settings#audit-logs', tone: 'green' as const },
  { label: 'Request approval', zh: '请求审批', href: '/dashboard#approval-center-summary', tone: 'amber' as const },
  { label: 'Super Admin override', zh: '总管理员强制流转', href: '/service-operations#super-admin-takeover-override', tone: 'red' as const }
];

function actionForObject(object: string) {
  const text = object.toLowerCase();
  if (text.includes('quotation')) return '/service-operations#quotation-approval';
  if (text.includes('invoice')) return '/service-operations#invoices';
  if (text.includes('payment')) return '/service-operations#payments';
  if (text.includes('warranty')) return '/service-operations#warranty-records';
  if (text.includes('job')) return '/service-operations#jobs';
  return '/service-operations#service-requests';
}

export function StatusMachineTable() {
  return (
    <SectionCard title="Executable Status Machines / 状态机" subtitle="Allowed transitions must be checked by server RPC and every transition must write Audit Logs. / 所有状态流转必须由服务端 RPC 校验，并写入 Audit Logs。">
      <div className="mb-4 grid gap-2 md:grid-cols-4">
        {transitionActions.map((action) => (
          <Link key={action.label} href={action.href} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-black text-slate-900">{action.label}</div>
                <div className="text-xs font-semibold text-slate-500">{action.zh}</div>
              </div>
              <Badge tone={action.tone}>Go</Badge>
            </div>
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[1080px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Object / 对象</th>
              <th className="p-3">Allowed Statuses / 允许状态</th>
              <th className="p-3">Required Guard / 必要约束</th>
              <th className="p-3">Action / 操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {statusMachines.map((row) => (
              <tr key={row.object} className="bg-white hover:bg-blue-50/50">
                <td className="p-3 font-bold text-slate-800">{row.object}</td>
                <td className="p-3 text-slate-600">{row.statuses}</td>
                <td className="p-3 text-slate-600">{row.guard}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={actionForObject(row.object)} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Open record</Link>
                    <Link href="/service-operations#status-flow-logs" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Logs</Link>
                    <Link href="/service-operations#super-admin-takeover-override" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">Override</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
