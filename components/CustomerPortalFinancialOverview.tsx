'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type QuoteResponseType = 'accepted' | 'declined' | 'revision_requested';
type Payload = {
  ok?: boolean;
  error?: string;
  quotations?: Row[];
  quotation_versions?: Row[];
  invoices?: Row[];
  payments?: Row[];
};

type State = { loading: boolean; error: string | null; payload: Payload | null };
type ResponseState = { loadingId: string | null; message: string | null; error: string | null; result: Row | null };

async function loadFinancial() {
  const response = await fetch('/api/customer-portal/financial?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Payload | null = null;
  try { payload = text ? JSON.parse(text) as Payload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer financial API returned ${response.status}`);
  return payload ?? { ok: true };
}

async function submitQuoteResponse(quotationId: string, responseType: QuoteResponseType, customerMessage: string) {
  const response = await fetch('/api/customer-portal/quote-acceptance', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ quotation_id: quotationId, response_type: responseType, customer_message: customerMessage })
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Quote response API returned ${response.status}`);
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

function FinanceCard({ row, type, onRespond, responding }: { row: Row; type: 'quotation' | 'invoice' | 'payment'; onRespond?: (quotationId: string, responseType: QuoteResponseType, message: string) => void; responding?: boolean }) {
  const [message, setMessage] = useState('');
  const pdfUrl = typeof row.pdf_download_url === 'string' ? row.pdf_download_url : '';
  const paymentUrl = typeof row.payment_url === 'string' ? row.payment_url : '';
  const quotationId = typeof row.quotation_id === 'string' ? row.quotation_id : '';
  const status = row.approval_status ?? row.status;
  const canRespond = type === 'quotation' && quotationId && row.approval_status !== 'customer_accepted';
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
          {paymentUrl ? <a href={paymentUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700">Pay Now / 立即付款</a> : null}
        </div>
      </div>
      {canRespond ? (
        <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-activeBlue">Quote Response / 报价回复</div>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">You can accept, decline, or request revision with a message. You cannot edit quotation or invoice content. / 您可以同意、不同意或留言要求修改，但不能修改报价或发票内容。</p>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Leave message if you decline or request revision / 如不同意或要求修改，请填写建议留言" className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => onRespond?.(quotationId, 'accepted', message)} disabled={responding} className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">{responding ? 'Submitting… / 提交中…' : 'Accept Quote / 同意报价'}</button>
            <button type="button" onClick={() => onRespond?.(quotationId, 'revision_requested', message)} disabled={responding} className="rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-white hover:bg-amber-600 disabled:opacity-50">Request Revision / 要求修改</button>
            <button type="button" onClick={() => onRespond?.(quotationId, 'declined', message)} disabled={responding} className="rounded-2xl bg-slate-700 px-4 py-3 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50">Decline / 不同意</button>
          </div>
        </div>
      ) : null}
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
  const [responseState, setResponseState] = useState<ResponseState>({ loadingId: null, message: null, error: null, result: null });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await loadFinancial();
      setState({ loading: false, error: null, payload });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), payload: null });
    }
  }

  async function onRespond(quotationId: string, type: QuoteResponseType, message: string) {
    setResponseState({ loadingId: quotationId, message: null, error: null, result: null });
    try {
      const result = await submitQuoteResponse(quotationId, type, message);
      const success = type === 'accepted'
        ? 'Quotation accepted. NANOFIX will prepare the invoice and payment link. / 报价已接受，NANOFIX 将准备发票和付款链接。'
        : type === 'declined'
          ? 'Your quotation response has been submitted. NANOFIX will review it. / 您的不同意回复已提交，NANOFIX 将审核。'
          : 'Your revision request has been submitted. NANOFIX will review and push a revised quotation if needed. / 您的修改建议已提交，NANOFIX 将审核并按需重新推送报价。';
      setResponseState({ loadingId: null, message: success, error: null, result });
      await refresh();
    } catch (error) {
      setResponseState({ loadingId: null, message: null, error: error instanceof Error ? error.message : String(error), result: null });
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
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Only customer-visible quotations, invoices and payments linked to your own NANOFIX records are shown. You can respond to quotations, but cannot edit quotation or invoice content. / 这里只显示与您本人记录绑定并设置为客户可见的报价、发票和付款；您可回复报价，但不能修改报价或发票内容。</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
        </div>
        {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {responseState.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{responseState.error}</div> : null}
        {responseState.message ? <div className="mt-5 rounded-3xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{responseState.message}</div> : null}
        {!state.error && state.loading ? <div className="mt-5 rounded-3xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading financial records… / 正在读取财务记录…</div> : null}
      </section>

      <Section id="quotations" title="Quotations" zh="报价" count={quotations.length}>
        {!quotations.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer-visible quotations yet. / 暂无客户可见报价。</div> : quotations.map((row, index) => <FinanceCard key={String(row.quotation_id ?? index)} row={row} type="quotation" onRespond={(quotationId, responseType, message) => void onRespond(quotationId, responseType, message)} responding={responseState.loadingId === row.quotation_id} />)}
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
