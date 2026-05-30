'use client';

import { FormEvent, useEffect, useState } from 'react';

type QuoteResponse = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; responses: QuoteResponse[]; result: Record<string, unknown> | null };
type Values = { response_id: string; internal_review_notes: string; line_items_json: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';

const defaultLineItems = JSON.stringify([
  { description: 'Revised NANOFIX waterproofing / leak repair works', qty: 1, unit_price: 0 }
], null, 2);

async function fetchQuoteResponses() {
  const response = await fetch('/api/admin/service-operations/quote-responses?limit=30', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; responses?: QuoteResponse[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; responses?: QuoteResponse[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Quote responses API returned ${response.status}`);
  return Array.isArray(payload?.responses) ? payload.responses : [];
}

async function postQuoteResponseAction(action: string, values: Values) {
  let lineItems: unknown = undefined;
  if (action === 'create_revised_quotation_version') {
    try { lineItems = JSON.parse(values.line_items_json); } catch { throw new Error('Line items JSON is invalid. / 报价明细 JSON 格式错误。'); }
  }
  const response = await fetch('/api/admin/service-operations/quote-responses', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action,
      response_id: values.response_id,
      internal_review_notes: values.internal_review_notes,
      line_items: lineItems
    })
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Quote response action returned ${response.status}`);
  return payload ?? { ok: true };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  return String(value);
}

export function ServiceOperationsQuoteResponsePanel() {
  const [state, setState] = useState<State>({ loading: true, error: null, message: null, responses: [], result: null });
  const [values, setValues] = useState<Values>({ response_id: '', internal_review_notes: '', line_items_json: defaultLineItems });

  async function load() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const responses = await fetchQuoteResponses();
      setState((current) => ({ ...current, loading: false, error: null, responses }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pick(response: QuoteResponse) {
    setValues((current) => ({
      ...current,
      response_id: String(response.response_id ?? ''),
      internal_review_notes: String(response.internal_review_notes ?? ''),
      line_items_json: current.line_items_json || defaultLineItems
    }));
  }

  async function submit(action: string, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await postQuoteResponseAction(action, values);
      const responses = await fetchQuoteResponses();
      const message = action === 'create_revised_quotation_version'
        ? 'Revised quotation version created and pushed to customer. / 已创建新版报价并重新推送客户确认。'
        : action === 'resolve_quote_response'
          ? 'Customer quote response resolved. / 客户报价回复已处理完成。'
          : 'Customer quote response reviewed. / 客户报价回复已标记审核。';
      setState({ loading: false, error: null, message, responses, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error), result: null }));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Quote Responses / 客户报价回复</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Review, Revise & Re-Push Quotations</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Customers can accept, decline or request revision with messages. They cannot edit quotation or invoice content. Admin/Finance reviews messages, creates a revised quotation version, and pushes it back for customer confirmation. / 客户可同意、不同意或留言要求修改，但不能修改报价或发票内容；总管理员/财务审核留言后，可创建新版报价并重新推送客户确认。</p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid h-fit gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-950">Latest Responses / 最新客户回复</h3>
            <button type="button" onClick={() => void load()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Refresh / 刷新</button>
          </div>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          {!state.responses.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No quote responses yet. / 暂无客户报价回复。</div> : null}
          {state.responses.map((response) => (
            <button key={String(response.response_id)} type="button" onClick={() => pick(response)} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">{formatValue(response.response_type)} · {formatValue(response.response_status)}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">Quotation: {formatValue(response.quotation_id)} · Version: {formatValue(response.quotation_version)}</div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">Pick / 选择</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600">
                <div>Response ID: {formatValue(response.response_id)}</div>
                <div>Total: {formatValue(response.quoted_total)}</div>
                <div>Customer Message: {formatValue(response.customer_message)}</div>
                <div>Created: {formatValue(response.created_at)}</div>
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={(event) => void submit('create_revised_quotation_version', event)} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Admin / Finance Action / 后台处理</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Response ID<input className={inputClass} value={values.response_id} onChange={(event) => setValues((current) => ({ ...current, response_id: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Internal Review Notes / 内部审核备注<textarea className={inputClass} rows={3} value={values.internal_review_notes} onChange={(event) => setValues((current) => ({ ...current, internal_review_notes: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Revised Quotation Line Items JSON / 新版报价明细 JSON<textarea className={inputClass} rows={8} value={values.line_items_json} onChange={(event) => setValues((current) => ({ ...current, line_items_json: event.target.value }))} /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">Only Admin/Finance can revise quotation line items. Customers can only respond with messages. / 只有后台总管理员/财务可以修改报价明细；客户只能回复留言。</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void submit('review_quote_response')} disabled={state.loading} className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50 disabled:opacity-50">Mark Reviewed / 标记已审核</button>
            <button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">Create Revised Quote / 创建新版报价</button>
            <button type="button" onClick={() => void submit('resolve_quote_response')} disabled={state.loading} className="rounded-2xl bg-slate-700 px-4 py-3 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50">Resolve / 完成处理</button>
          </div>
          {state.result ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>
      </div>
    </section>
  );
}
