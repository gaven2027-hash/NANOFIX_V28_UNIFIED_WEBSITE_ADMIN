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
  if (/(inbound|low|normal|safe|sent|success)/.test(s)) return 'green';
  if (/(medium|pending|review|warning)/.test(s)) return 'amber';
  if (/(high|critical|failed|blocked|spam|risk)/.test(s)) return 'red';
  return 'blue';
}

export function SocialMessagesWorkspace() {
  const searchParams = useSearchParams();
  const messageId = searchParams.get('message_id') || '';
  const [search, setSearch] = useState(messageId);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setSearch(messageId); }, [messageId]);

  async function load() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ detail: 'channel_alerts' });
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
    const match = messageId ? nextRows.find((row: Row) => String(row.message_id) === messageId) : null;
    setSelected(match || nextRows[0] || null);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [messageId]);

  const selectedTitle = useMemo(() => selected ? `${formatValue(selected.channel)} / ${formatValue(selected.direction)}` : 'Select a message', [selected]);

  return (
    <div>
      {message ? <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">{message}</div> : null}
      <SectionCard title="Messages Inbox / 消息收件箱" subtitle="Review social, GMB, WhatsApp and web channel alerts. Dashboard links can open a specific message directly. / 查看社媒、GMB、WhatsApp 和网站渠道消息，仪表盘可直接打开指定消息。">
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search message id, channel, body, risk... / 搜索消息" />
          <button type="button" onClick={load} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Risk</th><th className="p-3">Channel</th><th className="p-3">Direction</th><th className="p-3">Body</th><th className="p-3">Lead</th><th className="p-3">Customer</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={String(row.message_id)} className={String(row.message_id) === messageId || selected?.message_id === row.message_id ? 'bg-blue-50' : 'hover:bg-blue-50/50'}><td className="p-3"><Badge tone={tone(row.risk_level)}>{formatValue(row.risk_level)}</Badge></td><td className="p-3 font-black text-slate-800">{formatValue(row.channel)}</td><td className="p-3"><Badge tone={tone(row.direction)}>{formatValue(row.direction)}</Badge></td><td className="max-w-md truncate p-3 text-slate-700">{formatValue(row.body)}</td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(row.lead_id)}</td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(row.customer_id)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td><td className="p-3"><button type="button" onClick={() => setSelected(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}
              {!rows.length ? <tr><td colSpan={8} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No message records. / 暂无消息记录。'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Message Detail / 消息详情</div>
        <h3 className="mt-1 text-xl font-black text-slate-950">{selectedTitle}</h3>
        {selected ? <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-adminBg p-4 text-xs font-semibold leading-5 text-slate-600">{JSON.stringify(selected, null, 2)}</pre> : <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Select a message. / 请选择消息。</div>}
      </div>
    </div>
  );
}
