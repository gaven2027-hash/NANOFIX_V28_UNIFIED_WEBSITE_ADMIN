'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '').toLowerCase();
  if (/(approved|published|completed|success|low)/.test(s)) return 'green';
  if (/(pending|draft|review|medium)/.test(s)) return 'amber';
  if (/(rejected|failed|high|critical|blocked)/.test(s)) return 'red';
  return 'blue';
}

export function AiDraftReviewWorkspace() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft_id') || '';
  const [search, setSearch] = useState(draftId);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setSearch(draftId); }, [draftId]);

  async function load() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ detail: 'ai_handoff' });
    if (search) params.set('search', search);
    const response = await fetch(`/api/admin/dashboard?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    const nextRows = json.selectedRows || [];
    setRows(nextRows);
    const match = draftId ? nextRows.find((row: Row) => String(row.draft_id) === draftId) : null;
    setSelected(match || nextRows[0] || null);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [draftId]);

  const selectedTitle = useMemo(() => selected ? formatValue(selected.task || selected.module || selected.draft_id) : 'Select AI draft', [selected]);

  return (
    <div>
      {message ? <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">{message}</div> : null}
      <SectionCard title="AI Draft Review / AI 草稿审核" subtitle="Review AI drafts that require human approval. Dashboard links can open a specific draft directly. / 审核需要人工确认的 AI 草稿，仪表盘可直接打开指定草稿。">
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search draft id, module, task, risk... / 搜索 AI 草稿" />
          <button type="button" onClick={load} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Review</th><th className="p-3">Risk</th><th className="p-3">Module</th><th className="p-3">Task</th><th className="p-3">Record</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={String(row.draft_id)} className={String(row.draft_id) === draftId || selected?.draft_id === row.draft_id ? 'bg-blue-50' : 'hover:bg-blue-50/50'}><td className="p-3"><Badge tone={tone(row.human_review_status)}>{formatValue(row.human_review_status)}</Badge></td><td className="p-3"><Badge tone={tone(row.ai_risk_level)}>{formatValue(row.ai_risk_level)}</Badge></td><td className="p-3 font-black text-slate-800">{formatValue(row.module)}</td><td className="max-w-xs truncate p-3 text-slate-700">{formatValue(row.task)}</td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(row.record_id)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td><td className="p-3"><button type="button" onClick={() => setSelected(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}
              {!rows.length ? <tr><td colSpan={7} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No AI draft records. / 暂无 AI 草稿记录。'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Draft Detail / 草稿详情</div>
        <h3 className="mt-1 text-xl font-black text-slate-950">{selectedTitle}</h3>
        {selected ? <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-adminBg p-4 text-xs font-semibold leading-5 text-slate-600">{JSON.stringify(selected, null, 2)}</pre> : <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Select a draft. / 请选择草稿。</div>}
      </div>
    </div>
  );
}
