'use client';

import { useEffect, useState } from 'react';

type Upload = {
  upload_review_id: string;
  file_name: string;
  file_type: string;
  created_at: string;
  customer_visibility_notes: string | null;
  download_url: string | null;
  download_error: string | null;
};

type State = { loading: boolean; error: string | null; uploads: Upload[] };

async function fetchUploads() {
  const response = await fetch('/api/customer-portal/uploads?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; uploads?: Upload[]; error?: string } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; uploads?: Upload[]; error?: string } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer uploads API returned ${response.status}`);
  return Array.isArray(payload?.uploads) ? payload.uploads : [];
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function CustomerPortalApprovedUploads() {
  const [state, setState] = useState<State>({ loading: true, error: null, uploads: [] });

  async function load() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const uploads = await fetchUploads();
      setState({ loading: false, error: null, uploads });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), uploads: [] });
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Portal / 客户门户</div>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Approved Service Uploads</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Only uploads approved by NANOFIX and marked visible to customer are shown here. Download links are short-lived signed URLs. / 这里只显示已审核通过并设置为客户可见的文件，下载链接为短时签名链接。</p>
          </div>
          <button type="button" onClick={() => void load()} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50" disabled={state.loading}>{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
        </div>

        {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {!state.error && state.loading ? <div className="mt-5 rounded-3xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading approved uploads… / 正在读取已批准文件…</div> : null}

        <div className="mt-6 grid gap-4">
          {!state.loading && !state.error && !state.uploads.length ? <div className="rounded-3xl bg-slate-50 p-6 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer-visible uploads are available yet. / 暂无客户可见文件。</div> : null}
          {state.uploads.map((upload) => (
            <article key={upload.upload_review_id} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-950">{upload.file_name}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{upload.file_type} · {formatDate(upload.created_at)}</div>
                  {upload.customer_visibility_notes ? <p className="mt-2 text-xs font-semibold text-slate-600">{upload.customer_visibility_notes}</p> : null}
                </div>
                {upload.download_url ? <a href={upload.download_url} target="_blank" rel="noreferrer" className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700">Open file / 打开文件</a> : <span className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black text-amber-950 ring-1 ring-amber-200">{upload.download_error ?? 'Signed URL unavailable'}</span>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
