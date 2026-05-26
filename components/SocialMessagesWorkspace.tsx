'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;
type HandlingStatus = 'new' | 'pending_review' | 'in_progress' | 'converted_to_lead' | 'replied' | 'closed' | 'spam' | 'archived';
type ConversionStatus = 'not_converted' | 'suggested' | 'converted' | 'not_relevant';
type ReplyMode = 'draft' | 'manual_sent' | 'api_queued' | 'internal_note';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const handlingStatuses: HandlingStatus[] = ['new', 'pending_review', 'in_progress', 'converted_to_lead', 'replied', 'closed', 'spam', 'archived'];
const conversionStatuses: ConversionStatus[] = ['not_converted', 'suggested', 'converted', 'not_relevant'];
const replyModes: Array<[ReplyMode, string, string]> = [
  ['draft', 'Save Draft', '保存草稿'],
  ['manual_sent', 'Mark Manual Sent', '标记人工已发送'],
  ['api_queued', 'Queue API Dispatch', '加入 API 发送队列'],
  ['internal_note', 'Internal Note', '内部备注']
];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '').toLowerCase();
  if (/(inbound|low|normal|safe|sent|success|replied|closed|converted|on_track)/.test(s)) return 'green';
  if (/(medium|pending|review|warning|progress|suggested|new|due_soon|drafted|queued)/.test(s)) return 'amber';
  if (/(high|critical|failed|blocked|spam|risk|archived|overdue)/.test(s)) return 'red';
  return 'blue';
}

function asConversionStatus(value: unknown, fallback: ConversionStatus): ConversionStatus {
  const status = String(value || fallback);
  return conversionStatuses.includes(status as ConversionStatus) ? status as ConversionStatus : fallback;
}

function replyType(mode: ReplyMode) {
  if (mode === 'manual_sent') return 'manual_sent';
  if (mode === 'api_queued') return 'api_queued';
  if (mode === 'internal_note') return 'internal_note';
  return 'draft';
}

function dispatchStatus(mode: ReplyMode) {
  if (mode === 'manual_sent') return 'sent';
  if (mode === 'api_queued') return 'queued';
  if (mode === 'internal_note') return 'manual_required';
  return 'draft';
}

