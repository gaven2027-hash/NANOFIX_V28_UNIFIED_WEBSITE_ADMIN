'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;
type HandlingStatus = 'new' | 'pending_review' | 'in_progress' | 'converted_to_lead' | 'replied' | 'closed' | 'spam' | 'archived';
type ConversionStatus = 'not_converted' | 'suggested' | 'converted' | 'not_relevant';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const handlingStatuses: HandlingStatus[] = ['new', 'pending_review', 'in_progress', 'converted_to_lead', 'replied', 'closed', 'spam', 'archived'];
const conversionStatuses: ConversionStatus[] = ['not_converted', 'suggested', 'converted', 'not_relevant'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '').toLowerCase();
  if (/(inbound|low|normal|safe|sent|success|replied|closed|converted)/.test(s)) return 'green';
  if (/(medium|pending|review|warning|progress|suggested|new)/.test(s)) return 'amber';
  if (/(high|critical|failed|blocked|spam|risk|archived)/.test(s)) return 'red';
  return 'blue';
}

export function SocialMessagesWorkspace() {
  const searchParams = useSearchParams();
  const messageId = searchParams.get('message_id') || '';
  const [search, setSearch] = useState(messageId);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [handlingStatus, setHandlingStatus] = useState<HandlingStatus>('in_progress');
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus>('not_converted');
  const [followUpNote, setFollowUpNote] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSearch(messageId); }, [messageId]);

  function selectRow(row: Row) {
    setSelected(row);
    setHandlingStatus(String(row.handling_status || 'in_progress') as HandlingStatus);
    setConversionStatus(String(row.lead_conversion_status || 'not_converted') as ConversionStatus);
    setFollowUpNote(String(row.follow_up_note || ''));
  }

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
    selectRow(match || nextRows[0] || null);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [messageId]);

  const selectedTitle = useMemo(() => selected ? `${formatValue(selected.channel)} / ${formatValue(selected.direction)}` : 'Select a message', [selected]);

  async function updateMessage(nextStatus?: HandlingStatus) {
    if (!selected?.message_id) {
      setMessage('Select a message first. / 请先选择消息。');
      return;
    }
    const finalStatus = nextStatus || handlingStatus;
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/review-actions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_social_message',
        message_id: selected.message_id,
        handling_status: finalStatus,
        lead_conversion_status: conversionStatus,
        follow_up_note: followUpNote
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    setSelected(json.record || selected);
    setHandlingStatus(String(json.record?.handling_status || finalStatus) as HandlingStatus);
    setConversionStatus(String(json.record?.lead_conversion_status || conversionStatus) as ConversionStatus);
    setFollowUpNote(String(json.record?.follow_up_note || followUpNote));
    setMessage('Message handling status saved and audit log recorded. / 消息处理状态已保存并写入审计日志。');
    await load();
  }

  return (
    <div>
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <SectionCard title="Messages Inbox / 消息收件箱" subtitle="Review social, GMB, WhatsApp and web channel alerts. Dashboard links can open a specific message directly. / 查看社媒、GMB、WhatsApp 和网站渠道消息，仪表盘可直接打开指定消息。">
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search message id, channel, body, risk... / 搜索消息" />
          <button type="button" onClick={load} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Handling</th><th className="p-3">Risk</th><th className="p-3">Channel</th><th className="p-3">Direction</th><th className="p-3">Body</th><th className="p-3">Lead</th><th className="p-3">Customer</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={String(row.message_id)} className={String(row.message_id) === messageId || selected?.message_id === row.message_id ? 'bg-blue-50' : 'hover:bg-blue-50/50'}><td className="p-3"><Badge tone={tone(row.handling_status)}>{formatValue(row.handling_status || 'new')}</Badge></td><td className="p-3"><Badge tone={tone(row.risk_level)}>{formatValue(row.risk_level)}</Badge></td><td className="p-3 font-black text-slate-800">{formatValue(row.channel)}</td><td className="p-3"><Badge tone={tone(row.direction)}>{formatValue(row.direction)}</Badge></td><td className="max-w-md truncate p-3 text-slate-700">{formatValue(row.body)}</td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(row.lead_id)}</td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(row.customer_id)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td><td className="p-3"><button type="button" onClick={() => selectRow(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}
              {!rows.length ? <tr><td colSpan={9} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No message records. / 暂无消息记录。'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Message Detail / 消息详情</div>
        <h3 className="mt-1 text-xl font-black text-slate-950">{selectedTitle}</h3>
        {selected ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label><span className={labelClass}>Handling Status / 处理状态</span><select className={inputClass} value={handlingStatus} onChange={(event) => setHandlingStatus(event.target.value as HandlingStatus)}>{handlingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label><span className={labelClass}>Lead Conversion / 转线索状态</span><select className={inputClass} value={conversionStatus} onChange={(event) => setConversionStatus(event.target.value as ConversionStatus)}>{conversionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <div className="rounded-2xl bg-slate-50 p-3"><div className={labelClass}>Risk / 风险</div><Badge tone={tone(selected.risk_level)}>{formatValue(selected.risk_level)}</Badge></div>
            </div>
            <label><span className={labelClass}>Follow-up Note / 跟进备注</span><textarea className={`${inputClass} min-h-24`} value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} placeholder="Write reply notes, follow-up plan or lead conversion reason. / 填写回复备注、跟进计划或转线索原因。" /></label>
            <div className="flex flex-wrap gap-2">
              <button disabled={saving} type="button" onClick={() => updateMessage('in_progress')} className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-100 hover:bg-amber-100 disabled:opacity-60">In Progress / 处理中</button>
              <button disabled={saving} type="button" onClick={() => updateMessage('replied')} className="rounded-2xl bg-green-50 px-4 py-2 text-sm font-black text-green-700 ring-1 ring-green-100 hover:bg-green-100 disabled:opacity-60">Replied / 已回复</button>
              <button disabled={saving} type="button" onClick={() => updateMessage('converted_to_lead')} className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100 disabled:opacity-60">Converted / 已转线索</button>
              <button disabled={saving} type="button" onClick={() => updateMessage('closed')} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-100 hover:bg-slate-100 disabled:opacity-60">Close / 关闭</button>
              <button disabled={saving} type="button" onClick={() => updateMessage('spam')} className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:opacity-60">Spam / 垃圾</button>
              <button disabled={saving} type="button" onClick={() => updateMessage()} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save Note / 保存备注</button>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-adminBg p-4 text-xs font-semibold leading-5 text-slate-600">{JSON.stringify(selected, null, 2)}</pre>
          </div>
        ) : <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Select a message. / 请选择消息。</div>}
      </div>
    </div>
  );
}
