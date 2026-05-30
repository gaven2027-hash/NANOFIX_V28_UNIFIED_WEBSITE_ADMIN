'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; submitting: boolean; error: string | null; message: string | null; claims: Row[]; attachments: Row[]; result: Row | null };
type Values = { upload_review_id: string; review_status: 'approved' | 'rejected' | 'needs_more_info' | 'pending_review'; visible_to_customer: boolean; review_notes: string; customer_visibility_notes: string };

async function loadWarrantyClaimAttachments(serviceRequestId?: string) {
  const query = serviceRequestId ? `?service_request_id=${encodeURIComponent(serviceRequestId)}` : '?limit=100';
  const response = await fetch(`/api/admin/service-operations/warranty-claim-attachments${query}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; claims?: Row[]; attachments?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; claims?: Row[]; attachments?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim attachments API returned ${response.status}`);
  return { claims: Array.isArray(payload?.claims) ? payload.claims : [], attachments: Array.isArray(payload?.attachments) ? payload.attachments : [] };
}

async function submitAttachmentReview(values: Values) {
  const response = await fetch('/api/admin/service-operations/warranty-claim-attachments', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Warranty claim attachment review API returned ${response.status}`);
  return payload ?? { ok: true };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  return String(value);
}

export function ServiceOperationsWarrantyClaimAttachmentReviewPanel() {
  const [state, setState] = useState<State>({ loading: true, submitting: false, error: null, message: null, claims: [], attachments: [], result: null });
  const [selectedServiceRequestId, setSelectedServiceRequestId] = useState('');
  const [values, setValues] = useState<Values>({ upload_review_id: '', review_status: 'approved', visible_to_customer: true, review_notes: '', customer_visibility_notes: '' });

  async function refresh(serviceRequestId = selectedServiceRequestId) {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const data = await loadWarrantyClaimAttachments(serviceRequestId || undefined);
      setState((current) => ({ ...current, loading: false, claims: data.claims, attachments: data.attachments }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pickClaim(row: Row) {
    const id = String(row.service_request_id ?? '');
    setSelectedServiceRequestId(id);
    void refresh(id);
  }

  function pickAttachment(row: Row) {
    setValues({
      upload_review_id: String(row.upload_review_id ?? ''),
      review_status: String(row.review_status ?? 'approved') as Values['review_status'],
      visible_to_customer: row.review_status === 'approved' ? row.visible_to_customer === true : true,
      review_notes: String(row.review_notes ?? ''),
      customer_visibility_notes: String(row.customer_visibility_notes ?? '')
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, submitting: true, error: null, message: null, result: null }));
    try {
      const payload = { ...values, visible_to_customer: values.review_status === 'approved' && values.visible_to_customer };
      const result = await submitAttachmentReview(payload);
      const data = await loadWarrantyClaimAttachments(selectedServiceRequestId || undefined);
      setState({ loading: false, submitting: false, error: null, message: 'Attachment review saved. Customer-visible approved files will appear in Customer Portal. / 附件审核已保存；批准且客户可见的文件会显示在客户门户。', claims: data.claims, attachments: data.attachments, result });
    } catch (error) {
      setState((current) => ({ ...current, submitting: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  useEffect(() => { void refresh(''); }, []);

  return (
    <section id="warranty-claim-attachment-review" className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.4.9 / Attachment Review</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Claim Attachment Review / 保修申请附件审核</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Review supplementary photos, videos and documents submitted from Customer Portal warranty claims. Approve and make visible, reject, or request more information. / 审核客户门户保修申请上传的补充照片、视频和文件；可批准并客户可见、驳回或要求补充资料。</p>
      </div>
      <div className="grid gap-6 p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Warranty Claims / 保修申请</h3>
            <button type="button" onClick={() => { setSelectedServiceRequestId(''); void refresh(''); }} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">All / 全部</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          {!state.claims.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No warranty claims found. / 暂无保修申请。</div> : state.claims.map((claim) => (
            <button key={String(claim.service_request_id)} type="button" onClick={() => pickClaim(claim)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="text-sm font-black text-slate-950">{formatValue(claim.contact_name)} · {formatValue(claim.status)}</div>
              <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(claim.service_request_id)}</div>
              <div className="mt-2 text-xs font-semibold text-slate-600">Decision: {formatValue(claim.warranty_claim_decision)} · Routing: {formatValue(claim.warranty_claim_routing_status)}</div>
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <h3 className="text-sm font-black text-slate-950">Review Action / 审核动作</h3>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Upload Review ID<input value={values.upload_review_id} onChange={(event) => setValues((current) => ({ ...current, upload_review_id: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" required /></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Review Status<select value={values.review_status} onChange={(event) => setValues((current) => ({ ...current, review_status: event.target.value as Values['review_status'], visible_to_customer: event.target.value === 'approved' ? current.visible_to_customer : false }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100">
              <option value="approved">approved — approve attachment</option>
              <option value="rejected">rejected — reject attachment</option>
              <option value="needs_more_info">needs_more_info — request more information</option>
              <option value="pending_review">pending_review — keep pending</option>
            </select></label>
            <label className="flex items-center gap-3 rounded-2xl bg-white p-3 text-xs font-black text-slate-700 ring-1 ring-slate-200"><input type="checkbox" checked={values.visible_to_customer} onChange={(event) => setValues((current) => ({ ...current, visible_to_customer: event.target.checked }))} disabled={values.review_status !== 'approved'} /> Visible to customer after approval / 批准后客户可见</label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Review Notes / 审核备注<textarea value={values.review_notes} onChange={(event) => setValues((current) => ({ ...current, review_notes: event.target.value }))} rows={4} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Customer Visibility Notes / 客户可见备注<textarea value={values.customer_visibility_notes} onChange={(event) => setValues((current) => ({ ...current, customer_visibility_notes: event.target.value }))} rows={3} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
            <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">This review changes only attachment review status and customer visibility. It does not edit quotations, invoices, warranties or payment records. / 本审核只改变附件审核状态和客户可见性，不会修改报价、发票、保修单或付款记录。</div>
            <button type="submit" disabled={state.submitting || !values.upload_review_id} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.submitting ? 'Saving… / 保存中…' : 'Save Review / 保存审核'}</button>
          </form>

          <section className="grid gap-3 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <h3 className="text-sm font-black text-slate-950">Attachments / 附件</h3>
            {!state.attachments.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No warranty claim attachments found. / 暂无保修申请附件。</div> : state.attachments.map((attachment) => (
              <article key={String(attachment.upload_review_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">{formatValue(attachment.file_name)}</div>
                    <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(attachment.file_type)} · {formatValue(attachment.review_status)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typeof attachment.reviewer_file_url === 'string' && attachment.reviewer_file_url ? <a href={attachment.reviewer_file_url} target="_blank" rel="noreferrer" className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Preview / 预览</a> : null}
                    <button type="button" onClick={() => pickAttachment(attachment)} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700">Pick / 选择</button>
                  </div>
                </div>
                <div className="mt-3 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
                  <div>Upload Review ID: {formatValue(attachment.upload_review_id)}</div>
                  <div>Service Request: {formatValue(attachment.service_request_id)}</div>
                  <div>Customer Visible: {formatValue(attachment.visible_to_customer)}</div>
                  <div>Attached: {formatValue(attachment.attached_to_record)}</div>
                  <div>Created: {formatValue(attachment.created_at)}</div>
                  <div>Reviewed: {formatValue(attachment.reviewed_at)}</div>
                  <div className="md:col-span-2">Notes: {formatValue(attachment.review_notes)}</div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </section>
  );
}
