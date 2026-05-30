'use client';

import { createClient } from '@supabase/supabase-js';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type AttachmentState = { loading: boolean; uploading: boolean; error: string | null; message: string | null; attachments: Row[]; result: Row | null };

const supportedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'application/pdf'];
const maxSize = 50 * 1024 * 1024;
const bucket = 'service-uploads';

async function jsonPost(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  const ok = response.ok && payload?.ok !== false;
  const error = typeof payload?.error === 'string' ? payload.error : `${url} returned ${response.status}`;
  return { ok, payload, error: ok ? null : error };
}

async function loadAttachments(serviceRequestId: string) {
  const response = await fetch(`/api/customer-portal/warranty-claims/${serviceRequestId}/attachments`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; attachments?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; attachments?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim attachments API returned ${response.status}`);
  return Array.isArray(payload?.attachments) ? payload.attachments : [];
}

function createBrowserStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for signed upload.');
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function uploadViaSignedToken(payload: Row, file: File) {
  const storagePath = typeof payload.storage_path === 'string' ? payload.storage_path : '';
  const token = typeof payload.token === 'string' ? payload.token : '';
  if (!storagePath || !token) return { ok: false, error: 'Signed upload response did not include storage_path/token.' };
  const supabase = createBrowserStorageClient();
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(storagePath, token, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

function validateFile(file: File | null) {
  if (!file) return 'Please choose a file. / 请选择文件。';
  if (!supportedMime.includes(file.type)) return `Unsupported file type: ${file.type || 'unknown'}. / 不支持的文件类型。`;
  if (file.size <= 0 || file.size > maxSize) return 'File size must be between 1 byte and 50MB. / 文件大小必须在 1 byte 到 50MB 之间。';
  return null;
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

export function CustomerPortalWarrantyClaimAttachmentsPanel({ serviceRequestId }: { serviceRequestId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [reviewNotes, setReviewNotes] = useState('Supplementary warranty claim attachment.');
  const [checksum, setChecksum] = useState('');
  const [state, setState] = useState<AttachmentState>({ loading: true, uploading: false, error: null, message: null, attachments: [], result: null });

  async function refreshAttachments() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const attachments = await loadAttachments(serviceRequestId);
      setState((current) => ({ ...current, loading: false, attachments }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setState((current) => ({ ...current, error: null, message: null, result: null }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fileError = validateFile(file);
    if (fileError || !file) {
      setState((current) => ({ ...current, error: fileError ?? 'Invalid file.', message: null }));
      return;
    }

    setState((current) => ({ ...current, uploading: true, error: null, message: 'Preparing signed upload URL… / 正在准备签名上传链接…' }));
    const signed = await jsonPost('/api/customer-portal/storage-upload-url', {
      action: 'create_signed_upload_url',
      service_request_id: serviceRequestId,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size
    });
    if (!signed.ok || !signed.payload) {
      setState((current) => ({ ...current, uploading: false, error: signed.error ?? 'Failed to create signed upload URL.', message: null, result: signed.payload }));
      return;
    }

    setState((current) => ({ ...current, uploading: true, error: null, message: 'Uploading file… / 正在上传文件…', result: signed.payload }));
    const uploaded = await uploadViaSignedToken(signed.payload, file);
    if (!uploaded.ok) {
      setState((current) => ({ ...current, uploading: false, error: uploaded.error ?? 'Signed upload failed.', message: null }));
      return;
    }

    const storagePath = typeof signed.payload.storage_path === 'string' ? signed.payload.storage_path : '';
    setState((current) => ({ ...current, uploading: true, error: null, message: 'Registering attachment for admin review… / 正在登记附件并等待后台审核…' }));
    const registered = await jsonPost('/api/customer-portal/storage-upload-url', {
      action: 'register_completed_upload',
      service_request_id: serviceRequestId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      original_size_bytes: file.size,
      compressed_size_bytes: file.size,
      compression_status: signed.payload.compression_required ? 'pending_client_compression' : 'not_required',
      checksum_sha256: checksum,
      review_notes: reviewNotes
    });
    if (!registered.ok) {
      setState((current) => ({ ...current, uploading: false, error: registered.error ?? 'Completed upload registration failed.', message: null, result: registered.payload ?? signed.payload }));
      return;
    }

    const attachments = await loadAttachments(serviceRequestId);
    setFile(null);
    setState({ loading: false, uploading: false, error: null, message: 'Attachment uploaded for admin review. / 附件已上传并等待后台审核。', attachments, result: registered.payload });
  }

  useEffect(() => { void refreshAttachments(); }, [serviceRequestId]);

  return (
    <section id="claim-attachments" className="scroll-mt-28 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">Warranty Claim Attachments</h2>
          <div className="text-xs font-bold text-activeBlue">保修申请补充附件</div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Upload supplementary photos, videos or PDF documents for this warranty claim. Files are private and require admin review before customer-visible access is shown. / 为该保修申请补充照片、视频或PDF文件；文件为私有，需后台审核后才显示客户可见访问按钮。</p>
        </div>
        <button type="button" onClick={() => void refreshAttachments()} disabled={state.loading || state.uploading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
      </div>
      {state.error ? <div className="mt-4 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
      {state.message ? <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">{state.message}</div> : null}

      <form onSubmit={submit} className="mt-5 grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">File / 文件<input type="file" accept={supportedMime.join(',')} onChange={choose} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Review Notes / 审核备注<textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} rows={3} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Checksum SHA256 / 校验值<input value={checksum} onChange={(event) => setChecksum(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Attachments only add evidence to this warranty claim. They do not edit quotations, invoices, warranties or payment records. / 附件只为该保修申请补充证据，不会修改报价、发票、保修单或付款记录。</div>
        <button type="submit" disabled={state.uploading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.uploading ? 'Uploading… / 上传中…' : 'Upload Attachment / 上传附件'}</button>
      </form>

      <div className="mt-5 grid gap-3">
        {!state.attachments.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No attachments yet. / 暂无附件。</div> : state.attachments.map((attachment) => (
          <article key={String(attachment.upload_review_id)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-950">{formatValue(attachment.file_name)}</div>
                <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(attachment.file_type)} · {formatValue(attachment.review_status)}</div>
              </div>
              {typeof attachment.file_url === 'string' && attachment.file_url ? <a href={attachment.file_url} target="_blank" rel="noreferrer" className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</a> : null}
            </div>
            <div className="mt-3 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
              <div>Customer Visible / 客户可见: {formatValue(attachment.visible_to_customer)}</div>
              <div>Compression / 压缩: {formatValue(attachment.compression_status)}</div>
              <div>Created / 创建: {formatValue(attachment.created_at)}</div>
              <div>Size / 大小: {formatValue(attachment.compressed_size_bytes ?? attachment.original_size_bytes)}</div>
              <div className="md:col-span-2">Notes / 备注: {formatValue(attachment.review_notes)}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
