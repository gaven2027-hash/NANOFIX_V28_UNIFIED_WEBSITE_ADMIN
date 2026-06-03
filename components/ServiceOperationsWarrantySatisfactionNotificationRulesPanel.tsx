'use client';

import { useState } from 'react';

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue';

export function ServiceOperationsWarrantySatisfactionNotificationRulesPanel() {
  const [state, setState] = useState({
    sendNotSatisfied: true,
    sendReopened: true,
    sendLowRating: true,
    saving: false,
    message: ''
  });

  async function submit(apply: boolean) {
    setState((current) => ({ ...current, saving: true, message: '' }));
    try {
      const response = await fetch('/api/admin/service-operations/warranty-satisfaction-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply, rules: state })
      });
      const json = await response.json().catch(() => ({}));
      setState((current) => ({
        ...current,
        saving: false,
        message: response.ok && json.ok ? 'Rules processed successfully.' : json.error || 'Unable to process rules.'
      }));
    } catch {
      setState((current) => ({ ...current, saving: false, message: 'Notification API unavailable.' }));
    }
  }

  return (
    <section id="warranty-satisfaction-notification-rules" className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Warranty Satisfaction Rules</div>
          <h3 className="mt-2 text-xl font-black text-slate-950">Notification rules for warranty satisfaction follow-up</h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Preview or apply customer and internal notices for not-satisfied, reopened, low-rating and resolved follow-up records.
          </p>
        </div>
        <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">Admin only</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className={inputClass}>
          <input type="checkbox" checked={state.sendNotSatisfied} onChange={(event) => setState((current) => ({ ...current, sendNotSatisfied: event.target.checked }))} />
          <span className="ml-2 text-sm font-bold">Not satisfied follow-up</span>
        </label>
        <label className={inputClass}>
          <input type="checkbox" checked={state.sendReopened} onChange={(event) => setState((current) => ({ ...current, sendReopened: event.target.checked }))} />
          <span className="ml-2 text-sm font-bold">Reopened claims</span>
        </label>
        <label className={inputClass}>
          <input type="checkbox" checked={state.sendLowRating} onChange={(event) => setState((current) => ({ ...current, sendLowRating: event.target.checked }))} />
          <span className="ml-2 text-sm font-bold">Low rating alerts</span>
        </label>
      </div>

      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">
        Rules only create queued notices. They do not edit quotations, invoices, warranties or payments.
      </div>

      {state.message ? <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950 ring-1 ring-blue-100">{state.message}</div> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => void submit(false)} disabled={state.saving} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-200 disabled:opacity-50">Preview Rules</button>
        <button type="button" onClick={() => void submit(true)} disabled={state.saving} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Apply Rules</button>
      </div>
    </section>
  );
}
