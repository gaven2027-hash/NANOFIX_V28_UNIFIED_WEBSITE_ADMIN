'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type CustomerRow = {
  customer_id: string;
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  portal_status: string | null;
  binding_status: string | null;
  created_source: string | null;
  created_at: string | null;
};

type DuplicateGroup = {
  match_key: string;
  match_type: 'phone' | 'email';
  customers: CustomerRow[];
};

type ApiResult = {
  ok: boolean;
  rows?: DuplicateGroup[];
  error?: string;
};

function tone(status: string | null): 'blue' | 'green' | 'amber' | 'red' {
  if (status === 'linked' || status === 'claimed' || status === 'active') return 'green';
  if (status === 'merged' || status === 'archived') return 'red';
  if (status === 'manual_review' || status === 'claim_pending') return 'amber';
  return 'blue';
}

async function sessionHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

export function CustomerMergeCenterPanel() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const selectedGroup = useMemo(() => groups.find((group) => group.match_key === selectedKey) ?? groups[0] ?? null, [groups, selectedKey]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/customers/merge-center', {
        headers: await sessionHeaders(),
        cache: 'no-store'
      });
      const data = (await response.json().catch(() => ({}))) as ApiResult;
      if (!response.ok || !data.ok) {
        setGroups([]);
        setMessage(data.error || 'Unable to load duplicate customer groups. / 无法加载重复客户组。');
        return;
      }
      const rows = data.rows || [];
      setGroups(rows);
      setSelectedKey((current) => current ?? rows[0]?.match_key ?? null);
      const firstCustomer = rows[0]?.customers?.[0];
      if (firstCustomer) {
        setPrimaryId(firstCustomer.customer_id);
        setDuplicateIds(rows[0].customers.slice(1).map((customer) => customer.customer_id));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unknown error / 未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  function selectGroup(group: DuplicateGroup) {
    setSelectedKey(group.match_key);
    const firstCustomer = group.customers[0];
    setPrimaryId(firstCustomer?.customer_id ?? null);
    setDuplicateIds(group.customers.slice(1).map((customer) => customer.customer_id));
    setNote('');
  }

  function toggleDuplicate(customerId: string) {
    if (customerId === primaryId) return;
    setDuplicateIds((current) => current.includes(customerId) ? current.filter((id) => id !== customerId) : [...current, customerId]);
  }

  async function submitMerge() {
    if (!primaryId || !duplicateIds.length) {
      setMessage('Select a primary customer and at least one duplicate. / 请选择主客户和至少一个重复客户。');
      return;
    }
    if (!note.trim()) {
      setMessage('Merge note is required for audit. / 合并备注为审计必填。');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/customers/merge-center', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(await sessionHeaders()) },
        body: JSON.stringify({ primary_customer_id: primaryId, duplicate_customer_ids: duplicateIds, note })
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setMessage(data.error || 'Merge failed. / 合并失败。');
        return;
      }
      setMessage('Customers merged and audited successfully. / 客户档案已合并并写入审计。');
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
      title="Customer Merge Center / 客户档案合并中心"
      subtitle="Find duplicate customer profiles by phone or email, move linked service records and documents to one primary customer, then archive duplicates with full audit history. / 按电话或邮箱发现重复客户档案，将服务记录和文件统一迁移到主客户，并归档重复档案、保留完整审计。"
    >
      <div id="binding-review-merge" className="scroll-mt-32 space-y-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <div className="grid grid-cols-[minmax(160px,1fr)_120px_120px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <span>Duplicate Group / 重复组</span><span>Type / 类型</span><span>Count / 数量</span>
            </div>
            {loading ? (
              <div className="px-4 py-8 text-sm font-bold text-slate-500">Loading... / 加载中...</div>
            ) : groups.length ? groups.map((group) => (
              <button key={group.match_key} type="button" onClick={() => selectGroup(group)} className={`grid w-full grid-cols-[minmax(160px,1fr)_120px_120px] gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-blue-50 ${selectedGroup?.match_key === group.match_key ? 'bg-sky-50' : 'bg-white'}`}>
                <span className="truncate font-black text-slate-950">{group.match_key}</span>
                <span><Badge tone={group.match_type === 'phone' ? 'blue' : 'amber'}>{group.match_type}</Badge></span>
                <span className="font-black text-activeBlue">{group.customers.length}</span>
              </button>
            )) : (
              <div className="px-4 py-8 text-sm font-bold text-slate-500">No duplicate customer groups found. / 暂未发现重复客户组。</div>
            )}
          </div>

          <aside className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Merge Review / 合并审核</div>
                <h3 className="mt-2 text-xl font-black text-slate-950">{selectedGroup?.match_key || 'Select a group'}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">Choose one primary customer. Duplicate records will be archived, not deleted. / 选择一个主客户，重复档案只归档不删除。</p>
              </div>
              <button type="button" onClick={loadRows} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-blue-50">Refresh</button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedGroup?.customers?.map((customer) => (
                <div key={customer.customer_id} className={`rounded-2xl border p-4 ${primaryId === customer.customer_id ? 'border-activeBlue bg-sky-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-950">{customer.name || 'Unnamed Customer'}</div>
                      <div className="mt-1 truncate text-xs font-bold text-slate-500">{customer.customer_id}</div>
                      <div className="mt-1 truncate text-xs font-bold text-slate-500">{customer.phone || customer.whatsapp || '-'} · {customer.email || '-'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2"><Badge tone={tone(customer.portal_status)}>{customer.portal_status || 'unclaimed'}</Badge><Badge tone={tone(customer.binding_status)}>{customer.binding_status || 'pending'}</Badge></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setPrimaryId(customer.customer_id); setDuplicateIds((selectedGroup?.customers || []).filter((row) => row.customer_id !== customer.customer_id).map((row) => row.customer_id)); }} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Set Primary</button>
                    <button type="button" disabled={primaryId === customer.customer_id} onClick={() => toggleDuplicate(customer.customer_id)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:opacity-40">{duplicateIds.includes(customer.customer_id) ? 'Remove Duplicate' : 'Mark Duplicate'}</button>
                  </div>
                </div>
              ))}
            </div>

            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-4 min-h-[88px] w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Merge note / 合并备注（必填）" />
            {message ? <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-950 ring-1 ring-blue-100">{message}</div> : null}
            <button type="button" disabled={busy || !primaryId || !duplicateIds.length} onClick={submitMerge} className="mt-4 w-full rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Merge Selected Customers / 合并选中客户</button>
          </aside>
        </div>
      </div>
    </SectionCard>
  );
}
