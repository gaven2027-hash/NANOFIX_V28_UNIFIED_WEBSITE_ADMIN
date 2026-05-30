'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; warranties: Row[] };

async function loadWarranties() {
  const response = await fetch('/api/customer-portal/warranties?limit=50', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; warranties?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; warranties?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer warranties API returned ${response.status}`);
  return Array.isArray(payload?.warranties) ? payload.warranties : [];
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

function pdfRows(row: Row) {
  return Array.isArray(row.pdfs) ? row.pdfs as Row[] : [];
}

export function CustomerPortalWarrantiesOverview() {
  const [state, setState] = useState<State>({ loading: true, error: null, warranties: [] });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const warranties = await loadWarranties();
      setState({ loading: false, error: null, warranties });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), warranties: [] });
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Warranty Documents / 保修单</div>
            <h1 className="mt-2 text-2xl font-black text-slate-950">My NANOFIX Warranties</h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">Only warranty documents linked to your customer account and made visible by NANOFIX Admin are shown here. You can view and download warranty PDFs, but cannot edit warranty terms. / 这里仅显示与您账号绑定并由 NANOFIX 后台设置为客户可见的保修单；您可以查看和下载 PDF，但不能修改保修条款。</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
        </div>
        {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
      </section>

      {!state.warranties.length && !state.loading ? <div className="rounded-3xl bg-white p-6 text-sm font-bold text-slate-500 shadow-soft ring-1 ring-slate-200">No customer-visible warranty documents yet. / 暂无客户可见保修单。</div> : null}

      {state.warranties.map((warranty) => {
        const pdfs = pdfRows(warranty);
        return (
          <article key={String(warranty.warranty_id)} className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-black text-slate-950">{formatValue(warranty.public_ref ?? warranty.warranty_id)}</div>
                <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(warranty.status)} · {formatValue(warranty.warranty_years)} Years / 年</div>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-activeBlue ring-1 ring-blue-100">{pdfs.length} PDF</span>
            </div>
            <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 md:grid-cols-2">
              <div>Warranty ID / 保修ID: {formatValue(warranty.warranty_id)}</div>
              <div>Job ID / 工单ID: {formatValue(warranty.job_id)}</div>
              <div>Start / 开始: {formatValue(warranty.starts_at)}</div>
              <div>End / 结束: {formatValue(warranty.ends_at)}</div>
              <div>Generated / 生成: {formatValue(warranty.generated_at ?? warranty.created_at)}</div>
              <div>PDF Generated / PDF生成: {formatValue(warranty.pdf_generated_at)}</div>
              <div className="md:col-span-2">Coverage / 保修范围: {formatValue(warranty.coverage)}</div>
              <div className="md:col-span-2">Terms / 条款: {formatValue(warranty.terms_snapshot)}</div>
            </div>
            <div className="mt-5 grid gap-3">
              {!pdfs.length ? <div className="rounded-2xl bg-slate-50 p-4 text-xs font-bold text-slate-500 ring-1 ring-slate-200">No visible PDF yet. / 暂无可下载 PDF。</div> : null}
              {pdfs.map((pdf) => {
                const url = typeof pdf.signed_download_url === 'string' ? pdf.signed_download_url : '';
                return (
                  <div key={String(pdf.warranty_pdf_id)} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div>
                      <div className="text-xs font-black text-slate-950">{formatValue(pdf.public_ref ?? pdf.file_name ?? pdf.warranty_pdf_id)}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">Version / 版本 {formatValue(pdf.warranty_version)} · {formatValue(pdf.generation_status)} · {formatValue(pdf.generated_at ?? pdf.created_at)}</div>
                    </div>
                    {url ? <a href={url} target="_blank" rel="noreferrer" className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700">Download PDF / 下载PDF</a> : <span className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-400 ring-1 ring-slate-200">No signed link / 暂无链接</span>}
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
