'use client';

import { FormEvent, useState } from 'react';

type WarrantyPdf = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; result: Record<string, unknown> | null; docs: WarrantyPdf[] };
type Values = { warranty_id: string; visible_to_customer: string; generation_notes: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const defaults: Values = { warranty_id: '', visible_to_customer: 'true', generation_notes: 'Warranty PDF generated from completed NANOFIX service warranty.' };

async function generateWarrantyPdf(values: Values) {
  const response = await fetch('/api/admin/service-operations/warranty-pdfs', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_warranty_pdf',
      warranty_id: values.warranty_id,
      visible_to_customer: values.visible_to_customer === 'true',
      generation_notes: values.generation_notes
    })
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Warranty PDF API returned ${response.status}`);
  return payload ?? { ok: true };
}

async function fetchWarrantyPdfs(warrantyId: string) {
  if (!warrantyId.trim()) return [];
  const response = await fetch(`/api/admin/service-operations/warranty-pdfs?warranty_id=${encodeURIComponent(warrantyId.trim())}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; warranty_pdfs?: WarrantyPdf[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; warranty_pdfs?: WarrantyPdf[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty PDF list API returned ${response.status}`);
  return Array.isArray(payload?.warranty_pdfs) ? payload.warranty_pdfs : [];
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

export function ServiceOperationsWarrantyPdfPanel() {
  const [values, setValues] = useState<Values>(defaults);
  const [state, setState] = useState<State>({ loading: false, error: null, message: null, result: null, docs: [] });

  function change(key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function loadDocs() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const docs = await fetchWarrantyPdfs(values.warranty_id);
      setState((current) => ({ ...current, loading: false, error: null, docs }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await generateWarrantyPdf(values);
      const docs = await fetchWarrantyPdfs(values.warranty_id);
      setState({ loading: false, error: null, message: 'Warranty PDF generated, uploaded and recorded. / 已生成、上传并记录保修 PDF。', result, docs });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Warranty PDF / 保修单 PDF</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Certificate PDF Generator + Customer Download</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Generate and upload official warranty certificate PDFs from warranty records and document company settings. When visible to customer, Customer Portal can download the PDF through a short-lived signed URL. / 根据保修记录和公司文档设置生成并上传正式保修单 PDF；设置客户可见后，客户门户可通过限时签名链接下载。</p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={(event) => void submit(event)} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Generate Warranty PDF / 生成保修单 PDF</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Warranty ID<input className={inputClass} value={values.warranty_id} onChange={(event) => change('warranty_id', event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Visible To Customer / 客户可见<select className={inputClass} value={values.visible_to_customer} onChange={(event) => change('visible_to_customer', event.target.value)}><option value="false">false / 隐藏</option><option value="true">true / 可见</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Generation Notes / 生成备注<textarea className={inputClass} rows={3} value={values.generation_notes} onChange={(event) => change('generation_notes', event.target.value)} /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">PDF is generated by the server and stored in private Supabase Storage. Customer Portal reads only warranty PDFs linked to the signed-in customer and visible_to_customer=true. / PDF 由服务端生成并存储到 Supabase 私有存储；客户门户只读取绑定当前客户且设为可见的保修 PDF。</div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Generate / 生成</button>
            <button type="button" onClick={() => void loadDocs()} disabled={state.loading} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50">Load PDFs / 读取PDF</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          {state.result ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>

        <div className="grid h-fit gap-3">
          <h3 className="text-sm font-black text-slate-950">Warranty PDF Documents / 保修单PDF记录</h3>
          {!state.docs.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No warranty PDF documents loaded. / 暂无已读取保修单PDF记录。</div> : null}
          {state.docs.map((doc) => (
            <article key={String(doc.warranty_pdf_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-black text-slate-950">{formatValue(doc.public_ref ?? doc.file_name)} · v{formatValue(doc.warranty_version)}</div>
              <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(doc.generation_status)} · Visible: {formatValue(doc.visible_to_customer)}</div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Warranty PDF ID: {formatValue(doc.warranty_pdf_id)}</div>
                <div>Warranty ID: {formatValue(doc.warranty_id)}</div>
                <div>Customer ID: {formatValue(doc.customer_id)}</div>
                <div>Version: {formatValue(doc.warranty_version)}</div>
                <div>Size: {formatValue(doc.file_size_bytes)}</div>
                <div>Generated: {formatValue(doc.generated_at ?? doc.created_at)}</div>
                <div className="md:col-span-2">Path: {formatValue(doc.storage_path)}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
