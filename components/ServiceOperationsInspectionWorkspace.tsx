'use client';

import { FormEvent, useEffect, useState } from 'react';

type ApiPayload = Record<string, unknown>;
type Row = Record<string, unknown>;
type State = { loading: boolean; degraded: boolean; errors: string[]; inspections: Row[]; upload_reviews: Row[]; refreshedAt: string | null };
type ActionState = { loading: boolean; message: string | null; error: string | null; result: ApiPayload | null };
type ActionKind = 'prepare_upload_path' | 'schedule_inspection' | 'submit_inspection_form' | 'assign_engineer' | 'create_upload_review' | 'review_upload' | 'queue_customer_notification';
type Values = Record<string, string>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const actions: Array<{ key: ActionKind; title: string; zh: string; note: string }> = [
  { key: 'prepare_upload_path', title: 'Prepare Upload Path', zh: '准备上传路径', note: 'Generate a controlled storage path and compression requirement marker.' },
  { key: 'schedule_inspection', title: 'Schedule Inspection', zh: '预约查验', note: 'Create an inspection record linked to service request or job.' },
  { key: 'submit_inspection_form', title: 'Inspection Form', zh: '查验表单', note: 'Submit findings, diagnosis and trigger follow-up task/notification if completed.' },
  { key: 'assign_engineer', title: 'Engineer Assignment', zh: '工程师分配', note: 'Assign an engineer to an inspection. Manager roles only.' },
  { key: 'create_upload_review', title: 'Create Upload Review', zh: '创建上传审核', note: 'Register uploaded photo/video/document metadata and compression status for review.' },
  { key: 'review_upload', title: 'Review Upload', zh: '审核上传', note: 'Approve, reject or mark upload for redaction; approved uploads queue notification.' },
  { key: 'queue_customer_notification', title: 'Queue Notification', zh: '客户通知排队', note: 'Queue a customer/internal notification in notification_outbox.' }
];

const defaults: Record<ActionKind, Values> = {
  prepare_upload_path: { inspection_id: '', service_request_id: '', job_id: '', file_name: '', file_type: 'image' },
  schedule_inspection: { service_request_id: '', job_id: '', customer_id: '', engineer_id: '', scheduled_at: '', location: '', status: 'scheduled' },
  submit_inspection_form: { inspection_id: '', status: 'completed', findings: '', diagnosis: '', recommended_action: '', customer_present: 'false', signature_required: 'false' },
  assign_engineer: { inspection_id: '', engineer_id: '', status: 'assigned' },
  create_upload_review: { inspection_id: '', service_request_id: '', job_id: '', file_name: '', file_type: 'image', storage_path: '', review_notes: '', compression_status: 'pending_client_compression', original_size_bytes: '', compressed_size_bytes: '', checksum_sha256: '' },
  review_upload: { upload_review_id: '', review_status: 'approved', review_notes: '' },
  queue_customer_notification: { related_object_type: 'service_inspection', related_object_id: '', customer_id: '', channel: 'internal', subject: 'NANOFIX service update', body: 'Your NANOFIX service record has been updated.' }
};

function text(values: Values, key: string) { return values[key]?.trim() ?? ''; }
function boolText(value: string) { return value === 'true'; }
function shortId(value: unknown) { return typeof value === 'string' && value ? value.slice(0, 8) : '—'; }
function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
function errorsFromPayload(payload: ApiPayload | null): string[] {
  const errors = payload?.errors;
  if (Array.isArray(errors)) return errors.filter((item): item is string => typeof item === 'string');
  const error = payload?.error;
  return typeof error === 'string' ? [error] : [];
}

