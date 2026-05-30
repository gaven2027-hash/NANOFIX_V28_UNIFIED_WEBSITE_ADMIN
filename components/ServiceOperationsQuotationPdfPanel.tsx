'use client';

import { FormEvent, useState } from 'react';

type QuotationPdf = Record<string, unknown>;
type State = { loading: boolean; error: string | null; result: Record<string, unknown> | null; docs: QuotationPdf[] };
type Values = { quotation_id: string; visible_to_customer: string; generation_notes: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

async function generateQuotationPdf(values: Values) {
  const response = await fetch('/api/admin/service-operations/quotation-pdfs', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_quotation_pdf',
      quotation_id: values.quotation_id,
      visible_to_customer: values.visible_to_customer === 'true',
      generation_notes: values.generation_notes
    })
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Quotation PDF API returned ${response.status}`);
  return payload ?? { ok: true };
}

async function fetchQuotationPdfs(quotationId: string) {
  if (!quotationId.trim()) return [];
  const response = await fetch(`/api/admin/service-operations/quotation-pdfs?quotation_id=${encodeURIComponent(quotationId.trim())}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; quotation_pdfs?: QuotationPdf[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; quotation_pdfs?: QuotationPdf[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Quotation PDF list API returned ${response.status}`);
  return Array.isArray(payload?.quotation_pdfs) ? payload.quotation_pdfs : [];
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  return String(value);
}

export function ServiceOperationsQuotationPdfPanel() {
  const [values, setValues] = useState<Values>({ quotation_id: '', visible_to_customer: 'false', generation_notes: 'Quotation PDF generated from Service Operations.' });
  const [state, setState] = useState<State>({ loading: false, error: null, result: null, docs: [] });

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, result: null }));
    try {
      const result = await generateQuotationPdf(values);
      const docs = await fetchQuotationPdfs(values.quotation_id);
      setState({ loading: false, error: null, result, docs });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  async function loadDocs() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const docs = await fetchQuotationPdfs(values.quotation_id);
      setState((current) => ({ ...current, loading: false, error: null, docs }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Quotation PDF / 报价 PDF</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Quotation PDF Generator + Customer Acceptance Linkage</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Generate a polished quotation PDF from the latest quotation version and document company settings. If visible to customer, Customer Portal can download it and the customer can accept the quotation. / 根据最新报价版本和公司文档设置生成美化报价 PDF；如设置客户可见，客户门户可下载并接受报价。</p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={(event) => void generate(event)} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Generate Quotation PDF / 生成报价 PDF</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Quotation ID<input className={inputClass} value={values.quotation_id} onChange={(event) => setValues((current) => ({ ...current, quotation_id: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Visible To Customer / 客户可见<select className={inputClass} value={values.visible_to_customer} onChange={(event) => setValues((current) => ({ ...current, visible_to_customer: event.target.value }))}><option value="false">false / 隐藏</option><option value="true">true / 可见</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Generation Notes / 生成备注<textarea className={inputClass} rows={3} value={values.generation_notes} onChange={(event) => setValues((current) => ({ ...current, generation_notes: event.target.value }))} /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">Customer visibility / 客户可见：When true, quotation.visible_to_customer is updated and Customer Portal can show the PDF + Accept Quote button if the quotation belongs to that customer.</div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Generate Quotation PDF / 生成报价PDF</button>
            <button type="button" onClick={() => void loadDocs()} disabled={state.loading} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50 disabled:opacity-50">Load PDFs / 读取PDF</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.result ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>

        <div className="grid h-fit gap-3">
          <h3 className="text-sm font-black text-slate-950">Quotation PDF Documents / 报价PDF记录</h3>
          {!state.docs.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No quotation PDF documents loaded. / 暂无已读取报价PDF记录。</div> : null}
          {state.docs.map((doc) => (
            <article key={String(doc.quotation_pdf_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-black text-slate-950">{formatValue(doc.file_name)}</div>
              <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(doc.generation_status)} · Version: {formatValue(doc.quotation_version)} · Visible: {formatValue(doc.visible_to_customer)}</div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Quotation PDF ID: {formatValue(doc.quotation_pdf_id)}</div>
                <div>Quotation ID: {formatValue(doc.quotation_id)}</div>
                <div>Size: {formatValue(doc.file_size_bytes)}</div>
                <div>Created: {formatValue(doc.created_at)}</div>
                <div className="md:col-span-2">Path: {formatValue(doc.storage_path)}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
