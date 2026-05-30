'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type Payload = { ok?: boolean; error?: string; warranties?: Row[]; warranty_pdfs?: Row[] };
type State = { loading: boolean; error: string | null; payload: Payload | null };

async function loadWarranties() {
  const response = await fetch('/api/customer-portal/warranties?limit=50', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Payload | null = null;
  try { payload = text ? JSON.parse(text) as Payload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranties API returned ${response.status}`);
  return payload ?? { ok: true, warranties: [], warranty_pdfs: [] };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  return String(value);
}

function pdfsForWarranty(pdfs: Row[], warrantyId: unknown) {
  return pdfs.filter((pdf) => pdf.warranty_id === warrantyId);
}

export function CustomerPortalWarrantyDownloads() {
  const [state, setState] = useState<State>({ loading: true, error: null, payload: null });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await loadWarranties();
      setState({ loading: false, error: null, payload });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), payload: null });
    }
  }

  useEffect(() => { void refresh(); }, []);

  const warranties = Array.isArray(state.payload?.warranties) ? state.payload.warranties : [];
  const pdfs = Array.isArray(state.payload?.warranty_pdfs) ? state.payload.warranty_pdfs : [];

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Warranty Certificates / 保修单</div>
            <h1 className="mt-2 text-2xl font-black text-slate-950">View & Download Warranty PDFs</h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">Only warranties and PDF certificates linked to your own customer account and marked visible by NANOFIX Admin are shown. / 这里只显示与您本人账号绑定、且由 NANOFIX 后台设置为客户可见的保修单和 PDF。</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
        </div>
        {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {!state.error && state.loading ? <div className="mt-5 rounded-3xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading warranty records… / 正在读取保修记录…</div> : null}
      </section>

      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">My Warranties / 我的保修单</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-activeBlue ring-1 ring-blue-100">{warranties.length}</span>
        </div>
        {!warranties.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No visible warranties yet. / 暂无客户可见保修单。</div> : null}
        {warranties.map((warranty) => {
          const linkedPdfs = pdfsForWarranty(pdfs, warranty.warranty_id);
          return (
            <article key={String(warranty.warranty_id)} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-950">Warranty / 保修单: {formatValue(warranty.warranty_id)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(warranty.status)} · {formatValue(warranty.warranty_years)} years / 年</div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">{linkedPdfs.length} PDF</div>
              </div>
              <div className="mt-3 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                <div>Job / 工单: {formatValue(warranty.job_id)}</div>
                <div>Auto Generated / 自动生成: {formatValue(warranty.auto_generated)}</div>
                <div>Starts / 开始: {formatValue(warranty.starts_at)}</div>
                <div>Ends / 结束: {formatValue(warranty.ends_at)}</div>
                <div className="md:col-span-2">Coverage / 保修范围: {formatValue(warranty.coverage)}</div>
                <div className="md:col-span-2">Terms / 条款: {formatValue(warranty.terms_snapshot)}</div>
              </div>
              <div className="mt-4 grid gap-2">
                {!linkedPdfs.length ? <div className="rounded-2xl bg-white p-3 text-xs font-bold text-slate-500 ring-1 ring-slate-200">PDF not visible yet. / PDF 暂未开放下载。</div> : null}
                {linkedPdfs.map((pdf) => (
                  <a key={String(pdf.warranty_pdf_id)} href={String(pdf.storage_path)} target="_blank" rel="noreferrer" className="rounded-2xl bg-white p-4 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-activeBlue hover:ring-blue-200">
                    <div className="font-black text-slate-950">Download PDF / 下载 PDF: {formatValue(pdf.public_ref ?? pdf.file_name)}</div>
                    <div className="mt-1">Version / 版本: {formatValue(pdf.warranty_version)} · Generated / 生成: {formatValue(pdf.generated_at ?? pdf.created_at)}</div>
                    <div className="mt-1 text-slate-500">Path / 路径: {formatValue(pdf.storage_path)}</div>
                  </a>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
