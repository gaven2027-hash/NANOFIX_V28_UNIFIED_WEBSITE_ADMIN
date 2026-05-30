'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type Payload = {
  ok?: boolean;
  error?: string;
  customers?: Row[];
  service_requests?: Row[];
  warranty_claims?: Row[];
  jobs?: Row[];
  invoices?: Row[];
  payments?: Row[];
  warranties?: Row[];
};

type State = { loading: boolean; error: string | null; payload: Payload | null };

const sections: Array<{ key: keyof Payload; title: string; zh: string; empty: string; fields: string[]; id: string }> = [
  { key: 'service_requests', title: 'Repair Requests', zh: '报修记录', empty: 'No repair requests yet. / 暂无报修记录。', fields: ['status', 'leak_location', 'issue_description', 'address_text', 'created_at'], id: 'repair-requests' },
  { key: 'warranty_claims', title: 'Warranty Claim Tracking', zh: '保修维修申请跟踪', empty: 'No warranty claims yet. / 暂无保修维修申请。', fields: ['status', 'related_warranty_id', 'warranty_claim_decision', 'warranty_claim_next_action', 'warranty_claim_routing_status', 'warranty_claim_routed_job_id', 'warranty_claim_routed_quotation_id', 'warranty_claim_reviewed_at', 'warranty_claim_routed_at'], id: 'warranty-claims' },
  { key: 'jobs', title: 'Jobs & Site Works', zh: '工单与施工', empty: 'No jobs yet. / 暂无工单。', fields: ['status', 'scheduled_at', 'notes', 'created_at'], id: 'jobs' },
  { key: 'invoices', title: 'Invoices', zh: '发票', empty: 'No invoices yet. / 暂无发票。', fields: ['invoice_no', 'total', 'status', 'visible_to_customer', 'public_ref', 'created_at'], id: 'invoices' },
  { key: 'payments', title: 'Payments', zh: '付款', empty: 'No payments yet. / 暂无付款记录。', fields: ['amount', 'status', 'fee', 'reconciled_at', 'visible_to_customer', 'created_at'], id: 'payments' },
  { key: 'warranties', title: 'Warranties', zh: '保修', empty: 'No warranties yet. / 暂无保修记录。', fields: ['status', 'coverage', 'starts_at', 'ends_at', 'visible_to_customer', 'public_ref', 'created_at'], id: 'warranties' }
];

async function loadRecords() {
  const response = await fetch('/api/customer-portal/records?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Payload | null = null;
  try { payload = text ? JSON.parse(text) as Payload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer records API returned ${response.status}`);
  return payload ?? { ok: true };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    }
    return value;
  }
  return JSON.stringify(value);
}

function rowTitle(row: Row) {
  const id = Object.entries(row).find(([key]) => key.endsWith('_id'))?.[1];
  return typeof id === 'string' ? id.slice(0, 8) : 'Record';
}

function Section({ id, title, zh, empty, rows, fields }: { id: string; title: string; zh: string; empty: string; rows: Row[]; fields: string[] }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <div className="text-xs font-bold text-activeBlue">{zh}</div>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-activeBlue ring-1 ring-blue-100">{rows.length}</span>
      </div>
      <div className="mt-4 grid gap-3">
        {!rows.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">{empty}</div> : null}
        {rows.map((row, index) => (
          <article key={`${rowTitle(row)}-${index}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-950">{rowTitle(row)}</div>
              {row.visible_to_customer !== undefined ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-activeBlue ring-1 ring-blue-100">Customer Visible</span> : null}
            </div>
            <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
              {fields.map((field) => (
                <div key={field}>
                  <dt className="font-black uppercase tracking-[0.08em] text-slate-400">{field}</dt>
                  <dd className="mt-1 font-semibold text-slate-700">{formatValue(row[field])}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CustomerPortalRecordsOverview() {
  const [state, setState] = useState<State>({ loading: true, error: null, payload: null });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await loadRecords();
      setState({ loading: false, error: null, payload });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), payload: null });
    }
  }

  useEffect(() => { void refresh(); }, []);

  const customers = Array.isArray(state.payload?.customers) ? state.payload.customers : [];

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Portal / 客户门户</div>
            <h1 className="mt-2 text-2xl font-black text-slate-950">My NANOFIX Records</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">View your own repair requests, warranty claim progress, jobs, invoices, payments and warranties. All records are filtered by your linked customer profile. / 查看自己的报修、保修维修申请进度、工单、发票、付款与保修；所有记录按已绑定客户资料过滤。</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
        </div>
        {customers.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{customers.map((customer, index) => <div key={String(customer.customer_id ?? index)} className="rounded-2xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-100"><div className="font-black">{formatValue(customer.name)}</div><div className="mt-1">{formatValue(customer.phone)} · {formatValue(customer.email)}</div></div>)}</div> : null}
        {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {!state.error && state.loading ? <div className="mt-5 rounded-3xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading customer records… / 正在读取客户记录…</div> : null}
      </div>

      <div className="grid gap-5">
        {sections.map((section) => {
          const sectionRows = Array.isArray(state.payload?.[section.key]) ? state.payload?.[section.key] as Row[] : [];
          return <Section key={section.key} id={section.id} title={section.title} zh={section.zh} empty={section.empty} rows={sectionRows} fields={section.fields} />;
        })}
      </div>
    </div>
  );
}
