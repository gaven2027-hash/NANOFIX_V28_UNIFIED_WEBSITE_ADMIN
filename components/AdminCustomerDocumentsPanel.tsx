'use client';

import { FormEvent, useState } from 'react';

type Row = Record<string, unknown>;
type State = { loading: boolean; error: string | null; message: string | null; result: Row | null; customers: Row[]; jobs: Row[]; quotations: Row[]; invoices: Row[]; warranties: Row[] };
type EditValues = { type: string; id: string; total: string; status: string; warranty_years: string; warranty_terms: string; visible_to_customer: string; pdf_storage_path: string; payment_url: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const defaultEdit: EditValues = { type: 'quotation', id: '', total: '', status: '', warranty_years: '', warranty_terms: '', visible_to_customer: '', pdf_storage_path: '', payment_url: '' };

async function lookup(q: string) {
  const response = await fetch(`/api/admin/customer-center/documents?q=${encodeURIComponent(q)}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Lookup API returned ${response.status}`);
  return payload ?? { ok: true };
}

async function updateDocument(values: EditValues) {
  const body: Row = { type: values.type, id: values.id };
  if (values.total) body.total = Number(values.total);
  if (values.status) body[values.type === 'quotation' ? 'approval_status' : 'status'] = values.status;
  if (values.warranty_years) body.warranty_years = Number(values.warranty_years);
  if (values.warranty_terms) body.warranty_terms = values.warranty_terms;
  if (values.visible_to_customer) body.visible_to_customer = values.visible_to_customer === 'true';
  if (values.pdf_storage_path) body.pdf_storage_path = values.pdf_storage_path;
  if (values.payment_url) body.payment_url = values.payment_url;
  const response = await fetch('/api/admin/customer-center/documents', {
    method: 'PATCH',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Update API returned ${response.status}`);
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

function Cards({ title, rows, idField, onPick }: { title: string; rows: Row[]; idField: string; onPick?: (row: Row) => void }) {
  return (
    <section className="grid gap-3 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-950">{title}</h3><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-activeBlue">{rows.length}</span></div>
      {!rows.length ? <div className="rounded-2xl bg-slate-50 p-4 text-xs font-bold text-slate-500 ring-1 ring-slate-200">No records / 暂无记录</div> : null}
      {rows.map((row, index) => (
        <article key={String(row[idField] ?? index)} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-950">{formatValue(row[idField])}</div>
              <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(row.status ?? row.approval_status)} · {formatValue(row.total ?? row.warranty_years ?? row.confirmed_warranty_years)}</div>
            </div>
            {onPick ? <button type="button" onClick={() => onPick(row)} className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100">Pick / 选择</button> : null}
          </div>
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{JSON.stringify(row, null, 2)}</pre>
        </article>
      ))}
    </section>
  );
}

export function AdminCustomerDocumentsPanel() {
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<EditValues>(defaultEdit);
  const [state, setState] = useState<State>({ loading: false, error: null, message: null, result: null, customers: [], jobs: [], quotations: [], invoices: [], warranties: [] });

  async function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await lookup(q);
      setState({ loading: false, error: null, message: 'Customer documents loaded. / 客户单据已读取。', result, customers: Array.isArray(result.customers) ? result.customers as Row[] : [], jobs: Array.isArray(result.jobs) ? result.jobs as Row[] : [], quotations: Array.isArray(result.quotations) ? result.quotations as Row[] : [], invoices: Array.isArray(result.invoices) ? result.invoices as Row[] : [], warranties: Array.isArray(result.warranties) ? result.warranties as Row[] : [] });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await updateDocument(edit);
      setState((current) => ({ ...current, loading: false, error: null, message: 'Document updated. Search again to refresh linked records. / 单据已修改，请重新搜索刷新关联记录。', result }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pick(type: string, idField: string, row: Row) {
    setEdit((current) => ({ ...current, type, id: String(row[idField] ?? ''), total: row.total === undefined ? current.total : String(row.total ?? ''), status: String(row.status ?? row.approval_status ?? ''), warranty_years: row.warranty_years === undefined ? current.warranty_years : String(row.warranty_years ?? ''), warranty_terms: String(row.warranty_terms ?? ''), visible_to_customer: row.visible_to_customer === undefined ? '' : String(row.visible_to_customer), pdf_storage_path: String(row.pdf_storage_path ?? ''), payment_url: String(row.payment_url ?? '') }));
  }

  return (
    <section className="grid gap-6 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Admin Customer Documents / 客户单据管理</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Lookup & Edit Customer Quotations, Invoices and Warranties</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Search by customer ID, account/profile ID, phone, email or name. Admin/Finance/Operations may revise official documents and re-push them to Customer Portal. / 可通过客户ID、账号/Profile ID、手机号、邮箱或姓名查询；总后台/财务/运营可修改正式单据并重新推送客户。</p>
      </div>
      {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
      {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
      <form onSubmit={(event) => void onLookup(event)} className="flex flex-wrap gap-3 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <input className={`${inputClass} min-w-[280px] flex-1`} value={q} onChange={(event) => setQ(event.target.value)} placeholder="Customer ID / Account ID / Phone / Email / Name" />
        <button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Search / 查询</button>
      </form>
      <form onSubmit={(event) => void onUpdate(event)} className="grid gap-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <h3 className="text-sm font-black text-slate-950">Edit Selected Document / 修改选中单据</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Type<select className={inputClass} value={edit.type} onChange={(event) => setEdit((current) => ({ ...current, type: event.target.value }))}><option value="quotation">Quotation</option><option value="invoice">Invoice</option><option value="warranty">Warranty</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">ID<input className={inputClass} value={edit.id} onChange={(event) => setEdit((current) => ({ ...current, id: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Total<input className={inputClass} value={edit.total} onChange={(event) => setEdit((current) => ({ ...current, total: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Status<input className={inputClass} value={edit.status} onChange={(event) => setEdit((current) => ({ ...current, status: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Warranty Years<input className={inputClass} value={edit.warranty_years} onChange={(event) => setEdit((current) => ({ ...current, warranty_years: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Visible<select className={inputClass} value={edit.visible_to_customer} onChange={(event) => setEdit((current) => ({ ...current, visible_to_customer: event.target.value }))}><option value="">No change</option><option value="true">true</option><option value="false">false</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-3">PDF Path<input className={inputClass} value={edit.pdf_storage_path} onChange={(event) => setEdit((current) => ({ ...current, pdf_storage_path: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-3">Payment URL<input className={inputClass} value={edit.payment_url} onChange={(event) => setEdit((current) => ({ ...current, payment_url: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-3">Warranty Terms<textarea className={inputClass} rows={3} value={edit.warranty_terms} onChange={(event) => setEdit((current) => ({ ...current, warranty_terms: event.target.value }))} /></label>
        </div>
        <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white hover:bg-slate-900 disabled:opacity-50">Update Document / 修改单据</button>
      </form>
      <div className="grid gap-4 xl:grid-cols-2">
        <Cards title="Customers / 客户" rows={state.customers} idField="customer_id" />
        <Cards title="Jobs / 工单" rows={state.jobs} idField="job_id" />
        <Cards title="Quotations / 报价" rows={state.quotations} idField="quotation_id" onPick={(row) => pick('quotation', 'quotation_id', row)} />
        <Cards title="Invoices / 发票" rows={state.invoices} idField="invoice_id" onPick={(row) => pick('invoice', 'invoice_id', row)} />
        <Cards title="Warranties / 保修单" rows={state.warranties} idField="warranty_id" onPick={(row) => pick('warranty', 'warranty_id', row)} />
      </div>
      {state.result ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
    </section>
  );
}
