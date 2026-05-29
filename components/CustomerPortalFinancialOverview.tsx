'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type Payload = {
  ok?: boolean;
  error?: string;
  quotations?: Row[];
  quotation_versions?: Row[];
  invoices?: Row[];
  payments?: Row[];
};

type State = { loading: boolean; error: string | null; payload: Payload | null };
type AcceptState = { loadingId: string | null; message: string | null; error: string | null; result: Row | null };

async function loadFinancial() {
  const response = await fetch('/api/customer-portal/financial?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Payload | null = null;
  try { payload = text ? JSON.parse(text) as Payload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer financial API returned ${response.status}`);
  return payload ?? { ok: true };
}

async function acceptQuotation(quotationId: string) {
  const response = await fetch('/api/customer-portal/quote-acceptance', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ quotation_id: quotationId })
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Quote acceptance API returned ${response.status}`);
  return payload ?? { ok: true };
}

function rows(payload: Payload | null, key: keyof Payload) {
  const value = payload?.[key];
  return Array.isArray(value) ? value : [];
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
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

function idTitle(row: Row) {
  const candidate = row.invoice_no || row.public_ref || row.quotation_id || row.invoice_id || row.payment_id;
  return typeof candidate === 'string' ? candidate : 'Record';
}

function FinanceCard({ row, type, onAccept, accepting }: { row: Row; type: 'quotation' | 'invoice' | 'payment'; onAccept?: (quotationId: string) => void; accepting?: boolean }) {
  const pdfUrl = typeof row.pdf_download_url === 'string' ? row.pdf_download_url : '';
  const paymentUrl = typeof row.payment_url === 'string' ? row.payment_url : '';
  const quotationId = typeof row.quotation_id === 'string' ? row.quotation_id : '';
  const status = row.approval_status ?? row.status;
  const canAccept = type === 'quotation' && quotationId && row.approval_status !== 'customer_accepted';
  return (
    <article className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-black text-slate-950">{idTitle(row)}</div>
          <div className="mt-1 text-xs font-bold text-activeBlue">{type.toUpperCase()} · {formatValue(status)}</div>
          <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600">
            <div>Total / 总额: {formatValue(row.total ?? row.amount)}</div>
            <div>Created / 创建: {formatValue(row.created_at)}</div>
            {row.customer_visibility_notes ? <div>Notes / 备注: {formatValue(row.customer_visibility_notes)}</div> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {pdfUrl ? <a href={pdfUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Download PDF / 下载PDF</a> : null}
          {canAccept ? <button type="button" onClick={() => onAccept?.(quotationId)} disabled={accepting} className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">{accepting ? 'Accepting… / 接受中…' : 'Accept Quote / 接受报价'}</button> : null}
          {paymentUrl ? <a href={paymentUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700">Pay Now / 立即付款</a> : null}
        </div>
      </div>
    </article>
  );
}

function Section({ id, title, zh, children, count }: { id: string; title: string; zh: string; children: React.ReactNode; count: number }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <div className="text-xs font-bold text-activeBlue">{zh}</div>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-activeBlue ring-1 ring-blue-100">{count}</span>
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

export function CustomerPortalFinancialOverview() {
  const [state, setState] = useState<State>({ loading: true, error: null, payload: null });
  const [acceptState, setAcceptState] = useState<AcceptState>({ loadingId: null, message: null, error: null, result: null });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await loadFinancial();
      setState({ loading: false, error: null, payload });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), payload: null });
    }
  }

  async function onAccept(quotationId: string) {
    setAcceptState({ loadingId: quotationId, message: null, error: null, result: null });
    try {
      const result = await acceptQuotation(quotationId);
      setAcceptState({ loadingId: null, message: 'Quotation accepted. NANOFIX will prepare the invoice and payment link. / 报价已接受，NANOFIX 将准备发票和付款链接。', error: null, result });
      await refresh();
    } catch (error) {
      setAcceptState({ loadingId: null, message: null, error: error instanceof Error ? error.message : String(error), result: null });
    }
  }

  useEffect(() => { void refresh(); }, []);

  const quotations = rows(state.payload, 'quotations');
  const quotationVersions = rows(state.payload, 'quotation_versions');
  const invoices = rows(state.payload, 'invoices');
  const payments = rows(state.payload, 'payments');

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Finance / 客户财务</div>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Quotations, Invoices & Payments</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Only customer-visible quotations, invoices and payments linked to your own NANOFIX records are shown. PDF links are short-lived signed URLs. / 这里只显示与您本人记录绑定并设置为客户可见的报价、发票和付款；PDF 为短时签名链接。</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
        </div>
        {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {acceptState.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{acceptState.error}</div> : null}
        {acceptState.message ? <div className="mt-5 rounded-3xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{acceptState.message}</div> : null}
        {!state.error && state.loading ? <div className="mt-5 rounded-3xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading financial records… / 正在读取财务记录…</div> : null}
      </section>

      <Section id="quotations" title="Quotations" zh="报价" count={quotations.length}>
        {!quotations.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer-visible quotations yet. / 暂无客户可见报价。</div> : quotations.map((row, index) => <FinanceCard key={String(row.quotation_id ?? index)} row={row} type="quotation" onAccept={(quotationId) => void onAccept(quotationId)} accepting={acceptState.loadingId === row.quotation_id} />)}
      </Section>

      {quotationVersions.length ? (
        <Section id="quotation-versions" title="Quotation Versions" zh="报价版本" count={quotationVersions.length}>
          {quotationVersions.map((row, index) => (
            <article key={String(row.version_id ?? index)} className="rounded-3xl bg-slate-50 p-5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              <div className="font-black text-slate-950">Version {formatValue(row.version)} / 版本 {formatValue(row.version)}</div>
              <div className="mt-1 text-activeBlue">Quotation / 报价: {formatValue(row.quotation_id)}</div>
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-3 ring-1 ring-slate-200">{formatValue(row.line_items)}</pre>
            </article>
          ))}
        </Section>
      ) : null}

      <Section id="invoices" title="Invoices" zh="发票" count={invoices.length}>
        {!invoices.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer-visible invoices yet. / 暂无客户可见发票。</div> : invoices.map((row, index) => <FinanceCard key={String(row.invoice_id ?? index)} row={row} type="invoice" />)}
      </Section>

      <Section id="payments" title="Payments" zh="付款" count={payments.length}>
        {!payments.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No payment records yet. / 暂无付款记录。</div> : payments.map((row, index) => <FinanceCard key={String(row.payment_id ?? index)} row={row} type="payment" />)}
      </Section>
    </div>
  );
}