function validate(kind: ActionKind, values: Values) {
  const errors: string[] = [];
  const needsUuid = (field: string, label: string, required = true) => {
    const value = text(values, field);
    if (!value && !required) return;
    if (!uuidPattern.test(value)) errors.push(`${label} must be a valid UUID. / ${label} 必须是有效 UUID。`);
  };

  if (kind === 'prepare_upload_path') {
    needsUuid('inspection_id', 'inspection_id', false);
    needsUuid('service_request_id', 'service_request_id', false);
    needsUuid('job_id', 'job_id', false);
    if (!text(values, 'file_name')) errors.push('file_name is required. / 文件名必填。');
    if (!text(values, 'file_type')) errors.push('file_type is required. / 文件类型必填。');
  }
  if (kind === 'schedule_inspection') {
    const hasRequest = uuidPattern.test(text(values, 'service_request_id'));
    const hasJob = uuidPattern.test(text(values, 'job_id'));
    if (!hasRequest && !hasJob) errors.push('service_request_id or job_id is required. / 报修 ID 或工单 ID 至少填写一个。');
    needsUuid('customer_id', 'customer_id', false);
    needsUuid('engineer_id', 'engineer_id', false);
    if (!text(values, 'scheduled_at')) errors.push('scheduled_at is required. / 查验时间必填。');
  }
  if (kind === 'submit_inspection_form') {
    needsUuid('inspection_id', 'inspection_id');
    if (!text(values, 'findings')) errors.push('findings are required. / 查验发现必填。');
    if (!text(values, 'diagnosis')) errors.push('diagnosis is required. / 诊断结果必填。');
  }
  if (kind === 'assign_engineer') {
    needsUuid('inspection_id', 'inspection_id');
    needsUuid('engineer_id', 'engineer_id');
  }
  if (kind === 'create_upload_review') {
    const hasInspection = uuidPattern.test(text(values, 'inspection_id'));
    const hasRequest = uuidPattern.test(text(values, 'service_request_id'));
    const hasJob = uuidPattern.test(text(values, 'job_id'));
    if (!hasInspection && !hasRequest && !hasJob) errors.push('inspection_id, service_request_id or job_id is required. / 查验 ID、报修 ID 或工单 ID 至少填写一个。');
    if (!text(values, 'file_name')) errors.push('file_name is required. / 文件名必填。');
    if (!text(values, 'storage_path')) errors.push('storage_path is required. / 存储路径必填。');
  }
  if (kind === 'review_upload') {
    needsUuid('upload_review_id', 'upload_review_id');
    if (!text(values, 'review_status')) errors.push('review_status is required. / 审核状态必填。');
  }
  if (kind === 'queue_customer_notification') {
    if (!text(values, 'related_object_type')) errors.push('related_object_type is required. / 关联对象类型必填。');
    if (!text(values, 'related_object_id')) errors.push('related_object_id is required. / 关联对象 ID 必填。');
    needsUuid('customer_id', 'customer_id', false);
    if (!text(values, 'subject')) errors.push('subject is required. / 通知标题必填。');
    if (!text(values, 'body')) errors.push('body is required. / 通知内容必填。');
  }

  return { ok: errors.length === 0, errors };
}

function payload(kind: ActionKind, values: Values) {
  const result: Record<string, unknown> = { action: kind };
  for (const [key, value] of Object.entries(values)) {
    const clean = value.trim();
    if (!clean) continue;
    if (key === 'customer_present' || key === 'signature_required') result[key] = boolText(clean);
    else result[key] = clean;
  }
  return result;
}

