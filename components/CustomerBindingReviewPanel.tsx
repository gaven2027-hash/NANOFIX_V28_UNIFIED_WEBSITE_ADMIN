'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Candidate = {
  customer_id: string;
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  portal_status: string | null;
  binding_status: string | null;
  score: number;
  reasons: string[];
};

type BindingRow = {
  service_request_id: string;
  customer_id: string | null;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address_text: string | null;
  property_address: string | null;
  issue_type: string | null;
  source_platform: string | null;
  binding_status: string | null;
  status: string | null;
  created_at: string | null;
  candidates: Candidate[];
};

type ApiResult = {
  ok: boolean;
  rows?: BindingRow[];
  error?: string;
};

function tone(status: string | null): 'blue' | 'green' | 'amber' | 'red' {
  if (status === 'linked') return 'green';
  if (status === 'rejected') return 'red';
  if (status === 'manual_review' || status === 'pending_review') return 'amber';
  return 'blue';
}

async function sessionHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

export function CustomerBindingReviewPanel() {
  const [rows, setRows] = useState<BindingRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const selected = useMemo(() => rows.find((row) => row.service_request_id === selectedId) ?? rows[0] ?? null, [rows, selectedId]);
  const bestCandidate = selected?.candidates?.[0] ?? null;
  const selectedCandidate = selected?.candidates?.find((candidate) => candidate.customer_id === selectedCandidateId) ?? bestCandidate;

  const loadRows = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/customers/binding-review', {
        headers: await sessionHeaders(),
        cache: 'no-store'
      });
      const data = (await response.json().catch(() => ({}))) as ApiResult;
      if (!response.ok || !data.ok) {
        setRows([]);
        setMessage(data.error || 'Unable to load pending customer binding records. / 无法加载待绑定客户记录。');
        return;
      }
      const nextRows = data.rows || [];
      setRows(nextRows);
      setSelectedId((current) => current ?? nextRows[0]?.service_request_id ?? null);
      setSelectedCandidateId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unknown error / 未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  async function submit(action: 'link' | 'manual_review' | 'reject') {
    if (!selected) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/customers/binding-review', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(await sessionHeaders()) },
        body: JSON.stringify({
          action,
          service_request_id: selected.service_request_id,
          customer_id: action === 'link' ? selectedCandidate?.customer_id : null,
          note
        })
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setMessage(data.error || 'Binding action failed. / 绑定操作失败。');
        return;
      }
      setMessage(action === 'link' ? 'Linked successfully. / 已成功绑定。' : action === 'manual_review' ? 'Moved to manual review. / 已转人工审核。' : 'Rejected and audited. / 已拒绝并写入审计。');
      setNote('');
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unknown error / 未知错误');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { loadRows(); }, [loadRows]);

  return (
    <SectionCard
      title="Pending Customer Binding / 待绑定客户"
      subtitle="Match public repair requests, WhatsApp enquiries, and offline records to Customer Portal profiles. Review candidates before linking or rejecting. / 将公开报修、WhatsApp 咨询和离线记录匹配到客户门户档案，审核候选后再绑定或拒绝。"
    >
      <div id="pending-customer-binding" className="scroll-mt-32 space-y-5">
        <div id="binding-review-merge" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <div className="grid grid-cols-[minmax(160px,1fr)_130px_130px_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:grid-cols-[minmax(180px,1fr)_140px_150px_130px_110px]">
              <span>Request / 请求</span><span>Contact / 联系</span><span className="hidden md:block">Source / 来源</span><span>Status / 状态</span><span>Match / 匹配</span>
            </div>
            {loading ? (
              <div className="px-4 py-8 text-sm font-bold text-slate-500">Loading... / 加载中...</div>
            ) : rows.length ? rows.map((row) => (
              <button key={row.service_request_id} type="button" onClick={() => { setSelectedId(row.service_request_id); setSelectedCandidateId(null); }} className={`grid w-full grid-cols-[minmax(160px,1fr)_130px_130px_110px] gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-blue-50 md:grid-cols-[minmax(180px,1fr)_140px_150px_130px_110px] ${selected?.service_request_id === row.service_request_id ? 'bg-sky-50' : 'bg-white'}`}>
                <span className="min-w-0"><span className="block truncate font-black text-slate-950">{row.contact_name || 'Unnamed Request'}</span><span className="block truncate text-xs font-bold text-slate-500">{row.issue_type || 'Service Request'} · {row.service_request_id}</span></span>
                <span className="min-w-0 text-xs font-bold text-slate-600"><span className="block truncate">{row.phone || row.whatsapp || '-'}</span><span className="block truncate text-slate-400">{row.email || '-'}</span></span>
                <span className="hidden truncate text-xs font-bold text-slate-600 md:block">{row.source_platform || '-'}</span>
                <span><Badge tone={tone(row.binding_status)}>{row.binding_status || 'pending'}</Badge></span>
                <span className="text-xs font-black text-activeBlue">{row.candidates?.[0]?.score ?? 0}%</span>
              </button>
            )) : (
              <div className="px-4 py-8 text-sm font-bold text-slate-500">No pending binding records. / 暂无待绑定记录。</div>
            )}
          </div>

          <aside className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Binding Review / 绑定审核</div>
                <h3 className="mt-2 text-xl font-black text-slate-950">{selected?.contact_name || 'Select a request'}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{selected?.address_text || selected?.property_address || 'No address provided / 未提供地址'}</p>
              </div>
              <button type="button" onClick={loadRows} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-blue-50">Refresh</button>
            </div>

            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-100">
              Match rules / 匹配规则：Phone +50, Email +40, Name +20, Address +20. Admin approval is required before linking records. / 管理员审核后才能正式绑定。
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-sm font-black text-slate-950">Candidate Matches / 候选匹配</div>
              {selected?.candidates?.length ? selected.candidates.map((candidate) => (
                <button key={candidate.customer_id} type="button" onClick={() => setSelectedCandidateId(candidate.customer_id)} className={`w-full rounded-2xl border p-4 text-left transition hover:bg-blue-50 ${selectedCandidate?.customer_id === candidate.customer_id ? 'border-activeBlue bg-sky-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between gap-3"><span className="font-black text-slate-950">{candidate.name || 'Unnamed Customer'}</span><Badge tone={candidate.score >= 70 ? 'green' : candidate.score >= 40 ? 'amber' : 'blue'}>{candidate.score}%</Badge></div>
                  <div className="mt-2 text-xs font-bold text-slate-500">{candidate.phone || candidate.whatsapp || '-'} · {candidate.email || '-'}</div>
                  <div className="mt-2 flex flex-wrap gap-2">{candidate.reasons.map((reason) => <span key={reason} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{reason}</span>)}</div>
                </button>
              )) : <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No candidate found. Send to manual review or reject with note. / 没有候选，可转人工审核或备注后拒绝。</div>}
            </div>

            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-4 min-h-[88px] w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Review note / 审核备注（拒绝时必填）" />
            {message ? <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-950 ring-1 ring-blue-100">{message}</div> : null}

            <div className="mt-4 grid gap-2">
              <button type="button" disabled={busy || !selected || !selectedCandidate} onClick={() => submit('link')} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Link Selected Customer / 绑定选中客户</button>
              <button type="button" disabled={busy || !selected} onClick={() => submit('manual_review')} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">Send to Manual Review / 转人工审核</button>
              <button type="button" disabled={busy || !selected} onClick={() => submit('reject')} className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">Reject Binding / 拒绝绑定</button>
            </div>
          </aside>
        </div>
      </div>
    </SectionCard>
  );
}