export function SocialMessagesWorkspace() {
  const searchParams = useSearchParams();
  const messageId = searchParams.get('message_id') || '';
  const [search, setSearch] = useState(messageId);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [replies, setReplies] = useState<Row[]>([]);
  const [handlingStatus, setHandlingStatus] = useState<HandlingStatus>('in_progress');
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus>('not_converted');
  const [followUpNote, setFollowUpNote] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyMode, setReplyMode] = useState<ReplyMode>('draft');
  const [provider, setProvider] = useState('manual');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replySaving, setReplySaving] = useState(false);

  useEffect(() => { setSearch(messageId); }, [messageId]);

  async function loadReplies(row?: Row | null) {
    const active = row || selected;
    if (!active?.message_id) {
      setReplies([]);
      return;
    }
    const params = new URLSearchParams({ message_id: String(active.message_id) });
    const response = await fetch(`/api/admin/social-message-replies?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.ok) setReplies(json.replies || []);
  }

  function selectRow(row: Row | null) {
    setSelected(row);
    setHandlingStatus(String(row?.handling_status || 'in_progress') as HandlingStatus);
    setConversionStatus(asConversionStatus(row?.lead_conversion_status, 'not_converted'));
    setFollowUpNote(String(row?.follow_up_note || ''));
    setReplyBody(String(row?.ai_reply_suggestion || ''));
    void loadReplies(row);
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

  const selectedTitle = useMemo(() => selected ? `${formatValue(selected.channel)} / ${formatValue(selected.message_kind || selected.direction)}` : 'Select a message', [selected]);

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
      body: JSON.stringify({ action: 'update_social_message', message_id: selected.message_id, handling_status: finalStatus, lead_conversion_status: conversionStatus, follow_up_note: followUpNote })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    setSelected(json.record || selected);
    setHandlingStatus(String(json.record?.handling_status || finalStatus) as HandlingStatus);
    setConversionStatus(asConversionStatus(json.record?.lead_conversion_status, conversionStatus));
    setFollowUpNote(String(json.record?.follow_up_note || followUpNote));
    setMessage('Message handling status saved and audit log recorded. / 消息处理状态已保存并写入审计日志。');
    await load();
  }

  async function saveReply(mode = replyMode) {
    if (!selected?.message_id) {
      setMessage('Select a message first. / 请先选择消息。');
      return;
    }
    setReplySaving(true);
    setMessage('');
    const response = await fetch('/api/admin/social-message-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: selected.message_id,
        provider,
        reply_body: replyBody,
        reply_type: replyType(mode),
        dispatch_status: dispatchStatus(mode),
        ai_generated: String(replyBody || '') === String(selected.ai_reply_suggestion || ''),
        human_approved: mode !== 'draft',
        provider_payload: { source: 'messages_inbox', ai_auto_reply_allowed: false, human_review_required: true }
      })
    });
    const json = await response.json().catch(() => ({}));
    setReplySaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Reply save failed. / 回复保存失败。');
      return;
    }
    setSelected(json.message || selected);
    setMessage(mode === 'manual_sent' ? 'Manual reply marked as sent. / 已标记人工回复已发送。' : mode === 'api_queued' ? 'Reply queued for API dispatch after human approval. / 已人工批准并加入 API 发送队列。' : 'Reply saved. / 回复已保存。');
    await loadReplies(json.message || selected);
    await load();
  }

  return (
    <div>
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <SectionCard title="Messages Inbox / 消息收件箱" subtitle="Unified WhatsApp, social DM/comment, GMB and website channel workflow. AI suggests only; human approval is required before reply dispatch. / 统一处理 WhatsApp、社媒私信/评论、GMB 和网站渠道消息。AI 只建议，发送前必须人工确认。">
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search message id, channel, body, risk, SLA... / 搜索消息" />
          <button type="button" onClick={load} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1320px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Handling</th><th className="p-3">Reply</th><th className="p-3">SLA</th><th className="p-3">Risk</th><th className="p-3">Channel</th><th className="p-3">Kind</th><th className="p-3">Body</th><th className="p-3">Lead</th><th className="p-3">Customer</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={String(row.message_id)} className={String(row.message_id) === messageId || selected?.message_id === row.message_id ? 'bg-blue-50' : 'hover:bg-blue-50/50'}><td className="p-3"><Badge tone={tone(row.handling_status)}>{formatValue(row.handling_status || 'new')}</Badge></td><td className="p-3"><Badge tone={tone(row.reply_status)}>{formatValue(row.reply_status)}</Badge></td><td className="p-3"><Badge tone={tone(row.sla_status)}>{formatValue(row.sla_status)}</Badge></td><td className="p-3"><Badge tone={tone(row.risk_level)}>{formatValue(row.risk_level)}</Badge></td><td className="p-3 font-black text-slate-800">{formatValue(row.channel)}</td><td className="p-3 text-slate-600">{formatValue(row.message_kind)}</td><td className="max-w-md truncate p-3 text-slate-700">{formatValue(row.body)}</td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(row.lead_id)}</td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(row.customer_id)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td><td className="p-3"><button type="button" onClick={() => selectRow(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}
              {!rows.length ? <tr><td colSpan={11} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No message records. / 暂无消息记录。'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Message Detail / 消息详情</div>
          <h3 className="mt-1 text-xl font-black text-slate-950">{selectedTitle}</h3>
          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <label><span className={labelClass}>Handling / 处理</span><select className={inputClass} value={handlingStatus} onChange={(event) => setHandlingStatus(event.target.value as HandlingStatus)}>{handlingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                <label><span className={labelClass}>Lead / 转线索</span><select className={inputClass} value={conversionStatus} onChange={(event) => setConversionStatus(event.target.value as ConversionStatus)}>{conversionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                <div className="rounded-2xl bg-slate-50 p-3"><div className={labelClass}>Risk / 风险</div><Badge tone={tone(selected.risk_level)}>{formatValue(selected.risk_level)} · {formatValue(selected.risk_score_percent)}%</Badge></div>
                <div className="rounded-2xl bg-slate-50 p-3"><div className={labelClass}>SLA / 时效</div><Badge tone={tone(selected.sla_status)}>{formatValue(selected.sla_status)}</Badge><div className="mt-1 text-xs font-semibold text-slate-500">{formatValue(selected.sla_due_at)}</div></div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700"><strong>Inbound message / 原始消息：</strong><br />{formatValue(selected.body)}</div>
              <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-blue-50 p-3"><div className={labelClass}>AI Intent / 意图</div><div className="font-black text-blue-800">{formatValue(selected.ai_intent)}</div></div><div className="rounded-2xl bg-blue-50 p-3"><div className={labelClass}>AI Confidence / 置信度</div><div className="font-black text-blue-800">{formatValue(selected.ai_confidence_percent)}%</div></div><div className="rounded-2xl bg-blue-50 p-3"><div className={labelClass}>Reply Status / 回复</div><Badge tone={tone(selected.reply_status)}>{formatValue(selected.reply_status)}</Badge></div></div>
              <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-900"><strong>AI summary / AI 摘要：</strong>{formatValue(selected.ai_summary)}<br /><strong>Reference only / 仅供参考：</strong>AI cannot auto reply. Admin must review and approve before sending.</div>
              <label><span className={labelClass}>Follow-up Note / 跟进备注</span><textarea className={`${inputClass} min-h-24`} value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} placeholder="Write reply notes, follow-up plan or lead conversion reason. / 填写回复备注、跟进计划或转线索原因。" /></label>
              <div className="flex flex-wrap gap-2">
                <button disabled={saving} type="button" onClick={() => updateMessage('in_progress')} className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-100 hover:bg-amber-100 disabled:opacity-60">In Progress / 处理中</button>
                <button disabled={saving} type="button" onClick={() => updateMessage('converted_to_lead')} className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100 disabled:opacity-60">Converted / 已转线索</button>
                <button disabled={saving} type="button" onClick={() => updateMessage('closed')} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-100 hover:bg-slate-100 disabled:opacity-60">Close / 关闭</button>
                <button disabled={saving} type="button" onClick={() => updateMessage('spam')} className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:opacity-60">Spam / 垃圾</button>
                <button disabled={saving} type="button" onClick={() => updateMessage()} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save Note / 保存备注</button>
              </div>
              <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-adminBg p-4 text-xs font-semibold leading-5 text-slate-600">{JSON.stringify(selected, null, 2)}</pre>
            </div>
          ) : <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Select a message. / 请选择消息。</div>}
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Reply Workflow / 回复流程</div>
          <h3 className="mt-1 text-xl font-black text-slate-950">AI Draft + Human Approval</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">AI suggestion is editable. Use Manual Sent after replying in WhatsApp/platform, or API Queue only after platform API binding is ready. / AI 建议可编辑。已在 WhatsApp/平台人工回复后选 Manual Sent；平台 API 打通后才使用 API Queue。</p>
          {selected ? <div className="mt-4 space-y-4">
            <label><span className={labelClass}>Provider / 发送方式</span><select className={inputClass} value={provider} onChange={(event) => setProvider(event.target.value)}><option value="manual">manual</option><option value="whatsapp_business_api">whatsapp_business_api</option><option value="meta_graph_api">meta_graph_api</option><option value="google_business_profile_api">google_business_profile_api</option><option value="website_live_chat">website_live_chat</option><option value="custom_webhook">custom_webhook</option></select></label>
            <label><span className={labelClass}>Reply Body / 回复内容</span><textarea className={`${inputClass} min-h-52`} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} /></label>
            <div className="grid gap-2 sm:grid-cols-2">{replyModes.map(([mode, en, zh]) => <button key={mode} type="button" disabled={replySaving} onClick={() => { setReplyMode(mode); void saveReply(mode); }} className="rounded-2xl bg-blue-50 px-4 py-3 text-left text-sm font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100 disabled:opacity-60"><span className="block">{en}</span><span className="block text-xs text-blue-500">{zh}</span></button>)}</div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className={labelClass}>Reply History / 回复记录</div><div className="space-y-3">{replies.map((reply) => <div key={String(reply.reply_id)} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><div className="mb-2 flex flex-wrap gap-2"><Badge tone={tone(reply.dispatch_status)}>{formatValue(reply.dispatch_status)}</Badge><Badge tone={tone(reply.reply_type)}>{formatValue(reply.reply_type)}</Badge><Badge tone={reply.human_approved ? 'green' : 'amber'}>{reply.human_approved ? 'human approved' : 'not approved'}</Badge></div><p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{formatValue(reply.reply_body)}</p><div className="mt-2 text-xs font-semibold text-slate-500">{formatValue(reply.created_at)}</div></div>)}{!replies.length ? <div className="text-sm font-bold text-slate-500">No replies yet. / 暂无回复记录。</div> : null}</div></div>
          </div> : <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Select a message to draft reply. / 请选择消息后编辑回复。</div>}
        </div>
      </div>
    </div>
  );
}