async function fetchInspectionData(): Promise<{ ok: boolean; payload: ApiPayload | null; error: string | null }> {
  try {
    const response = await fetch('/api/admin/service-operations/inspections?limit=12', { credentials: 'same-origin', cache: 'no-store' });
    const textBody = await response.text();
    let payload: ApiPayload | null = null;
    try { payload = textBody ? JSON.parse(textBody) as ApiPayload : null; } catch { payload = null; }
    const ok = response.ok && payload?.ok !== false;
    const payloadErrors = errorsFromPayload(payload);
    return { ok, payload, error: ok ? null : `Inspection API returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}` };
  } catch (error) {
    return { ok: false, payload: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function submitInspectionAction(kind: ActionKind, values: Values) {
  const checked = validate(kind, values);
  if (!checked.ok) return { ok: false, result: null, error: checked.errors.join('\n') };
  try {
    const response = await fetch('/api/admin/service-operations/inspections', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload(kind, values))
    });
    const textBody = await response.text();
    let result: ApiPayload | null = null;
    try { result = textBody ? JSON.parse(textBody) as ApiPayload : null; } catch { result = null; }
    const ok = response.ok && result?.ok !== false;
    const error = typeof result?.error === 'string' ? result.error : `Inspection action returned ${response.status}`;
    return { ok, result, error: ok ? null : error };
  } catch (error) {
    return { ok: false, result: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function Input({ label, name, value, onChange, placeholder }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void; placeholder?: string }) {
  return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}<input value={value} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>;
}
function Textarea({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void }) {
  return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">{label}<textarea value={value} onChange={(event) => onChange(name, event.target.value)} rows={3} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>;
}

export function ServiceOperationsInspectionWorkspace() {
  const [active, setActive] = useState<ActionKind>('prepare_upload_path');
  const [forms, setForms] = useState<Record<ActionKind, Values>>(defaults);
  const [state, setState] = useState<State>({ loading: true, degraded: false, errors: [], inspections: [], upload_reviews: [], refreshedAt: null });
  const [action, setAction] = useState<ActionState>({ loading: false, message: null, error: null, result: null });
  const values = forms[active];
  const activeTab = actions.find((item) => item.key === active) ?? actions[0];

  function change(name: string, value: string) {
    setForms((current) => ({ ...current, [active]: { ...current[active], [name]: value } }));
  }

  async function load() {
    setState((current) => ({ ...current, loading: true }));
    const result = await fetchInspectionData();
    const payloadData = result.payload;
    setState({
      loading: false,
      degraded: !result.ok,
      errors: result.error ? [result.error] : [],
      inspections: Array.isArray(payloadData?.inspections) ? payloadData.inspections as Row[] : [],
      upload_reviews: Array.isArray(payloadData?.upload_reviews) ? payloadData.upload_reviews as Row[] : [],
      refreshedAt: new Date().toISOString()
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAction({ loading: true, message: null, error: null, result: null });
    const result = await submitInspectionAction(active, values);
    if (!result.ok) {
      setAction({ loading: false, message: null, error: result.error ?? 'Inspection action failed.', result: null });
      return;
    }
    setAction({ loading: false, message: `${activeTab.title} completed through live API. / 已通过真实 API 完成。`, error: null, result: result.result });
    await load();
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Inspection / Engineer / Upload Review / 查验、工程师、上传审核</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Inspection Scheduling & Execution Workspace</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">This workspace calls `/api/admin/service-operations/inspections`, writes inspection/upload metadata, queues notifications, and records Audit Logs. It prepares upload paths but does not pretend to upload binary files. / 本工作区调用真实 API，写入查验/上传元数据、排入通知并记录审计；它准备上传路径，但不假装已经上传二进制文件。</p>
      </div>
      <div className="p-6">
        <div className={`mb-5 rounded-3xl p-4 text-xs font-bold ring-1 ${state.degraded ? 'bg-amber-50 text-amber-950 ring-amber-200' : 'bg-emerald-50 text-emerald-950 ring-emerald-200'}`}>
          {state.degraded ? 'Inspection API degraded. / 查验 API 降级。' : 'Inspection API ready. / 查验 API 正常。'} Last refresh / 上次刷新: {formatDate(state.refreshedAt)}
          {state.errors.length ? <div className="mt-2 grid gap-2">{state.errors.map((error) => <div key={error} className="rounded-xl bg-white/70 px-3 py-2">{error}</div>)}</div> : null}
        </div>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          {actions.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActive(tab.key)} className={`rounded-2xl p-4 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${active === tab.key ? 'bg-blue-50 ring-activeBlue' : 'bg-slate-50 ring-slate-200'}`}>
              <div className="text-sm font-black text-slate-950">{tab.title}</div>
              <div className="text-xs font-bold text-activeBlue">{tab.zh}</div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{tab.note}</p>
            </button>
          ))}
        </div>

        {action.loading || action.message || action.error ? <div className={`mt-5 rounded-3xl p-4 text-xs font-bold ring-1 ${action.error ? 'bg-red-50 text-red-950 ring-red-200' : 'bg-blue-50 text-blue-950 ring-blue-200'}`}>{action.loading ? 'Submitting inspection/upload action… / 正在提交查验/上传操作…' : action.error ?? action.message}</div> : null}

        <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            {active === 'prepare_upload_path' ? <>
              <Input label="Inspection ID / 查验 ID" name="inspection_id" value={values.inspection_id} onChange={change} />
              <Input label="Service Request ID / 报修 ID" name="service_request_id" value={values.service_request_id} onChange={change} />
              <Input label="Job ID / 工单 ID" name="job_id" value={values.job_id} onChange={change} />
              <Input label="File Name / 文件名" name="file_name" value={values.file_name} onChange={change} />
              <Input label="File Type / 文件类型" name="file_type" value={values.file_type} onChange={change} placeholder="image / video / document / signature / other" />
            </> : null}
            {active === 'schedule_inspection' ? <>
              <Input label="Service Request ID / 报修 ID" name="service_request_id" value={values.service_request_id} onChange={change} />
              <Input label="Job ID / 工单 ID" name="job_id" value={values.job_id} onChange={change} />
              <Input label="Customer ID / 客户 ID" name="customer_id" value={values.customer_id} onChange={change} />
              <Input label="Engineer ID / 工程师 ID" name="engineer_id" value={values.engineer_id} onChange={change} />
              <Input label="Scheduled At / 查验时间" name="scheduled_at" value={values.scheduled_at} onChange={change} placeholder="2026-05-29T10:00:00+08:00" />
              <Input label="Location / 地点" name="location" value={values.location} onChange={change} />
              <Input label="Status / 状态" name="status" value={values.status} onChange={change} />
            </> : null}
            {active === 'submit_inspection_form' ? <>
              <Input label="Inspection ID / 查验 ID" name="inspection_id" value={values.inspection_id} onChange={change} />
              <Input label="Status / 状态" name="status" value={values.status} onChange={change} />
              <Input label="Customer Present true/false / 客户在场" name="customer_present" value={values.customer_present} onChange={change} />
              <Input label="Signature Required true/false / 是否需签名" name="signature_required" value={values.signature_required} onChange={change} />
              <Textarea label="Findings / 查验发现" name="findings" value={values.findings} onChange={change} />
              <Textarea label="Diagnosis / 诊断" name="diagnosis" value={values.diagnosis} onChange={change} />
              <Textarea label="Recommended Action / 建议处理" name="recommended_action" value={values.recommended_action} onChange={change} />
            </> : null}
            {active === 'assign_engineer' ? <>
              <Input label="Inspection ID / 查验 ID" name="inspection_id" value={values.inspection_id} onChange={change} />
              <Input label="Engineer ID / 工程师 ID" name="engineer_id" value={values.engineer_id} onChange={change} />
              <Input label="Status / 状态" name="status" value={values.status} onChange={change} />
            </> : null}
            {active === 'create_upload_review' ? <>
              <Input label="Inspection ID / 查验 ID" name="inspection_id" value={values.inspection_id} onChange={change} />
              <Input label="Service Request ID / 报修 ID" name="service_request_id" value={values.service_request_id} onChange={change} />
              <Input label="Job ID / 工单 ID" name="job_id" value={values.job_id} onChange={change} />
              <Input label="File Name / 文件名" name="file_name" value={values.file_name} onChange={change} />
              <Input label="File Type / 文件类型" name="file_type" value={values.file_type} onChange={change} placeholder="image / video / document / signature / other" />
              <Input label="Storage Path / 存储路径" name="storage_path" value={values.storage_path} onChange={change} />
              <Input label="Compression Status / 压缩状态" name="compression_status" value={values.compression_status} onChange={change} />
              <Input label="Original Size Bytes / 原始大小" name="original_size_bytes" value={values.original_size_bytes} onChange={change} />
              <Input label="Compressed Size Bytes / 压缩后大小" name="compressed_size_bytes" value={values.compressed_size_bytes} onChange={change} />
              <Input label="Checksum SHA256" name="checksum_sha256" value={values.checksum_sha256} onChange={change} />
              <Textarea label="Review Notes / 审核备注" name="review_notes" value={values.review_notes} onChange={change} />
            </> : null}
            {active === 'review_upload' ? <>
              <Input label="Upload Review ID / 上传审核 ID" name="upload_review_id" value={values.upload_review_id} onChange={change} />
              <Input label="Review Status / 审核状态" name="review_status" value={values.review_status} onChange={change} placeholder="approved / rejected / needs_redaction" />
              <Textarea label="Review Notes / 审核备注" name="review_notes" value={values.review_notes} onChange={change} />
            </> : null}
            {active === 'queue_customer_notification' ? <>
              <Input label="Related Object Type / 关联对象类型" name="related_object_type" value={values.related_object_type} onChange={change} />
              <Input label="Related Object ID / 关联对象 ID" name="related_object_id" value={values.related_object_id} onChange={change} />
              <Input label="Customer ID / 客户 ID" name="customer_id" value={values.customer_id} onChange={change} />
              <Input label="Channel / 渠道" name="channel" value={values.channel} onChange={change} />
              <Input label="Subject / 标题" name="subject" value={values.subject} onChange={change} />
              <Textarea label="Body / 内容" name="body" value={values.body} onChange={change} />
            </> : null}
          </div>
          <button type="submit" disabled={action.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Submit via live API / 通过真实 API 提交</button>
        </form>

        {action.result ? <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200"><div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Last Inspection API Result / 最近查验 API 返回</div></div><pre className="max-h-72 overflow-auto whitespace-pre-wrap p-5 text-xs font-semibold text-slate-700">{JSON.stringify(action.result, null, 2)}</pre></div> : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200"><div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Recent Inspections / 最近查验</div></div>{state.inspections.length ? state.inspections.map((row) => <div key={String(row.inspection_id)} className="border-t border-slate-200 px-5 py-3 text-sm"><div className="font-black text-slate-950">{shortId(row.inspection_id)} · {String(row.status ?? '—')}</div><div className="mt-1 text-xs font-bold text-slate-500">Engineer {shortId(row.engineer_id)} · {formatDate(row.scheduled_at)}</div><div className="mt-1 text-xs font-semibold text-slate-500">{String(row.location ?? '')}</div></div>) : <div className="border-t border-slate-200 px-5 py-6 text-sm font-bold text-slate-500">No inspections returned. / 暂无查验记录。</div>}</div>
          <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200"><div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Upload Reviews / 上传审核</div></div>{state.upload_reviews.length ? state.upload_reviews.map((row) => <div key={String(row.upload_review_id)} className="border-t border-slate-200 px-5 py-3 text-sm"><div className="font-black text-slate-950">{String(row.file_name ?? 'file')} · {String(row.review_status ?? '—')} · {String(row.compression_status ?? '—')}</div><div className="mt-1 text-xs font-bold text-activeBlue">{shortId(row.upload_review_id)} · {String(row.file_type ?? 'image')}</div><div className="mt-1 text-xs font-semibold text-slate-500">{String(row.storage_path ?? '')}</div><div className="mt-1 text-xs font-semibold text-slate-500">Attached: {String(row.attached_to_record ?? false)} · Notification: {shortId(row.notification_id)}</div></div>) : <div className="border-t border-slate-200 px-5 py-6 text-sm font-bold text-slate-500">No upload reviews returned. / 暂无上传审核。</div>}</div>
        </div>
      </div>
    </section>
  );
}
