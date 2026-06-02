'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type BadgeTone = 'blue' | 'green' | 'amber' | 'red';

type ClaimRow = {
  customer_account_claim_id: string;
  customer_id: string;
  claim_method: string | null;
  claim_identifier: string | null;
  status: string | null;
  otp_verified: boolean | null;
  claimed_auth_user_id: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  customers?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    portal_status?: string | null;
    created_source?: string | null;
  } | null;
};

type ApiResult = {
  ok: boolean;
  rows?: ClaimRow[];
  error?: string;
};

function tone(status: string | null): BadgeTone {
  if (status === 'approved') return 'green';
  if (status === 'verified') return 'blue';
  if (status === 'rejected' || status === 'expired') return 'red';
  return 'amber';
}

export function CustomerAccountClaimsReviewPanel() {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [busyClaimId, setBusyClaimId] = useState<string | null>(null);

  async function sessionHeaders(): Promise<Record<string, string>> {
    const supabase = createBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
  }

  async function loadRows() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/customers/account-claims', {
        headers: await sessionHeaders(),
        cache: 'no-store'
      });
      const data = (await response.json().catch(() => ({}))) as ApiResult;
      if (!response.ok || !data.ok) {
        setMessage(data.error || 'Unable to load account claim requests. / 无法加载账号认领申请。');
        setRows([]);
        return;
      }
      setRows(data.rows || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unknown error / 未知错误');
    } finally {
      setLoading(false);
    }
  }

  async function reviewClaim(claimId: string, action: 'approve' | 'reject') {
    setBusyClaimId(claimId);
    setMessage('');
    try {
      const response = await fetch('/api/admin/customers/account-claims', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(await sessionHeaders()) },
        body: JSON.stringify({ action, claim_id: claimId, note: reviewNote })
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setMessage(data.error || 'Review action failed. / 审核操作失败。');
        return;
      }
      setMessage(action === 'approve' ? 'Claim approved and customer profile activated. / 认领已批准，客户档案已激活。' : 'Claim rejected and profile returned to unclaimed. / 认领已拒绝，档案恢复为未认领。');
      setReviewNote('');
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unknown error / 未知错误');
    } finally {
      setBusyClaimId(null);
    }
  }

  useEffect(() => { loadRows(); }, []);

  return (
    <SectionCard
      title="Claim Existing Account Review / 认领已有账号审核"
      subtitle="Review Customer Portal claim requests for offline or unclaimed profiles. Approval activates the Customer Portal link; rejection keeps the profile unclaimed. / 审核客户门户认领申请；批准后激活客户门户关联，拒绝后保持未认领。"
    >
      <div id="claim-existing-account-review" className="scroll-mt-32 space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-100">
            Customer self-service creates <b>customer_account_claims</b>. Admin approval must write Audit Logs and must not create or reveal passwords. / 客户自助认领会创建 <b>customer_account_claims</b>，后台审核必须写入审计日志，不得创建或查看客户密码。
          </div>
          <button type="button" onClick={loadRows} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700">
            Refresh / 刷新
          </button>
        </div>

        <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="min-h-[86px] w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Review note / 审核备注（拒绝时必填，批准时建议填写）" />
        {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-950 ring-1 ring-blue-100">{message}</div> : null}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="grid grid-cols-[minmax(180px,1fr)_160px_150px_130px_170px_220px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            <span>Customer / 客户</span><span>Identifier / 识别</span><span>Claim / 认领</span><span>Status / 状态</span><span>Created / 创建</span><span>Actions / 操作</span>
          </div>
          {loading ? (
            <div className="px-4 py-8 text-sm font-bold text-slate-500">Loading... / 加载中...</div>
          ) : rows.length ? rows.map((row) => (
            <div key={row.customer_account_claim_id} className="grid grid-cols-[minmax(180px,1fr)_160px_150px_130px_170px_220px] gap-3 border-t border-slate-100 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-black text-slate-950">{row.customers?.name || 'Unclaimed Customer'}</div>
                <div className="truncate text-xs font-bold text-activeBlue">{row.customer_id}</div>
              </div>
              <div className="min-w-0 text-xs font-bold text-slate-600">
                <div className="truncate">{row.claim_identifier || '-'}</div>
                <div className="truncate text-slate-400">{row.customers?.phone || row.customers?.email || '-'}</div>
              </div>
              <div className="text-xs font-bold text-slate-600">{row.claim_method || '-'}<br />OTP: {row.otp_verified ? 'yes' : 'pending'}</div>
              <div><Badge tone={tone(row.status)}>{row.status || 'pending'}</Badge></div>
              <div className="text-xs font-bold text-slate-600">{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busyClaimId === row.customer_account_claim_id} onClick={() => reviewClaim(row.customer_account_claim_id, 'approve')} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Approve</button>
                <button type="button" disabled={busyClaimId === row.customer_account_claim_id} onClick={() => reviewClaim(row.customer_account_claim_id, 'reject')} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:opacity-50">Reject</button>
              </div>
            </div>
          )) : (
            <div className="px-4 py-8 text-sm font-bold text-slate-500">No pending claim requests. / 暂无待审核认领申请。</div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
