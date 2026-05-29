'use client';

import { FormEvent, useState } from 'react';

type FormKind = 'lead' | 'service_request' | 'job';
type ApiPayload = Record<string, unknown>;
type FormState = {
  loading: boolean;
  message: string | null;
  error: string | null;
  lastRecord: ApiPayload | null;
};

type FormValues = Record<string, string>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const defaults: Record<FormKind, FormValues> = {
  lead: {
    object_id: '',
    name: '',
    phone: '',
    email: '',
    source_platform: 'admin',
    priority: 'P2',
    issue_type: 'Leakage inspection',
    message: ''
  },
  service_request: {
    object_id: '',
    contact_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address_text: '',
    postal_code: '',
    leak_location: '',
    issue_description: '',
    preferred_time_text: ''
  },
  job: {
    object_id: '',
    service_request_id: '',
    engineer_id: '',
    scheduled_at: '',
    status: 'assigned',
    notes: ''
  }
};

const tabs: Array<{ key: FormKind; title: string; zh: string; note: string }> = [
  { key: 'lead', title: 'Lead Form', zh: '线索表单', note: 'Create or update a lead with contact and issue source details.' },
  { key: 'service_request', title: 'Service Request Form', zh: '报修请求表单', note: 'Create or update a repair request before converting into inspection/job flow.' },
  { key: 'job', title: 'Job Form', zh: '工单表单', note: 'Create or update a job linked to a real service_request_id.' }
];

function textValue(form: FormValues, key: string) {
  return form[key]?.trim() ?? '';
}

function validate(kind: FormKind, form: FormValues) {
  const errors: string[] = [];
  const objectId = textValue(form, 'object_id');
  const isUpdate = Boolean(objectId);
  if (objectId && !uuidPattern.test(objectId)) errors.push('Object ID must be a valid UUID for update mode. / 更新模式的 Object ID 必须是有效 UUID。');

  if (kind === 'lead') {
    if (!textValue(form, 'name')) errors.push('Lead name is required. / 线索姓名必填。');
    if (!textValue(form, 'phone') && !textValue(form, 'email')) errors.push('Lead phone or email is required. / 线索电话或邮箱至少填写一个。');
    if (textValue(form, 'email') && !emailPattern.test(textValue(form, 'email'))) errors.push('Lead email format is invalid. / 线索邮箱格式无效。');
  }

  if (kind === 'service_request') {
    if (!textValue(form, 'contact_name')) errors.push('Contact name is required. / 联系人姓名必填。');
    if (!textValue(form, 'phone') && !textValue(form, 'whatsapp') && !textValue(form, 'email')) errors.push('Phone, WhatsApp or email is required. / 电话、WhatsApp 或邮箱至少填写一个。');
    if (textValue(form, 'email') && !emailPattern.test(textValue(form, 'email'))) errors.push('Service request email format is invalid. / 报修邮箱格式无效。');
    if (!textValue(form, 'issue_description')) errors.push('Issue description is required. / 问题描述必填。');
  }

  if (kind === 'job') {
    if (!isUpdate && !uuidPattern.test(textValue(form, 'service_request_id'))) errors.push('A valid service_request_id is required when creating a job. / 创建工单必须填写有效 service_request_id。');
    if (textValue(form, 'engineer_id') && !uuidPattern.test(textValue(form, 'engineer_id'))) errors.push('Engineer ID must be a valid UUID when provided. / 工程师 ID 如填写必须是有效 UUID。');
    if (!textValue(form, 'notes')) errors.push('Job notes are required. / 工单备注必填。');
  }

  return { ok: errors.length === 0, errors, isUpdate };
}

function payloadFor(kind: FormKind, form: FormValues) {
  const payload: Record<string, unknown> = { machine: kind };
  for (const [key, value] of Object.entries(form)) {
    const clean = value.trim();
    if (!clean || key === 'object_id') continue;
    payload[key] = clean;
  }
  if (kind === 'lead') payload.title = textValue(form, 'name');
  if (kind === 'service_request') payload.title = textValue(form, 'contact_name');
  if (kind === 'job') payload.title = `Job for ${textValue(form, 'service_request_id').slice(0, 8)}`;
  return payload;
}

