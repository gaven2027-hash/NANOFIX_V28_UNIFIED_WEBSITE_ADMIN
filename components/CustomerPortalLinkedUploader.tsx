'use client';

import { createClient } from '@supabase/supabase-js';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type ApiPayload = Record<string, unknown>;
type UploadState = { loading: boolean; message: string | null; error: string | null; result: ApiPayload | null };

type FormValues = { service_request_id: string; review_notes: string; checksum_sha256: string };

const supportedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'application/pdf'];
const maxSize = 50 * 1024 * 1024;
const bucket = 'service-uploads';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function jsonPost(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload: ApiPayload | null = null;
  try { payload = text ? JSON.parse(text) as ApiPayload : null; } catch { payload = null; }
  const ok = response.ok && payload?.ok !== false;
  const error = typeof payload?.error === 'string' ? payload.error : `${url} returned ${response.status}`;
  return { ok, payload, error: ok ? null : error };
}

function createBrowserStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for signed upload.');
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function uploadViaSignedToken(payload: ApiPayload, file: File) {
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

export function CustomerPortalLinkedUploader() {
  const searchParams = useSearchParams();
  const initialServiceRequestId = useMemo(() => searchParams.get('service_request_id') ?? '', [searchParams]);
  const [values, setValues] = useState<FormValues>({ service_request_id: initialServiceRequestId, review_notes: 'Customer upload linked to service request.', checksum_sha256: '' });
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ loading: false, message: null, error: null, result: null });

  function change(name: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setState({ loading: false, message: null, error: null, result: null });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const serviceRequestId = values.service_request_id.trim();
    if (!uuidPattern.test(serviceRequestId)) {
      setState({ loading: false, message: null, error: 'Valid service_request_id is required. / 必须填写有效报修 ID。', result: null });
      return;
    }
    const fileError = validateFile(file);
    if (fileError || !file) {
      setState({ loading: false, message: null, error: fileError ?? 'Invalid file.', result: null });
      return;
    }

    setState({ loading: true, message: 'Preparing customer signed upload URL… / 正在准备客户签名上传链接…', error: null, result: null });
    const signed = await jsonPost('/api/customer-portal/storage-upload-url', {
      action: 'create_signed_upload_url',
      service_request_id: serviceRequestId,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size
    });
    if (!signed.ok || !signed.payload) {
      setState({ loading: false, message: null, error: signed.error ?? 'Failed to create customer signed upload URL.', result: signed.payload });
      return;
    }

    const storagePath = typeof signed.payload.storage_path === 'string' ? signed.payload.storage_path : '';
    if (!storagePath || typeof signed.payload.token !== 'string') {
      setState({ loading: false, message: null, error: 'Signed upload response did not include token/storage_path.', result: signed.payload });
      return;
    }

    setState({ loading: true, message: 'Uploading file to private service bucket… / 正在上传到私有服务文件库…', error: null, result: signed.payload });
    const uploaded = await uploadViaSignedToken(signed.payload, file);
    if (!uploaded.ok) {
      setState({ loading: false, message: null, error: uploaded.error ?? 'Signed upload failed.', result: signed.payload });
      return;
    }

    setState({ loading: true, message: 'Registering customer upload for admin review… / 正在登记客户上传并等待后台审核…', error: null, result: signed.payload });
    const registered = await jsonPost('/api/customer-portal/storage-upload-url', {
      action: 'register_completed_upload',
      service_request_id: serviceRequestId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      original_size_bytes: file.size,
      compressed_size_bytes: file.size,
      compression_status: signed.payload.compression_required ? 'pending_client_compression' : 'not_required',
      checksum_sha256: values.checksum_sha256,
      review_notes: values.review_notes
    });
    if (!registered.ok) {
      setState({ loading: false, message: null, error: registered.error ?? 'Completed upload registration failed.', result: registered.payload ?? signed.payload });
      return;
    }

    setState({ loading: false, message: 'File uploaded and linked to your repair request for admin review. / 文件已上传并绑定到您的报修记录，等待后台审核。', error: null, result: registered.payload });
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Linked Customer Upload / 绑定报修文件上传</div>
      <h2 className="mt-1 text-2xl font-black text-slate-950">Upload Photos / Videos for a Repair Request</h2>
      <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Uploads are linked to a service request that belongs to your customer account. Files are private and require admin review before they can appear in your approved uploads. / 文件会绑定到您账号名下的报修记录；文件为私有，需后台审核后才会出现在已审核文件中。</p>

      {state.loading || state.message || state.error ? <div className={`mt-5 rounded-3xl p-4 text-xs font-bold ring-1 ${state.error ? 'bg-red-50 text-red-950 ring-red-200' : 'bg-blue-50 text-blue-950 ring-blue-200'}`}>{state.loading ? state.message : state.error ?? state.message}</div> : null}

      <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">File / 文件<input type="file" accept={supportedMime.join(',')} onChange={choose} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID / 报修 ID<input value={values.service_request_id} onChange={(event) => change('service_request_id', event.target.value)} placeholder="Auto-filled after submit / 提交后可自动带入" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Checksum SHA256 / 校验值<input value={values.checksum_sha256} onChange={(event) => change('checksum_sha256', event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Review Notes / 审核备注<textarea value={values.review_notes} onChange={(event) => change('review_notes', event.target.value)} rows={3} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        </div>
        <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Upload and link to request / 上传并绑定报修</button>
      </form>

      {state.result ? <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200"><div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Last Customer Upload Result / 最近客户上传返回</div></div><pre className="max-h-72 overflow-auto whitespace-pre-wrap p-5 text-xs font-semibold text-slate-700">{JSON.stringify(state.result, null, 2)}</pre></div> : null}
    </section>
  );
}
