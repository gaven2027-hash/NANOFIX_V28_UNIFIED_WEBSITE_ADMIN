import { backupSchedules } from '@/data/adminData';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

export function BackupCenter() {
  return (
    <SectionCard title="Backup & Download Center / 模块备份与下载中心" subtitle="Custom schedules, encrypted backups, signed links, restore logs and role approval.">
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Module</th><th className="p-3">Frequency</th><th className="p-3">Time</th><th className="p-3">Retention</th><th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {backupSchedules.map((item) => <tr key={item.module}><td className="p-3 font-bold text-slate-800">{item.module}</td><td className="p-3">{item.frequency}</td><td className="p-3">{item.time}</td><td className="p-3">{item.retention}</td><td className="p-3"><Badge tone="green">{item.status}</Badge></td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-900 ring-1 ring-amber-100">No plaintext passwords, API keys, service role keys or unmasked sensitive data may be exported.</div>
    </SectionCard>
  );
}
