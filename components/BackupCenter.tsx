'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { createBrowserClient } from '@/lib/supabase/browser';

type BackupRow = {
  backup_id: string;
  module: string;
  schedule_cron: string | null;
  status: string | null;
  encrypted_file_path: string | null;
  signed_url_expires_at: string | null;
  created_by: string | null;
  created_at: string | null;
};

type BackupPayload = {
  ok?: boolean;
  backups?: BackupRow[];
  storage?: string;
  backup_id?: string;
  mode?: string;
  execution?: {
    encrypted_file_path?: string;
    signed_url?: string | null;
    signed_url_expires_at?: string;
    download_requires_approval?: boolean;
    download_audited?: boolean;
    manifest?: Record<string, unknown>;
  } | null;
  error?: string;
  details?: unknown;
};

const moduleOptions = ['central_database', 'customers', 'service_requests', 'website', 'ai', 'social', 'audit_logs'];

function statusTone(status: string | null): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  if (status === 'completed') return 'green';
  if (status === 'running' || status === 'scheduled') return 'amber';
  if (status === 'failed') return 'red';
  return 'blue';
}

async function sessionHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function BackupCenter() {
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [moduleName, setModuleName] = useState('central_database');
  const [manualReason, setManualReason] = useState('Manual backup from System Settings / 从系统设置手动备份');
  const [restoreBackupId, setRestoreBackupId] = useState('');
  const [storage, setStorage] = useState('unknown');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  async function loadBackups() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/backups/jobs', { cache: 'no-store', headers: await sessionHeaders() });
      const json = (await response.json().catch(() => ({}))) as BackupPayload;
      if (!response.ok || !json.ok) {
        setRows([]);
        setMessage(json.error || 'Unable to load backup jobs. / 无法加载备份任务。');
        return;
      }
      setRows(json.backups || []);
      setStorage(json.storage || 'supabase');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load backup jobs. / 无法加载备份任务。');
    } finally {
      setLoading(false);
    }
  }

  async function runBackup(mode: 'queue' | 'run_now' | 'restore_dry_run' | 'create_signed_url', backupId?: string) {
    setLoading(true);
    setMessage('');
    setSignedUrl(null);
    try {
      const body = mode === 'restore_dry_run'
        ? { mode, backup_id: restoreBackupId }
        : mode === 'create_signed_url'
          ? { mode, backup_id: backupId }
          : { mode, module: moduleName, manual_reason: manualReason };
      const response = await fetch('/api/admin/backups/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await sessionHeaders()) },
        body: JSON.stringify(body)
      });
      const json = (await response.json().catch(() => ({}))) as BackupPayload;
      if (!response.ok || !json.ok) {
        setMessage(json.error || 'Backup action failed. / 备份操作失败。');
        return;
      }
      setSignedUrl(json.execution?.signed_url || null);
      setMessage(
        mode === 'run_now'
          ? 'Encrypted backup completed and audited. Generate a download link only when needed. / 加密备份已完成并写入审计；需要下载时再生成链接。'
          : mode === 'queue'
            ? 'Backup job queued and audited. / 备份任务已排队并写入审计。'
            : mode === 'create_signed_url'
              ? 'Audited download link created. / 已生成并审计下载链接。'
              : 'Restore dry run completed and audited. / 恢复演练已完成并写入审计。'
      );
      await loadBackups();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup action failed. / 备份操作失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadBackups(); }, []);

  return (
    <SectionCard title="Backup & Download Center / 模块备份与下载中心" subtitle="Live encrypted backup jobs, audited download links, restore dry run and audit logs. / 真实加密备份任务、审计下载链接、恢复演练和审计日志。">
      <div id="backup-download-center" className="scroll-mt-32 space-y-5">
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Create Backup / 创建备份</div>
            <label className="mt-4 block text-xs font-black text-slate-500">Module / 模块</label>
            <select value={moduleName} onChange={(event) => setModuleName(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-activeBlue">
              {moduleOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="mt-3 block text-xs font-black text-slate-500">Reason / 原因</label>
            <textarea value={manualReason} onChange={(event) => setManualReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-activeBlue" />
            <div className="mt-4 grid gap-2">
              <button type="button" disabled={loading} onClick={() => runBackup('run_now')} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Run Encrypted Backup Now / 立即加密备份</button>
              <button type="button" disabled={loading} onClick={() => runBackup('queue')} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Queue Backup Job / 排队备份任务</button>
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <label className="block text-xs font-black text-slate-500">Restore Dry Run Backup ID / 恢复演练备份ID</label>
              <input value={restoreBackupId} onChange={(event) => setRestoreBackupId(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-activeBlue" placeholder="backup_id UUID" />
              <button type="button" disabled={loading || !restoreBackupId} onClick={() => runBackup('restore_dry_run')} className="mt-2 w-full rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60">Run Restore Dry Run / 执行恢复演练</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Backup ID</th><th className="p-3">Module</th><th className="p-3">Schedule</th><th className="p-3">Status</th><th className="p-3">Encrypted File</th><th className="p-3">Created</th><th className="p-3">Download</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((item) => <tr key={item.backup_id} className="bg-white hover:bg-blue-50/50"><td className="max-w-48 truncate p-3 font-mono text-xs font-bold text-slate-600">{item.backup_id}</td><td className="p-3 font-bold text-slate-800">{item.module}</td><td className="p-3 text-xs font-bold text-slate-600">{item.schedule_cron || '—'}</td><td className="p-3"><Badge tone={statusTone(item.status)}>{item.status || 'unknown'}</Badge></td><td className="max-w-56 truncate p-3 text-xs font-bold text-slate-600">{item.encrypted_file_path || '—'}</td><td className="p-3 text-xs font-bold text-slate-500">{item.created_at || '—'}</td><td className="p-3">{item.status === 'completed' && item.encrypted_file_path ? <button type="button" disabled={loading} onClick={() => runBackup('create_signed_url', item.backup_id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60">Generate audited link / 生成审计链接</button> : <span className="text-xs font-bold text-slate-400">—</span>}</td></tr>)}
                {!rows.length ? <tr><td colSpan={7} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading backup jobs... / 正在加载备份任务...' : 'No backup jobs found. / 暂无备份任务。'}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950 ring-1 ring-blue-100">{message}</div> : null}
        {signedUrl ? <a href={signedUrl} className="inline-flex rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700" target="_blank" rel="noreferrer">Open audited encrypted backup link / 打开已审计加密备份链接</a> : null}
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-900 ring-1 ring-amber-100">Storage: {storage}. Exports use an encrypted redaction manifest. Download links are generated only after an audited action. / 导出使用加密脱敏清单；下载链接只在审计动作后生成。</div>
      </div>
    </SectionCard>
  );
}
