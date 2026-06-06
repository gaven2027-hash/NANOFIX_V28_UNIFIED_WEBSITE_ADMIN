'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type Payload = {
  ok?: boolean;
  error?: string;
  customers?: Row[];
  service_requests?: Row[];
  warranty_claims?: Row[];
  jobs?: Row[];
  quotations?: Row[];
  invoices?: Row[];
  payments?: Row[];
  warranties?: Row[];
};

type State = { loading: boolean; error: string | null; payload: Payload | null };

const sections: Array<{ key: keyof Payload; title: string; zh: string; empty: string; fields: string[]; id: string }> = [
  { key: 'service_requests', title: 'Repair Requests', zh: '报修记录', empty: 'No repair requests yet. / 暂无报修记录。', fields: ['status', 'leak_location', 'issue_description', 'address_text', 'created_at'], id: 'repair-requests' },
  { key: 'warranty_claims', title: 'Warranty Claim Tracking', zh: '保修维修申请跟踪', empty: 'No warranty claims yet. / 暂无保修维修申请。', fields: ['status', 'related_warranty_id', 'warranty_claim_decision', 'warranty_claim_next_action', 'warranty_claim_routing_status', 'warranty_claim_routed_job_id', 'warranty_claim_routed_quotation_id', 'warranty_claim_reviewed_at', 'warranty_claim_routed_at'], id: 'warranty-claims' },
  { key: 'jobs', title: 'Jobs & Site Works', zh: '工单与施工', empty: 'No jobs yet. / 暂无工单。', fields: ['status', 'scheduled_at', 'notes', 'created_at'], id: 'jobs' },
  { key: 'quotations', title: 'Quotations', zh: '报价', empty: 'No customer-visible quotations yet. / 暂无客户可见报价。', fields: ['quotation_id', 'job_id', 'service_request_id', 'current_version', 'total', 'approval_status', 'visible_to_customer', 'public_ref', 'created_at'], id: 'quotations' },
  { key: 'invoices', title: 'Invoices', zh: '发票', empty: 'No customer-visible invoices yet. / 暂无客户可见发票。', fields: ['invoice_no', 'total', 'status', 'visible_to_customer', 'public_ref', 'created_at'], id: 'invoices' },
  { key: 'payments', title: 'Payments', zh: '付款', empty: 'No customer-visible payments yet. / 暂无客户可见付款记录。', fields: ['amount', 'status', 'fee', 'reconciled_at', 'visible_to_customer', 'created_at'], id: 'payments' },
  { key: 'warranties', title: 'Warranties', zh: '保修', empty: 'No customer-visible warranties yet. / 暂无客户可见保修记录。', fields: ['status', 'coverage', 'starts_at', 'ends_at', 'visible_to_customer', 'public_ref', 'created_at'], id: 'warranties' }
];

async function loadRecords() {
  const response = await fetch('/api/customer-portal/records?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Payload | null = null;
  try { payload = text ? JSON.parse(text) as Payload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer records API returned ${response.status}`);
  return payload ?? { ok: true };
}

async function postQuotationResponse(quotationId: string, responseType: string, customerMessage: string) {
  const response = await fetch('/api/customer-portal/quotations/respond', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      quotation_id: quotationId,
      response_type: responseType,
      customer_message: customerMessage
    })
  });

  const text = await response.text();
  let payload: { ok?: boolean; error?: string } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Quotation response API returned ${response.status}`);
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

function warrantyClaimHref(row: Row) {
  const id = typeof row.service_request_id === 'string' ? row.service_request_id : '';
  return id ? `/customer-portal/warranty-claims/${id}` : '';
}

function QuotationActions({ row, onDone }: { row: Row; onDone: () => Promise<void> }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quotationId = typeof row.quotation_id === 'string' ? row.quotation_id : '';
  const approvalStatus = String(row.approval_status ?? '');
  const terminal = approvalStatus === 'customer_accepted' || approvalStatus === 'customer_declined';

  async function submit(responseType: 'accept' | 'request_revision' | 'decline') {
    setError(null);
    setNotice(null);

    if (!quotationId) {
      setError('Missing quotation id. / 缺少报价 ID。');
      return;
    }

    if ((responseType === 'request_revision' || responseType === 'decline') && message.trim().length < 3) {
      setError('Please leave a short message. / 请填写简短说明。');
      return;
    }

    setBusy(true);
    try {
      await postQuotationResponse(quotationId, responseType, message.trim());
      setNotice(responseType === 'accept'
        ? 'Quotation accepted. / 已确认报价。'
        : responseType === 'request_revision'
          ? 'Revision request submitted. / 修改请求已提交。'
          : 'Quotation declined. / 已拒绝报价。'
      );
      setMessage('');
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-blue-100">
      <div className="text-xs font-black text-slate-900">Quotation Action / 报价操作</div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        placeholder="Message for revision or decline / 如需修改或拒绝，请填写说明"
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy || terminal} onClick={() => void submit('accept')} className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">Accept Quote / 确认报价</button>
        <button type="button" disabled={busy || terminal} onClick={() => void submit('request_revision')} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Request Revision / 要求修改</button>
        <button type="button" disabled={busy || terminal} onClick={() => void submit('decline')} className="rounded-2xl bg-slate-700 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50">Decline / 拒绝</button>
      </div>
      {terminal ? <div className="mt-2 text-xs font-bold text-slate-500">This quotation already has a final customer response. / 此报价已有最终客户回复。</div> : null}
      {notice ? <div className="mt-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200">{notice}</div> : null}
      {error ? <div className="mt-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-900 ring-1 ring-red-200">{error}</div> : null}
    </div>
  );
}

function Section({ id, title, zh, empty, rows, fields, onRefresh }: { id: string; title: string; zh: string; empty: string; rows: Row[]; fields: string[]; onRefresh: () => Promise<void> }) {
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
        {rows.map((row, index) => {
          const detailHref = id === 'warranty-claims' ? warrantyClaimHref(row) : '';
          return (
            <article key={`${rowTitle(row)}-${index}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-black text-slate-950">{rowTitle(row)}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.visible_to_customer !== undefined ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-activeBlue ring-1 ring-blue-100">Customer Visible</span> : null}
                  {detailHref ? <Link href={detailHref} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">View / 查看</Link> : null}
                </div>
              </div>
              <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                {fields.map((field) => (
                  <div key={field}>
                    <dt className="font-black uppercase tracking-[0.08em] text-slate-400">{field}</dt>
                    <dd className="mt-1 font-semibold text-slate-700">{formatValue(row[field])}</dd>
                  </div>
                ))}
              </dl>
              {id === 'quotations' ? <QuotationActions row={row} onDone={onRefresh} /> : null}
            </article>
          );
        })}
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
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">View your own repair requests, warranty claim progress, jobs, quotations, invoices, payments and warranties. You can accept, decline or request revision for customer-visible quotations. / 查看自己的报修、保修维修申请、工单、报价、发票、付款与保修；客户可对可见报价进行确认、拒绝或要求修改。</p>
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
          return <Section key={section.key} id={section.id} title={section.title} zh={section.zh} empty={section.empty} rows={sectionRows} fields={section.fields} onRefresh={refresh} />;
        })}
      </div>
    </div>
  );
}