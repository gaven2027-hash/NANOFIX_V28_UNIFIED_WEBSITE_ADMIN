'use client';

import { FormEvent, useState } from 'react';

type Result = Record<string, unknown> | null;
type State = { loading: boolean; error: string | null; result: Result };

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

async function submitInspection(payload: Record<string, string>) {
  const res = await fetch('/api/admin/service-operations/inspection-result', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; inspection?: Result; result?: Result } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Inspection Result API is not connected yet (${res.status}).`);
  return json?.inspection ?? json?.result ?? null;
}

export function ServiceOperationsInspectionResultWorkspace() {
  const [jobId, setJobId] = useState('');
  const [summary, setSummary] = useState('');
  const [leakCause, setLeakCause] = useState('');
  const [solution, setSolution] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [warrantySuggestion, setWarrantySuggestion] = useState('');
  const [state, setState] = useState<State>({ loading: false, error: null, result: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = jobId.trim();
    if (!id) {
      setState({ loading: false, error: 'Job ID is required before submitting inspection result. / 提交查验结果前必须输入工单 ID。', result: null });
      return;
    }
    setState({ loading: true, error: null, result: null });
    try {
      const result = await submitInspection({ job_id: id, summary: summary.trim(), leak_cause: leakCause.trim(), recommended_solution: solution.trim(), urgency, estimated_cost: estimatedCost.trim(), warranty_suggestion: warrantySuggestion.trim() });
      setState({ loading: false, error: null, result });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), result: null });
    }
  }

  return (
    <section id="inspection-result-live-workspace" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E.1.5 / Inspection Result</div>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Inspection Result & Quotation Handover / 查验结果与报价交接</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">Record inspection findings and prepare the handover to quotation creation. This workspace must use a guarded server API and must not show fake report success. / 记录查验结论并准备交接到报价创建，必须使用受保护服务端 API，不能显示假报告成功。</p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Job ID<input value={jobId} onChange={(event) => setJobId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Required / 必填" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Urgency<select value={urgency} onChange={(event) => setUrgency(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100"><option value="normal">Normal / 普通</option><option value="urgent">Urgent / 紧急</option><option value="critical">Critical / 严重</option></select></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">Inspection Summary<textarea value={summary} onChange={(event) => setSummary(event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Summary / 查验摘要" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Leak Cause<textarea value={leakCause} onChange={(event) => setLeakCause(event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Cause / 原因" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Recommended Solution<textarea value={solution} onChange={(event) => setSolution(event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Solution / 方案" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Estimated Cost<input value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="Optional estimate / 预估费用" /></label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Warranty Suggestion<input value={warrantySuggestion} onChange={(event) => setWarrantySuggestion(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" placeholder="e.g. 1 year / 例如 1 年" /></label>
        <div className="md:col-span-2"><button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Submitting… / 提交中…' : 'Submit Inspection Result / 提交查验结果'}</button></div>
      </form>

      {state.error ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Live inspection API blocked or not connected: {state.error}<br />Next required endpoint: /api/admin/service-operations/inspection-result</div> : null}
      {state.result ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-950 ring-1 ring-emerald-200">Inspection result saved by live API. / 查验结果已由真实 API 保存。<br />Inspection ID: {text(state.result.inspection_id)} / Status: {text(state.result.status)}</div> : null}

      <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-200">
        Production rule / 生产规则：Inspection result must write inspection records, job events, quotation handover metadata, task events and audit logs. / 查验结果必须写入查验记录、工单事件、报价交接资料、任务事件和审计日志。
      </div>
    </section>
  );
}
