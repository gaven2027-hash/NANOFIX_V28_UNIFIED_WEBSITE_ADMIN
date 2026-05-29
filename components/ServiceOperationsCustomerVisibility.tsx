'use client';

import { FormEvent, useState } from 'react';

type State = { loading: boolean; message: string | null; error: string | null; result: Record<string, unknown> | null };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function submitVisibility(input: { upload_review_id: string; visible_to_customer: boolean; customer_visibility_notes: string }) {
  const response = await fetch('/api/admin/service-operations/inspections', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'set_upload_customer_visibility', ...input })
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : null; } catch { payload = null; }
  const ok = response.ok && payload?.ok !== false;
  const error = typeof payload?.error === 'string' ? payload.error : `Visibility API returned ${response.status}`;
  return { ok, payload, error: ok ? null : error };
}

export function ServiceOperationsCustomerVisibility() {
  const [uploadReviewId, setUploadReviewId] = useState('');
  const [visible, setVisible] = useState('false');
  const [notes, setNotes] = useState('Customer-visible after admin privacy review.');
  const [state, setState] = useState<State>({ loading: false, message: null, error: null, result: null });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uuidPattern.test(uploadReviewId.trim())) {
      setState({ loading: false, message: null, error: 'Valid upload_review_id is required. / 必须填写有效 upload_review_id。', result: null });
      return;
    }
    setState({ loading: true, message: null, error: null, result: null });
    const result = await submitVisibility({ upload_review_id: uploadReviewId.trim(), visible_to_customer: visible === 'true', customer_visibility_notes: notes.trim() });
    if (!result.ok) {
      setState({ loading: false, message: null, error: result.error ?? 'Visibility update failed.', result: result.payload });
      return;
    }
    setState({ loading: false, message: 'Customer visibility updated through live API. / 已通过真实 API 更新客户可见状态。', error: null, result: result.payload });
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Upload Visibility / 客户可见文件控制</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Approved Upload Access Control</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Approved upload does not automatically mean customer-visible. This panel calls `set_upload_customer_visibility`; customer portal only reads approved + visible files. / 上传审核通过不等于客户可见；客户门户只读取 approved 且 visible_to_customer=true 的文件。</p>
      </div>
      <div className="p-6">
        {state.loading || state.message || state.error ? <div className={`mb-5 rounded-3xl p-4 text-xs font-bold ring-1 ${state.error ? 'bg-red-50 text-red-950 ring-red-200' : 'bg-blue-50 text-blue-950 ring-blue-200'}`}>{state.loading ? 'Updating customer visibility… / 正在更新客户可见状态…' : state.error ?? state.message}</div> : null}
        <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Upload Review ID / 上传审核 ID<input value={uploadReviewId} onChange={(event) => setUploadReviewId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Visible To Customer / 客户可见<select value={visible} onChange={(event) => setVisible(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"><option value="false">false / 隐藏</option><option value="true">true / 可见</option></select></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Visibility Notes / 可见备注<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
          </div>
          <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Set customer visibility / 设置客户可见</button>
        </form>
        {state.result ? <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200"><div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Last Visibility API Result / 最近可见性 API 返回</div></div><pre className="max-h-72 overflow-auto whitespace-pre-wrap p-5 text-xs font-semibold text-slate-700">{JSON.stringify(state.result, null, 2)}</pre></div> : null}
      </div>
    </section>
  );
}
