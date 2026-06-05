'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;

type Chain = {
  service_request?: Row;
  jobs?: Row[];
  quotations?: Row[];
  invoices?: Row[];
  payments?: Row[];
  warranties?: Row[];
  status_logs?: Row[];
  completeness?: Record<string, boolean>;
};

type FullChainState = {
  loading: boolean;
  refreshedAt: string | null;
  degraded: boolean;
  errors: string[];
  counts: Record<string, number>;
  chains: Chain[];
  orphanJobs: Row[];
};

function shortId(value: unknown) {
  return typeof value === 'string' && value ? value.slice(0, 8) : '—';
}

function text(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function money(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? `SGD ${amount.toFixed(2)}` : '—';
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusPill(value: unknown) {
  return (
    <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-sky-700 ring-1 ring-sky-100">
      {text(value, 'open')}
    </span>
  );
}

function CountBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-2 ring-1 ring-white/20">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function MiniColumn({ title, rows, amountField, statusField = 'status' }: { title: string; rows: Row[]; amountField?: string; statusField?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-black text-slate-900">{title}</h4>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">{rows.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.slice(0, 3).map((row, index) => (
          <div key={`${title}-${index}-${shortId(row.job_id ?? row.quotation_id ?? row.invoice_id ?? row.payment_id ?? row.warranty_id)}`} className="rounded-xl bg-white p-3 text-xs ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-slate-800">{shortId(row.job_id ?? row.quotation_id ?? row.invoice_id ?? row.payment_id ?? row.warranty_id)}</span>
              {statusPill(row[statusField])}
            </div>
            {amountField ? <div className="mt-2 font-black text-slate-700">{money(row[amountField])}</div> : null}
            <div className="mt-1 text-[11px] font-semibold text-slate-500">{formatDate(row.created_at ?? row.scheduled_at ?? row.starts_at)}</div>
          </div>
        )) : (
          <div className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-500 ring-1 ring-dashed ring-slate-200">No linked record yet / 暂无关联记录</div>
        )}
      </div>
    </div>
  );
}

async function loadFullChain(): Promise<FullChainState> {
  const response = await fetch('/api/admin/service-operations/full-chain?limit=20', {
    credentials: 'same-origin',
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({}));
  return {
    loading: false,
    refreshedAt: new Date().toISOString(),
    degraded: !response.ok || Boolean(payload.degraded),
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    counts: payload.counts && typeof payload.counts === 'object' ? payload.counts : {},
    chains: Array.isArray(payload.chains) ? payload.chains : [],
    orphanJobs: Array.isArray(payload.orphan_jobs) ? payload.orphan_jobs : []
  };
}

export function ServiceOperationsFullChainWorkspace() {
  const [state, setState] = useState<FullChainState>({
    loading: true,
    refreshedAt: null,
    degraded: false,
    errors: [],
    counts: {},
    chains: [],
    orphanJobs: []
  });

  async function refresh() {
    setState((current) => ({ ...current, loading: true }));
    try {
      setState(await loadFullChain());
    } catch (error) {
      setState({
        loading: false,
        refreshedAt: new Date().toISOString(),
        degraded: true,
        errors: [`Full chain API blocked or not connected: ${error instanceof Error ? error.message : String(error)}`],
        counts: {},
        chains: [],
        orphanJobs: []
      });
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <section id="service-operations-full-chain" className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-activeBlue p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/75">V28.4.5 Full Business Chain / 完整业务链路</div>
            <h2 className="mt-2 text-2xl font-black">Service Request → Job → Quotation → Invoice → Payment → Warranty</h2>
            <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-white/90">
              Read-only production-safe chain view. It links real Supabase records through guarded admin API and writes only audit-read logs. / 生产安全只读链路视图，通过受保护后台 API 串联真实数据，只写读取审计。
            </p>
          </div>
          <button type="button" onClick={() => void refresh()} className="rounded-2xl bg-white/20 px-4 py-2 text-xs font-black ring-1 ring-white/30 hover:bg-white/30">
            {state.loading ? 'Refreshing... / 刷新中...' : 'Refresh Full Chain / 刷新完整链路'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <CountBadge label="Requests" value={state.counts.service_requests ?? 0} />
          <CountBadge label="Jobs" value={state.counts.jobs ?? 0} />
          <CountBadge label="Quotes" value={state.counts.quotations ?? 0} />
          <CountBadge label="Invoices" value={state.counts.invoices ?? 0} />
          <CountBadge label="Payments" value={state.counts.payments ?? 0} />
          <CountBadge label="Warranties" value={state.counts.warranties ?? 0} />
          <CountBadge label="Chains" value={state.chains.length} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        {state.degraded ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            Full chain returned warnings / 完整链路返回警告：{state.errors.join(' | ') || 'Unknown warning'}
          </div>
        ) : null}

        <div className="rounded-2xl bg-slate-50 p-4 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
          Refreshed: {state.refreshedAt ? formatDate(state.refreshedAt) : '—'} · Orphan jobs: {state.orphanJobs.length}
        </div>

        {state.chains.length ? state.chains.map((chain, index) => {
          const request = chain.service_request ?? {};
          return (
            <article key={`${shortId(request.service_request_id)}-${index}`} className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-600">Service Request / 报修请求</div>
                  <h3 className="mt-1 text-lg font-black text-slate-950">{text(request.contact_name, 'Unnamed customer')} · {shortId(request.service_request_id)}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{text(request.issue_type)} · {text(request.leak_location)} · {text(request.address_text)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusPill(request.status)}
                  {statusPill(request.binding_status)}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-5">
                <MiniColumn title="Jobs / 工单" rows={chain.jobs ?? []} />
                <MiniColumn title="Quotations / 报价" rows={chain.quotations ?? []} amountField="total" statusField="approval_status" />
                <MiniColumn title="Invoices / 发票" rows={chain.invoices ?? []} amountField="total" />
                <MiniColumn title="Payments / 付款" rows={chain.payments ?? []} amountField="amount" />
                <MiniColumn title="Warranties / 保修" rows={chain.warranties ?? []} />
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
                    <div className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-500 ring-1 ring-dashed ring-slate-200">No transition log linked yet / 暂无流转日志</div>
                  )}
                </div>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
            {state.loading ? 'Loading full business chain... / 正在读取完整业务链路...' : 'No service request chain found yet. / 暂无业务链路记录。'}
          </div>
        )}
      </div>
    </section>
  );
}