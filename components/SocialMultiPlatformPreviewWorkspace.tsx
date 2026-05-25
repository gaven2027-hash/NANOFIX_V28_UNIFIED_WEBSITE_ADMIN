'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { SocialMultiPlatformPreviewBoard } from './SocialMultiPlatformPreviewBoard';

type Row = Record<string, unknown>;

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(approved|published|connected)/i.test(s)) return 'green';
  if (/(draft|pending|scheduled)/i.test(s)) return 'amber';
  if (/(rejected|failed|cancelled|disabled|error)/i.test(s)) return 'red';
  return 'blue';
}

export function SocialMultiPlatformPreviewWorkspace() {
  const [drafts, setDrafts] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ mode: 'all', platform: 'all' });
    const response = await fetch(`/api/admin/social-media?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    setDrafts(json.drafts || []);
    setVersions(json.versions || []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createSnapshot(draft: Row) {
    setMessage('');
    const response = await fetch('/api/admin/social-media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'publish_snapshot',
        content_id: draft.content_id,
        platform: draft.platform || 'all',
        status: 'scheduled',
        snapshot_json: {
          source: 'multi_platform_preview_review',
          draft,
          admin_review_required: true,
          ai_auto_publish_allowed: false,
          created_at: new Date().toISOString()
        }
      })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Schedule snapshot failed. / 排期快照失败。');
      return;
    }
    setMessage(`Snapshot saved as version ${json.version?.version_no || '—'}. / 已保存排期快照。`);
    await loadData();
  }

  return (
    <div className="space-y-5">
      {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <SectionCard title="Multi-Platform Social Review Flow / 多平台社媒审核流程" subtitle="One material pack creates separate platform drafts. Admin reviews all preview windows side-by-side, then edits, approves, schedules or records publish snapshots per platform. / 一次素材生成多个平台独立草稿，并排预览，逐个平台编辑、批准、排期或记录发布快照。">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Step 1</div><div className="mt-1 text-sm font-black text-slate-900">Upload / register source material</div></div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Step 2</div><div className="mt-1 text-sm font-black text-slate-900">Select target platforms</div></div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Step 3</div><div className="mt-1 text-sm font-black text-slate-900">Generate draft-only versions</div></div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Step 4</div><div className="mt-1 text-sm font-black text-slate-900">Admin approval / schedule</div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="amber">AI cannot auto publish</Badge>
          <Badge tone="blue">Admin review required</Badge>
          <Badge tone="green">Per-platform drafts</Badge>
          <Badge tone="cyan">Publish snapshots auditable</Badge>
        </div>
      </SectionCard>

      <SocialMultiPlatformPreviewBoard drafts={drafts} onRefresh={loadData} onOpenDraft={setSelectedDraft} onCreateSnapshot={createSnapshot} />

      {selectedDraft ? (
        <SectionCard title="Selected Draft Detail / 已选草稿详情" subtitle="This keeps editing review visible from the same preview page. Use the normal AI Drafts table for full text editing if needed. / 在同一预览页面查看所选草稿详情；完整编辑可进入普通 AI 草稿列表。">
          <div className="grid gap-3 md:grid-cols-3">
            <div><div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Platform</div><div className="mt-1 text-sm font-black text-slate-900">{formatValue(selectedDraft.platform)}</div></div>
            <div><div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Status</div><div className="mt-1"><Badge tone={statusTone(selectedDraft.approval_status)}>{formatValue(selectedDraft.approval_status)}</Badge></div></div>
            <div><div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Created</div><div className="mt-1 text-sm font-semibold text-slate-700">{formatValue(selectedDraft.created_at)}</div></div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <h3 className="text-lg font-black text-slate-950">{formatValue(selectedDraft.title)}</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">{formatValue(selectedDraft.body)}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void createSnapshot(selectedDraft)} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700">Create Schedule Snapshot / 创建排期快照</button>
            <button type="button" onClick={() => setSelectedDraft(null)} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close Detail / 关闭详情</button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Recent Schedule / Publish Snapshots / 最近排期与发布快照" subtitle="Every schedule/publish action is saved as a version record for audit and rollback. / 每次排期或发布动作都保存版本快照，便于审计和回溯。">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[780px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Platform</th><th className="p-3">Version</th><th className="p-3">Scheduled</th><th className="p-3">Created</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {versions.map((version) => <tr key={String(version.version_id)}><td className="p-3"><Badge tone={statusTone(version.status)}>{formatValue(version.status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(version.platform)}</td><td className="p-3">v{formatValue(version.version_no)}</td><td className="p-3 text-slate-600">{formatValue(version.scheduled_at)}</td><td className="p-3 text-slate-500">{formatValue(version.created_at)}</td></tr>)}
              {!versions.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No publish snapshots yet. / 暂无发布快照。'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
