'use client';

import { FormEvent, useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; saving: boolean; error: string | null; note: string | null; rules: Row[]; preview: Row[]; result: Row | null };

async function getData() {
  const res = await fetch('/api/admin/service-operations/warranty-satisfaction-notifications', { credentials: 'same-origin', cache: 'no-store' });
  const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; rules?: Row[]; preview?: Row[] } | null;
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Rules API returned ${res.status}`);
  return { rules: json?.rules ?? [], preview: json?.preview ?? [] };
}

async function postData(dryRun: boolean) {
  const res = await fetch('/api/admin/service-operations/warranty-satisfaction-notifications', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dry_run: dryRun }) });
  const json = await res.json().catch(() => null) as Row | null;
  if (!res.ok || json?.ok === false) throw new Error(typeof json?.error === 'string' ? json.error : `Rules apply API returned ${res.status}`);
  return json ?? { ok: true };
}

function t(value: unknown) { return value === null || value === undefined || value === '' ? '—' : String(value); }

export function ServiceOperationsWarrantySatisfactionNotificationRulesPanel() {
  const [state, setState] = useState<State>({ loading: true, saving: false, error: null, note: null, rules: [], preview: [], result: null });
  async function refresh() {
    setState((s) => ({ ...s, loading: true, error: null }));
    try { const data = await getData(); setState((s) => ({ ...s, loading: false, ...data })); }
    catch (error) { setState((s) => ({ ...s, loading: false, error: error instanceof Error ? error.message : String(error) })); }
  }
  async function submit(event: FormEvent<HTMLFormElement>, dryRun: boolean) {
    event.preventDefault(); setState((s) => ({ ...s, saving: true, error: null, note: null }));
    try { const result = await postData(dryRun); const data = await getData(); setState({ loading: false, saving: false, error: null, note: dryRun ? 'Preview completed. / 预览完成。' : 'Rules applied. / 规则已执行。', result, ...data }); }
    catch (error) { setState((s) => ({ ...s, saving: false, error: error instanceof Error ? error.message : String(error) })); }
  }
  useEffect(() => { void refresh(); }, []);
  return (
    <section id="warranty-satisfaction-notification-rules" className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.5.3 / Notification Rules</div>
      <h2 className="mt-2 text-xl font-black text-slate-950">Warranty Satisfaction Notification Rules / 保修满意度通知规则</h2>
      <p className="mt-2 text-sm font-semibold text-slate-600">Preview or apply customer and internal notices for satisfaction, not-satisfied, reopened, low rating and resolved follow-up records. / 预览或执行满意、不满意、重新打开、低评分和跟进已解决通知。</p>
      {state.error ? <div className="mt-4 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
      {state.note ? <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.note}</div> : null}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"><h3 className="text-sm font-black text-slate-950">Rules / 规则</h3><div className="mt-3 grid gap-2">{state.rules.map((r) => <div key={t(r.rule_id)} className="rounded-2xl bg-white p-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{t(r.rule_id)} · {t(r.title)} · {t(r.channel)} · {t(r.severity)}</div>)}</div></div>
        <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"><h3 className="text-sm font-black text-slate-950">Preview / 预览</h3><div className="mt-3 grid gap-2">{state.preview.slice(0, 12).map((p, i) => <div key={`${t(p.rule_id)}-${i}`} className="rounded-2xl bg-white p-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"><b>{t(p.rule_id)} · {t(p.subject)}</b><br />{t(p.body)}</div>)}</div></div>
      </div>
      <form className="mt-5 flex flex-wrap gap-3">
        <button onClick={(e) => void submit(e, true)} disabled={state.saving} className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50 disabled:opacity-50">Preview Rules / 预览规则</button>
        <button onClick={(e) => void submit(e, false)} disabled={state.saving} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Apply Rules / 执行规则</button>
        <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50">Refresh / 刷新</button>
      </form>
      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">Rules only create queued notices. They do not edit quotations, invoices, warranties or payments. / 规则只创建通知队列，不修改报价、发票、保修或付款。</div>
    </section>
  );
}
