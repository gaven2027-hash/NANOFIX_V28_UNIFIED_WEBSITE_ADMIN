import { rbac } from '@/data/adminData';
import { SectionCard } from './SectionCard';

export function RbacTable() {
  return (
    <SectionCard title="RBAC Permission Matrix / 权限矩阵" subtitle="Permissions cover create/read/update/delete/export/approve/publish/reset/backup/restore. / 权限覆盖创建、读取、更新、删除、导出、审批、发布、重置、备份与恢复。">
      <div className="grid gap-3 lg:grid-cols-2">
        {rbac.map((role) => (
          <div key={role.role} className="rounded-2xl border border-slate-200 bg-adminBg p-4">
            <h4 className="font-black text-slate-900">{role.role}</h4>
            <p className="mt-1 text-xs font-bold text-activeBlue">{role.scope}</p>
            <p className="mt-3 text-sm text-slate-700"><strong>Can / 可执行：</strong> {role.can}</p>
            <p className="mt-2 text-sm text-slate-600"><strong>Guardrails / 限制说明：</strong> {role.cannot}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
