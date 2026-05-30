'use client';

import { FormEvent, useState } from 'react';

type Row = Record<string, unknown>;
type Payload = { ok?: boolean; error?: string; customers?: Row[]; job_ids?: string[]; quotations?: Row[]; invoices?: Row[]; warranties?: Row[]; acceptances?: Row[] };
type State = { loading: boolean; error: string | null; message: string | null; payload: Payload | null; result: Row | null };
type EditValues = { action: string; id: string; total: string; status: string; visible_to_customer: string; warranty_years: string; warranty_terms: string; coverage: string; starts_at: string; ends_at: string; pdf_storage_path: string; payment_url: string; public_ref: string };

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const defaultEdit: EditValues = { action: 'update_customer_quotation', id: '', total: '', status: 'draft', visible_to_customer: 'false', warranty_years: '', warranty_terms: '', coverage: '', starts_at: '', ends_at: '', pdf_storage_path: '', payment_url: '', public_ref: '' };

async function searchDocuments(query: string): Promise<Payload> {
  const response = await fetch(`/api/admin/service-operations/customer-documents?q=${encodeURIComponent(query)}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Payload | null = null;
  try { payload = text ? JSON.parse(text) as Payload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer document API returned ${response.status}`);
  return payload ?? { ok: true };
}

async function updateDocument(values: EditValues) {
  const body: Record<string, unknown> = {
    action: values.action,
    total: values.total ? Number(values.total) : undefined,
    visible_to_customer: values.visible_to_customer === 'true',
    pdf_storage_path: values.pdf_storage_path,
    payment_url: values.payment_url,
    public_ref: values.public_ref,
    warranty_terms: values.warranty_terms,
    coverage: values.coverage,
    starts_at: values.starts_at,
    ends_at: values.ends_at,
    warranty_years: values.warranty_years ? Number(values.warranty_years) : undefined,
    confirmed_warranty_years: values.warranty_years ? Number(values.warranty_years) : undefined
  };
  if (values.action === 'update_customer_quotation') {
    body.quotation_id = values.id;
    body.approval_status = values.status;
  } else if (values.action === 'update_customer_invoice') {
    body.invoice_id = values.id;
    body.status = values.status;
  } else if (values.action === 'update_customer_warranty') {
    body.warranty_id = values.id;
    body.status = values.status;
    body.terms_snapshot = values.warranty_terms || values.coverage;
  }
  const response = await fetch('/api/admin/service-operations/customer-documents', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Customer document update returned ${response.status}`);
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

function idOf(row: Row, type: 'quotation' | 'invoice' | 'warranty') {
  if (type === 'quotation') return String(row.quotation_id ?? '');
  if (type === 'invoice') return String(row.invoice_id ?? '');
  return String(row.warranty_id ?? '');
}

function Section({ title, zh, rows, type, onPick }: { title: string; zh: string; rows: Row[]; type: 'quotation' | 'invoice' | 'warranty'; onPick: (row: Row, type: 'quotation' | 'invoice' | 'warranty') => void }) {
  return (
    <section className="grid gap-3 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">{title} <span className="text-activeBlue">/ {zh}</span></h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">{rows.length}</span>
      </div>
      {!rows.length ? <div className="rounded-2xl bg-white p-4 text-xs font-bold text-slate-500 ring-1 ring-slate-200">No records. / 暂无记录。</div> : null}
      {rows.map((row) => (
        <button key={idOf(row, type)} type="button" onClick={() => onPick(row, type)} className="rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
          <div className="text-xs font-black text-slate-950">{idOf(row, type)}</div>
          <div className="mt-1 text-xs font-bold text-activeBlue">Status: {formatValue(row.approval_status ?? row.status)} · Total: {formatValue(row.total)} · Visible: {formatValue(row.visible_to_customer)}</div>
          <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600 md:grid-cols-2">
            <div>Job: {formatValue(row.job_id)}</div>
            <div>Created: {formatValue(row.created_at)}</div>
            {type === 'quotation' ? <div>Warranty Years: {formatValue(row.confirmed_warranty_years)}</div> : null}
            {type === 'warranty' ? <div>Warranty Years: {formatValue(row.warranty_years)}</div> : null}
            {type === 'warranty' ? <div>Ends: {formatValue(row.ends_at)}</div> : null}
          </div>
        </button>
      ))}
    </section>
  );
}

export function ServiceOperationsCustomerDocumentControlPanel() {
  const [query, setQuery] = useState('');
  const [edit, setEdit] = useState<EditValues>(defaultEdit);
  const [state, setState] = useState<State>({ loading: false, error: null, message: null, payload: null, result: null });

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const payload = await searchDocuments(query);
      setState({ loading: false, error: null, message: 'Customer documents loaded. / 已读取客户单据。', payload, result: null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  function pick(row: Row, type: 'quotation' | 'invoice' | 'warranty') {
    setEdit({
      action: type === 'quotation' ? 'update_customer_quotation' : type === 'invoice' ? 'update_customer_invoice' : 'update_customer_warranty',
      id: idOf(row, type),
      total: typeof row.total === 'number' ? String(row.total) : '',
      status: String(row.approval_status ?? row.status ?? 'draft'),
      visible_to_customer: row.visible_to_customer === true ? 'true' : 'false',
      warranty_years: String(row.confirmed_warranty_years ?? row.warranty_years ?? ''),
      warranty_terms: String(row.warranty_terms ?? row.terms_snapshot ?? ''),
      coverage: String(row.coverage ?? ''),
      starts_at: String(row.starts_at ?? ''),
      ends_at: String(row.ends_at ?? ''),
      pdf_storage_path: String(row.pdf_storage_path ?? ''),
      payment_url: String(row.payment_url ?? ''),
      public_ref: String(row.public_ref ?? '')
    });
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: null, message: null, result: null }));
    try {
      const result = await updateDocument(edit);
      const payload = query ? await searchDocuments(query) : state.payload;
      setState({ loading: false, error: null, message: 'Customer official document updated by Internal Admin. / 总后台已修改客户正式单据。', payload, result });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  const customers = Array.isArray(state.payload?.customers) ? state.payload.customers : [];
  const quotations = Array.isArray(state.payload?.quotations) ? state.payload.quotations : [];
  const invoices = Array.isArray(state.payload?.invoices) ? state.payload.invoices : [];
  const warranties = Array.isArray(state.payload?.warranties) ? state.payload.warranties : [];
  const acceptances = Array.isArray(state.payload?.acceptances) ? state.payload.acceptances : [];

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Document Control / 客户单据控制</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Search & Revise Customer Quotations, Invoices and Warranties</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Super Admin / Finance / Operations can search by customer ID, account/profile ID, phone, email or name, then revise official quotations, invoices and warranties. Customers can only view or leave feedback. / 总后台可通过客户ID、账号ID、电话、邮箱或姓名查询并修改客户正式报价、发票和保修单；客户只能查看或留言反馈。</p>
      </div>
      <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <form onSubmit={(event) => void onSearch(event)} className="flex flex-wrap gap-2 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <input className={`${inputClass} min-w-72 flex-1`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer ID / account ID / phone / email / name" />
            <button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Search / 查询</button>
          </form>
          {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
          {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
          <section className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <h3 className="text-sm font-black text-slate-950">Matched Customers / 匹配客户</h3>
            <div className="mt-3 grid gap-2">
              {!customers.length ? <div className="rounded-2xl bg-white p-4 text-xs font-bold text-slate-500 ring-1 ring-slate-200">No customer loaded. / 暂无客户。</div> : null}
              {customers.map((customer) => <div key={String(customer.customer_id)} className="rounded-2xl bg-white p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"><div className="font-black text-slate-950">{formatValue(customer.name)} · {formatValue(customer.phone)} · {formatValue(customer.email)}</div><div>Customer ID: {formatValue(customer.customer_id)}</div><div>Profile / Account ID: {formatValue(customer.profile_id)}</div></div>)}
            </div>
          </section>
          <Section title="Quotations" zh="报价" rows={quotations} type="quotation" onPick={pick} />
          <Section title="Invoices" zh="发票" rows={invoices} type="invoice" onPick={pick} />
          <Section title="Warranties" zh="保修单" rows={warranties} type="warranty" onPick={pick} />
          <section className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><h3 className="text-sm font-black text-slate-950">Accepted Quote Snapshots / 已接受报价快照</h3><pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{JSON.stringify(acceptances, null, 2)}</pre></section>
        </div>

        <form onSubmit={(event) => void onUpdate(event)} className="grid h-fit gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-950">Admin Edit Official Document / 后台修改正式单据</h3>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Action / 操作<select className={inputClass} value={edit.action} onChange={(event) => setEdit((current) => ({ ...current, action: event.target.value }))}><option value="update_customer_quotation">Update Quotation / 修改报价</option><option value="update_customer_invoice">Update Invoice / 修改发票</option><option value="update_customer_warranty">Update Warranty / 修改保修单</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Document ID / 单据ID<input className={inputClass} value={edit.id} onChange={(event) => setEdit((current) => ({ ...current, id: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Status / 状态<input className={inputClass} value={edit.status} onChange={(event) => setEdit((current) => ({ ...current, status: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Total / 总额<input className={inputClass} value={edit.total} onChange={(event) => setEdit((current) => ({ ...current, total: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Visible To Customer / 客户可见<select className={inputClass} value={edit.visible_to_customer} onChange={(event) => setEdit((current) => ({ ...current, visible_to_customer: event.target.value }))}><option value="false">false / 隐藏</option><option value="true">true / 可见</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Warranty Years / 保修年限<input className={inputClass} value={edit.warranty_years} onChange={(event) => setEdit((current) => ({ ...current, warranty_years: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Starts At / 开始日期<input className={inputClass} value={edit.starts_at} onChange={(event) => setEdit((current) => ({ ...current, starts_at: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Ends At / 结束日期<input className={inputClass} value={edit.ends_at} onChange={(event) => setEdit((current) => ({ ...current, ends_at: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">PDF Storage Path / PDF路径<input className={inputClass} value={edit.pdf_storage_path} onChange={(event) => setEdit((current) => ({ ...current, pdf_storage_path: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Payment URL / 付款链接<input className={inputClass} value={edit.payment_url} onChange={(event) => setEdit((current) => ({ ...current, payment_url: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Public Ref / 公开编号<input className={inputClass} value={edit.public_ref} onChange={(event) => setEdit((current) => ({ ...current, public_ref: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Coverage / 保修范围<textarea className={inputClass} rows={3} value={edit.coverage} onChange={(event) => setEdit((current) => ({ ...current, coverage: event.target.value }))} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Warranty Terms / 保修条款<textarea className={inputClass} rows={3} value={edit.warranty_terms} onChange={(event) => setEdit((current) => ({ ...current, warranty_terms: event.target.value }))} /></label>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950 ring-1 ring-amber-200">Only Internal Admin roles can revise official documents. Every change is written to Audit Logs. / 只有内部后台角色可以修改正式单据，所有修改写入审计日志。</div>
          <button type="submit" disabled={state.loading} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Save Official Document / 保存正式单据</button>
          {state.result ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{JSON.stringify(state.result, null, 2)}</pre> : null}
        </form>
      </div>
    </section>
  );
}
