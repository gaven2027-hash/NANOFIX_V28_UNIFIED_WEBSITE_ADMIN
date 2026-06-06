'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;

type Chain = {
  customer?: Row;
  service_requests?: Row[];
  jobs?: Row[];
  quotations?: Row[];
  invoices?: Row[];
  payments?: Row[];
  warranties?: Row[];
  status_logs?: Row[];
  linkage?: Record<string, number>;
};

type State = {
  loading: boolean;
  degraded: boolean;
  errors: string[];
  counts: Record<string, number>;
  chains: Chain[];
  refreshedAt: string | null;
};

function text(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return fallback;
}

function money(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? `SGD ${amount.toFixed(2)}` : '—';
}

function shortId(value: unknown) {
  return typeof value === 'string' && value ? value.slice(0, 8) : '—';
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function MiniList({ title, rows, amountField }: { title: string; rows: Row[]; amountField?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-black text-slate-900">{title}</h4>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">{rows.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.slice(0, 3).map((row, index) => (
          <div key={`${title}-${index}-${shortId(row.service_request_id ?? row.job_id ?? row.quotation_id ?? row.invoice_id ?? row.payment_id ?? row.warranty_id)}`} className="rounded-xl bg-white p-3 text-xs ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-slate-800">{shortId(row.service_request_id ?? row.job_id ?? row.quotation_id ?? row.invoice_id ?? row.payment_id ?? row.warranty_id)}</span>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-activeBlue ring-1 ring-blue-100">{text(row.status ?? row.approval_status, 'open')}</span>
            </div>
            {amountField ? <div className="mt-2 font-black text-slate-700">{money(row[amountField])}</div> : null}
            <div className="mt-1 text-[11px] font-semibold text-slate-500">{formatDate(row.created_at ?? row.scheduled_at ?? row.starts_at)}</div>
          </div>
        )) : (
          <div className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-500 ring-1 ring-dashed ring-slate-200">No linked record / 暂无关联记录</div>
        )}
      </div>
    </div>
  );
}

async function loadLinkage(): Promise<State> {
  const response = await fetch('/api/admin/customer-service-linkage?limit=20', {
    credentials: 'same-origin',
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  return {
    loading: false,
    degraded: !response.ok || Boolean(payload.degraded),
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    counts: payload.counts && typeof payload.counts === 'object' ? payload.counts : {},
    chains: Array.isArray(payload.chains) ? payload.chains : [],
    refreshedAt: new Date().toISOString()
  };
}

export function CustomerServiceLinkageWorkspace() {
  const [state, setState] = useState<State>({
    loading: true,
    degraded: false,
    errors: [],
    counts: {},
    chains: [],
    refreshedAt: null
  });

  async function refresh() {
    setState((current) => ({ ...current, loading: true }));
    try {
      setState(await loadLinkage());
    } catch (error) {
      setState({
        loading: false,
        degraded: true,
        errors: [`Customer-service linkage API blocked or not connected: ${error instanceof Error ? error.message : String(error)}`],
        counts: {},
        chains: [],
        refreshedAt: new Date().toISOString()
      });
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <section id="customer-service-linkage" className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-activeBlue p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/75">V28.4.6 Customer ↔ Service Linkage / 客户与业务双向联动</div>
            <h2 className="mt-2 text-2xl font-black">Customer Portal ↔ Service Operations</h2>
            <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-white/90">
              Read-only view joining customers, portal requests, jobs, quotations, invoices, payments, warranties and status logs. / 只读串联客户、门户请求、工单、报价、发票、付款、保修和状态日志。
            </p>
          </div>
          <button type="button" onClick={() => void refresh()} className="rounded-2xl bg-white/20 px-4 py-2 text-xs font-black ring-1 ring-white/30 hover:bg-white/30">
            {state.loading ? 'Refreshing... / 刷新中...' : 'Refresh Linkage / 刷新联动'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <CountCard label="Customers" value={state.counts.customers ?? 0} />
          <CountCard label="Requests" value={state.counts.service_requests ?? 0} />
          <CountCard label="Jobs" value={state.counts.jobs ?? 0} />
          <CountCard label="Quotes" value={state.counts.quotations ?? 0} />
          <CountCard label="Invoices" value={state.counts.invoices ?? 0} />
          <CountCard label="Payments" value={state.counts.payments ?? 0} />
          <CountCard label="Warranties" value={state.counts.warranties ?? 0} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        {state.degraded ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            Linkage returned warnings / 联动读取有警告：{state.errors.join(' | ') || 'Unknown warning'}
          </div>
        ) : null}

        <div className="rounded-2xl bg-slate-50 p-4 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
          Refreshed: {state.refreshedAt ? formatDate(state.refreshedAt) : '—'} · Chains: {state.chains.length}
        </div>

        {state.chains.length ? state.chains.map((chain, index) => {
          const customer = chain.customer ?? {};
          return (
            <article key={`${shortId(customer.customer_id)}-${index}`} className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-activeBlue">Customer / 客户</div>
                  <h3 className="mt-1 text-lg font-black text-slate-950">{text(customer.name, 'Unnamed customer')} · {shortId(customer.customer_id)}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{text(customer.phone)} · {text(customer.email)} · {text(customer.binding_status)}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-activeBlue ring-1 ring-blue-100">{text(customer.account_status, 'active')}</span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-6">
                <MiniList title="Requests / 报修" rows={chain.service_requests ?? []} />
                <MiniList title="Jobs / 工单" rows={chain.jobs ?? []} />
                <MiniList title="Quotations / 报价" rows={chain.quotations ?? []} amountField="total" />
                <MiniList title="Invoices / 发票" rows={chain.invoices ?? []} amountField="total" />
                <MiniList title="Payments / 付款" rows={chain.payments ?? []} amountField="amount" />
                <MiniList title="Warranties / 保修" rows={chain.warranties ?? []} />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-black text-slate-900">Recent Status Logs / 最近状态日志</div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {(chain.status_logs ?? []).length ? (chain.status_logs ?? []).slice(0, 4).map((log, logIndex) => (
                    <div key={`${shortId(log.transition_id)}-${logIndex}`} className="rounded-xl bg-white p-3 text-xs ring-1 ring-slate-200">
                      <div className="font-black text-slate-800">{text(log.machine)}: {text(log.from_status)} → {text(log.to_status)}</div>
                      <div className="mt-1 text-slate-500">{text(log.reason)} · {formatDate(log.created_at)}</div>
                    </div>
                  )) : (
                    <div className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-500 ring-1 ring-dashed ring-slate-200">No status log linked / 暂无状态日志</div>
                  )}
                </div>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
            {state.loading ? 'Loading customer-service linkage... / 正在读取客户与业务联动...' : 'No customer-service linkage records found. / 暂无客户业务联动记录。'}
          </div>
        )}
      </div>
    </section>
  );
}