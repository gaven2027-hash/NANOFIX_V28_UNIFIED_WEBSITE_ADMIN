'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Customer = {
  customer_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  portal_status: string | null;
  binding_status: string | null;
};

type TimelineEvent = {
  event_id: string;
  event_type: string;
  title: string;
  description: string;
  happened_at: string;
  status?: string | null;
  source_table: string;
  source_id: string;
};

type TimelineResult = {
  ok: boolean;
  customer?: Customer;
  rows?: TimelineEvent[];
  error?: string;
};

function tone(status: string | null | undefined): 'blue' | 'green' | 'amber' | 'red' {
  if (!status) return 'blue';
  if (['approved', 'paid', 'active', 'linked', 'claimed', 'completed', 'issued'].includes(status)) return 'green';
  if (['rejected', 'archived', 'failed', 'cancelled', 'void'].includes(status)) return 'red';
  if (['pending', 'pending_review', 'manual_review', 'draft', 'claim_pending'].includes(status)) return 'amber';
  return 'blue';
}

function eventTone(type: string): 'blue' | 'green' | 'amber' | 'red' {
  if (['payment', 'warranty', 'customer_profile'].includes(type)) return 'green';
  if (['audit', 'record_link', 'claim_existing_account'].includes(type)) return 'amber';
  if (['invoice', 'quotation'].includes(type)) return 'blue';
  return 'blue';
}

async function sessionHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

export function Customer360TimelinePanel() {
  const [customerId, setCustomerId] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rows, setRows] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const filteredRows = useMemo(() => filter === 'all' ? rows : rows.filter((row) => row.event_type === filter), [filter, rows]);
  const eventTypes = useMemo(() => ['all', ...Array.from(new Set(rows.map((row) => row.event_type)))], [rows]);

  const loadTimeline = useCallback(async (targetCustomerId?: string) => {
    const id = (targetCustomerId || customerId).trim();
    if (!id) {
      setMessage('Enter a customer_id to load the timeline. / 请输入 customer_id 加载时间线。');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/customers/timeline?customer_id=${encodeURIComponent(id)}`, {
        headers: await sessionHeaders(),
        cache: 'no-store'
      });
      const data = (await response.json().catch(() => ({}))) as TimelineResult;
      if (!response.ok || !data.ok) {
        setCustomer(null);
        setRows([]);
        setMessage(data.error || 'Unable to load customer timeline. / 无法加载客户时间线。');
        return;
      }
      setCustomer(data.customer || null);
      setRows(data.rows || []);
      setFilter('all');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unknown error / 未知错误');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  function exportCsv() {
    const header = ['happened_at', 'event_type', 'title', 'description', 'status', 'source_table', 'source_id'];
    const csv = [header.join(','), ...filteredRows.map((row) => header.map((key) => `"${String(row[key as keyof TimelineEvent] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nanofix-customer-timeline-${customer?.customer_id || 'customer'}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('customer_id');
    if (id) {
      setCustomerId(id);
      loadTimeline(id);
    }
  }, [loadTimeline]);

  return (
    <SectionCard
      title="Customer 360 Timeline / 客户 360 生命周期时间线"
      subtitle="Load one customer and see linked lead, service request, quotation, invoice, payment, warranty, claim, binding, merge and audit activity in one chronological view. / 输入客户 ID，统一查看线索、报修、报价、发票、付款、保修、认领、绑定、合并与审计记录。"
    >
      <div id="customer-360-timeline" className="scroll-mt-32 space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <input value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue" placeholder="customer_id / 客户 ID" />
          <button type="button" disabled={loading} onClick={() => loadTimeline()} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Load Timeline / 加载时间线</button>
          <button type="button" disabled={!filteredRows.length} onClick={exportCsv} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-200 disabled:opacity-50">Export CSV / 导出</button>
        </div>

        {customer ? (
          <div className="grid gap-3 rounded-3xl bg-blue-50 p-4 ring-1 ring-blue-100 md:grid-cols-[1fr_auto_auto]">
            <div><div className="text-lg font-black text-slate-950">{customer.name || 'Unnamed Customer'}</div><div className="text-xs font-bold text-slate-600">{customer.customer_id} · {customer.phone || '-'} · {customer.email || '-'}</div></div>
            <Badge tone={tone(customer.portal_status)}>{customer.portal_status || 'portal_unknown'}</Badge>
            <Badge tone={tone(customer.binding_status)}>{customer.binding_status || 'binding_unknown'}</Badge>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {eventTypes.map((type) => (
            <button key={type} type="button" onClick={() => setFilter(type)} className={`rounded-full px-3 py-2 text-xs font-black ${filter === type ? 'bg-activeBlue text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50'}`}>{type}</button>
          ))}
        </div>

        {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-950 ring-1 ring-blue-100">{message}</div> : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          {loading ? (
            <div className="py-8 text-sm font-bold text-slate-500">Loading... / 加载中...</div>
          ) : filteredRows.length ? (
            <div className="space-y-4">
              {filteredRows.map((row) => (
                <div key={row.event_id} className="grid gap-3 border-l-4 border-slate-200 pl-4 md:grid-cols-[170px_1fr_auto]">
                  <div className="text-xs font-black text-slate-500">{row.happened_at ? new Date(row.happened_at).toLocaleString() : '-'}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><Badge tone={eventTone(row.event_type)}>{row.event_type}</Badge><span className="font-black text-slate-950">{row.title}</span></div>
                    <div className="mt-1 text-sm font-bold leading-6 text-slate-600">{row.description}</div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400">{row.source_table} · {row.source_id}</div>
                  </div>
                  <div>{row.status ? <Badge tone={tone(row.status)}>{row.status}</Badge> : null}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-sm font-bold text-slate-500">No timeline loaded yet. / 尚未加载时间线。</div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