async function callServiceOperations(kind: FormKind, form: FormValues) {
  const validation = validate(kind, form);
  if (!validation.ok) return { ok: false, payload: null, error: validation.errors.join('\n') };
  const objectId = textValue(form, 'object_id');
  const body = validation.isUpdate
    ? { action: 'update', machine: kind, object_id: objectId, data: payloadFor(kind, form) }
    : payloadFor(kind, form);

  try {
    const response = await fetch('/api/admin/service-operations', {
      method: validation.isUpdate ? 'PATCH' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try { payload = text ? JSON.parse(text) as ApiPayload : null; } catch { payload = null; }
    const error = typeof payload?.error === 'string' ? payload.error : `Service Operations ${validation.isUpdate ? 'update' : 'create'} returned ${response.status}`;
    return { ok: response.ok && payload?.ok !== false, payload, error: response.ok && payload?.ok !== false ? null : error };
  } catch (error) {
    return { ok: false, payload: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function Input({ label, name, value, onChange, placeholder, required = false }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
      {label}{required ? <span className="text-red-500"> *</span> : null}
      <input value={value} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

function Textarea({ label, name, value, onChange, placeholder, required = false }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">
      {label}{required ? <span className="text-red-500"> *</span> : null}
      <textarea value={value} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} rows={3} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

export function ServiceOperationsDedicatedForms() {
  const [active, setActive] = useState<FormKind>('lead');
  const [forms, setForms] = useState<Record<FormKind, FormValues>>(defaults);
  const [state, setState] = useState<FormState>({ loading: false, message: null, error: null, lastRecord: null });
  const form = forms[active];
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];
  const isUpdate = Boolean(textValue(form, 'object_id'));

  function change(name: string, value: string) {
    setForms((current) => ({ ...current, [active]: { ...current[active], [name]: value } }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, message: null, error: null, lastRecord: null });
    const result = await callServiceOperations(active, form);
    if (!result.ok) {
      setState({ loading: false, message: null, error: result.error ?? 'Submit failed.', lastRecord: null });
      return;
    }
    setState({ loading: false, message: `${isUpdate ? 'Update' : 'Create'} ${activeTab.title} completed through live API. / 已通过真实 API 完成${isUpdate ? '更新' : '新增'}。`, error: null, lastRecord: result.payload?.record && typeof result.payload.record === 'object' ? result.payload.record as ApiPayload : result.payload });
  }

  function resetActive() {
    setForms((current) => ({ ...current, [active]: defaults[active] }));
    setState({ loading: false, message: null, error: null, lastRecord: null });
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Service Operations Dedicated Forms / 业务专用表单</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Lead / Service Request / Job Create & Edit</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">These forms use client-side validation first, then submit to `/api/admin/service-operations`. Success is shown only after the server API returns OK. / 表单先做前端校验，再提交服务端 API；只有服务端返回 OK 才显示成功。</p>
      </div>
      <div className="p-6">
        <div className="grid gap-3 md:grid-cols-3">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActive(tab.key)} className={`rounded-2xl p-4 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${active === tab.key ? 'bg-blue-50 ring-activeBlue' : 'bg-slate-50 ring-slate-200'}`}>
              <div className="text-sm font-black text-slate-950">{tab.title}</div>
              <div className="text-xs font-bold text-activeBlue">{tab.zh}</div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{tab.note}</p>
            </button>
          ))}
        </div>

        {state.loading || state.message || state.error ? <div className={`mt-5 rounded-3xl p-4 text-xs font-bold ring-1 ${state.error ? 'bg-red-50 text-red-950 ring-red-200' : 'bg-blue-50 text-blue-950 ring-blue-200'}`}>{state.loading ? 'Submitting dedicated form… / 正在提交专用表单…' : state.error ?? state.message}</div> : null}

        <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Object ID for update / 更新用 ID" name="object_id" value={form.object_id} onChange={change} placeholder="Leave blank to create / 留空为新增" />
            {active === 'lead' ? <>
              <Input label="Name / 姓名" name="name" value={form.name} onChange={change} required />
              <Input label="Phone / 电话" name="phone" value={form.phone} onChange={change} />
              <Input label="Email / 邮箱" name="email" value={form.email} onChange={change} />
              <Input label="Source Platform / 来源" name="source_platform" value={form.source_platform} onChange={change} />
              <Input label="Priority / 优先级" name="priority" value={form.priority} onChange={change} />
              <Input label="Issue Type / 问题类型" name="issue_type" value={form.issue_type} onChange={change} />
              <Textarea label="Message / 留言" name="message" value={form.message} onChange={change} />
            </> : null}
            {active === 'service_request' ? <>
              <Input label="Contact Name / 联系人" name="contact_name" value={form.contact_name} onChange={change} required />
              <Input label="Phone / 电话" name="phone" value={form.phone} onChange={change} />
              <Input label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={change} />
              <Input label="Email / 邮箱" name="email" value={form.email} onChange={change} />
              <Input label="Address / 地址" name="address_text" value={form.address_text} onChange={change} />
              <Input label="Postal Code / 邮编" name="postal_code" value={form.postal_code} onChange={change} />
              <Input label="Leak Location / 漏水位置" name="leak_location" value={form.leak_location} onChange={change} />
              <Input label="Preferred Time / 预约时间" name="preferred_time_text" value={form.preferred_time_text} onChange={change} />
              <Textarea label="Issue Description / 问题描述" name="issue_description" value={form.issue_description} onChange={change} required />
            </> : null}
            {active === 'job' ? <>
              <Input label="Service Request ID / 报修 ID" name="service_request_id" value={form.service_request_id} onChange={change} placeholder="Required for create / 新增必填 UUID" required={!isUpdate} />
              <Input label="Engineer ID / 工程师 ID" name="engineer_id" value={form.engineer_id} onChange={change} placeholder="Optional UUID / 可选 UUID" />
              <Input label="Scheduled At / 预约施工时间" name="scheduled_at" value={form.scheduled_at} onChange={change} placeholder="2026-05-29T10:00:00+08:00" />
              <Input label="Status / 状态" name="status" value={form.status} onChange={change} />
              <Textarea label="Notes / 工单备注" name="notes" value={form.notes} onChange={change} required />
            </> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{isUpdate ? 'Update via live API / 真实更新' : 'Create via live API / 真实新增'}</button>
            <button type="button" onClick={resetActive} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Reset / 重置</button>
          </div>
        </form>

        {state.lastRecord ? <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200"><div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Last API Record / 最近 API 返回记录</div></div><pre className="max-h-80 overflow-auto whitespace-pre-wrap p-5 text-xs font-semibold text-slate-700">{JSON.stringify(state.lastRecord, null, 2)}</pre></div> : null}
      </div>
    </section>
  );
}
