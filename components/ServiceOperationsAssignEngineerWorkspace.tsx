'use client';

import { FormEvent, useState } from 'react';

type Result = Record<string, unknown> | null;
type State = { loading: boolean; error: string | null; result: Result };

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

async function assignEngineer(payload: Record<string, string>) {
  const res = await fetch('/api/admin/service-operations/assign-engineer', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; assignment?: Result; result?: Result } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Assign Engineer API is not connected yet (${res.status}).`);
  return json?.assignment ?? json?.result ?? null;
}

export function ServiceOperationsAssignEngineerWorkspace() {
  const [jobId, setJobId] = useState('');
  const [engineerProfileId, setEngineerProfileId] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [state, setState] = useState<State>({ loading: false, error: null, result: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = jobId.trim();
    if (!id) {
      setState({ loading: false, error: 'Job ID is required before assigning an engineer. / 分配工程师前必须输入工单 ID。', result: null });
      return;
    }
    setState({ loading: true, error: null, result: null });
    try {
      const result = await assignEngineer({ job_id: id, engineer_profile_id: engineerProfileId.trim(), inspection_date: inspectionDate.trim(), notes: notes.trim() });
      setState({ loading: false, error: null, result });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), result: null });
    }
  }

  return (
    <section id="assign-engineer-live-workspace" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E.1.4 / Assign Engineer</div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Assign Engineer & Inspection / 分配工程师与查验</h2>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">This workspace connects Job to Engineer and Inspection. It must use a guarded server API and must not show fake assignment success. / 本工作区连接工单、工程师和查验，必须使用受保护服务端 API，不能显示假分配成功。</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Job ID<input value={jobId} onChange={(event) => setJobId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Required / 必填" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Engineer Profile ID<input value={engineerProfileId} onChange={(event) => setEngineerProfileId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Optional until staff picker API is connected / 可选" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Inspection Date<input type="datetime-local" value={inspectionDate} onChange={(event) => setInspectionDate(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Inspection notes / 查验备注" /></label>
        <div className="md:col-span-2"><button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Assigning… / 分配中…' : 'Assign Engineer / 分配工程师'}</button></div>
      </form>

      {state.error ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Live assign-engineer API blocked or not connected: {state.error}<br />Next required endpoint: /api/admin/service-operations/assign-engineer</div> : null}
      {state.result ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-950 ring-1 ring-emerald-200">Engineer assigned by live API. / 工程师已由真实 API 分配。<br />Assignment: {text(state.result.assignment_id)} / Status: {text(state.result.status)}</div> : null}

      <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-200">
        Production rule / 生产规则：Engineer assignment must update jobs, inspection schedule, task queue and audit logs through a guarded server workflow. / 工程师分配必须通过受保护服务端流程更新工单、查验排程、任务队列和审计日志。
      </div>
    </section>
  );
}
