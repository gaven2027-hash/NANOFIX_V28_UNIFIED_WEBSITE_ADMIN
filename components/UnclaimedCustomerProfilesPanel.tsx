'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type UnclaimedCustomer = {
  customer_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  portal_status: string | null;
  created_source: string | null;
  created_at: string | null;
};

type ApiResult = {
  ok: boolean;
  rows?: UnclaimedCustomer[];
  error?: string;
  skipped?: boolean;
};

function tone(status: string | null) {
  if (status === 'claimed' || status === 'active') return 'green';
  if (status === 'claim_pending') return 'blue';
  if (status === 'blocked' || status === 'archived') return 'red';
  return 'amber';
}

export function UnclaimedCustomerProfilesPanel() {
  const [rows, setRows] = useState<UnclaimedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadRows() {
    setLoading(true);
    setMessage('');
    try {
      const supabase = createBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/admin/customers/unclaimed', {
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store'
      });
      const data = (await response.json().catch(() => ({}))) as ApiResult;
      if (!response.ok || !data.ok) {
        setMessage(data.error || 'Unable to load unclaimed customers. / 无法加载未认领客户。');
        setRows([]);
        return;
      }
      setRows(data.rows || []);
      if (data.skipped) setMessage('Supabase is not configured. Showing empty state. / Supabase 未配置，显示空状态。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unknown error / 未知错误');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRows(); }, []);

  return (
    <SectionCard
      title="Unclaimed Customer Profiles / 未认领客户档案"
      subtitle="Admin-created offline customers that are linked to service records but have not yet claimed Customer Portal access. / 后台代录并已关联维修记录，但客户还没有认领客户门户账号的客户档案。"
    >
      <div id="unclaimed-customer-profiles" className="scroll-mt-32 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">
            These records can later be claimed by phone/email OTP. Admin should not set customer passwords. / 这些记录以后可通过手机或邮箱 OTP 认领；后台不应为客户设置密码。
          </div>
          <button type="button" onClick={loadRows} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700">
            Refresh / 刷新
          </button>
        </div>

        {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-950 ring-1 ring-blue-100">{message}</div> : null}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="grid grid-cols-[minmax(180px,1fr)_150px_180px_150px_170px_220px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            <span>Customer / 客户</span><span>Phone / 电话</span><span>Email / 邮箱</span><span>Status / 状态</span><span>Source / 来源</span><span>Actions / 操作</span>
          </div>
          {loading ? (
            <div className="px-4 py-8 text-sm font-bold text-slate-500">Loading... / 加载中...</div>
          ) : rows.length ? rows.map((row) => (
            <div key={row.customer_id} className="grid grid-cols-[minmax(180px,1fr)_150px_180px_150px_170px_220px] gap-3 border-t border-slate-100 px-4 py-3 text-sm">
              <div className="min-w-0"><div className="truncate font-black text-slate-950">{row.name || 'Unnamed Customer'}</div><div className="truncate text-xs font-bold text-activeBlue">{row.customer_id}</div></div>
              <div className="font-bold text-slate-600">{row.phone || '-'}</div>
              <div className="truncate font-bold text-slate-600">{row.email || '-'}</div>
              <div><Badge tone={tone(row.portal_status)}>{row.portal_status || 'unclaimed'}</Badge></div>
              <div className="font-bold text-slate-600">{row.created_source || 'admin_offline_entry'}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-blue-50">View</button>
                <button type="button" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-blue-50">Merge</button>
                <button type="button" className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Send Claim Link</button>
              </div>
            </div>
          )) : (
            <div className="px-4 py-8 text-sm font-bold text-slate-500">No unclaimed customer profiles yet. / 暂无未认领客户档案。</div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
