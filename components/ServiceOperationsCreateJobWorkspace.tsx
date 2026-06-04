'use client';

import { FormEvent, useState } from 'react';

type Result = Record<string, unknown> | null;

type State = { loading: boolean; error: string | null; result: Result };

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

async function createJob(payload: Record<string, string>) {
  const res = await fetch('/api/admin/service-operations/create-job-from-request', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; job?: Result; result?: Result } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Create Job API is not connected yet (${res.status}).`);
  return json?.job ?? json?.result ?? null;
}

export function ServiceOperationsCreateJobWorkspace() {
  const [serviceRequestId, setServiceRequestId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [assigneeRole, setAssigneeRole] = useState('engineer');
  const [notes, setNotes] = useState('');
  const [state, setState] = useState<State>({ loading: false, error: null, result: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = serviceRequestId.trim();
    if (!id) {
      setState({ loading: false, error: 'Service Request ID is required before creating a job. / 创建工单前必须输入服务请求 ID。', result: null });
      return;
    }
    setState({ loading: true, error: null, result: null });
    try {
      const result = await createJob({ service_request_id: id, job_title: jobTitle.trim(), assignee_role: assigneeRole.trim(), notes: notes.trim() });
      setState({ loading: false, error: null, result });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), result: null });
    }
  }

  return (
    <section id="create-job-from-service-request" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E.1.3 / Create Job</div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Create Job from Service Request / 从服务请求创建工单</h2>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Connected API: /api/admin/service-operations/create-job-from-request</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Service Request ID<input value={serviceRequestId} onChange={(event) => setServiceRequestId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Required / 必填" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Job Title<input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Optional / 可选" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Assignee Role<select value={assigneeRole} onChange={(event) => setAssigneeRole(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"><option value="engineer">Engineer / 工程师</option><option value="operations_admin">Operations Admin / 运营管理员</option><option value="support">Support / 客服</option></select></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Optional job notes / 可选工单备注" /></label>
        <div className="md:col-span-2"><button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Creating… / 创建中…' : 'Create Job / 创建工单'}</button></div>
      </form>

      {state.error ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Live create-job API blocked or not connected: {state.error}<br />Next required endpoint: /api/admin/service-operations/create-job-from-request</div> : null}
      {state.result ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-950 ring-1 ring-emerald-200">Job created by live API. / 工单已由真实 API 创建。<br />Job ID: {text(state.result.job_id)} / Status: {text(state.result.status)}</div> : null}
    </section>
  );
}
