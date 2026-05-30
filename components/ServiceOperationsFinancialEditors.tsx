'use client';

import { FormEvent, useState } from 'react';

type EditorKind = 'quotation' | 'invoice' | 'payment' | 'warranty';
type ApiPayload = Record<string, unknown>;
type EditorState = { loading: boolean; message: string | null; error: string | null; result: ApiPayload | null };
type Values = Record<string, string>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const tabs: Array<{ key: EditorKind; title: string; zh: string; action: string; note: string }> = [
  { key: 'quotation', title: 'Quotation Line Items', zh: '报价明细', action: 'save_quotation_version', note: 'Create a new quotation version, warranty years and update quotation total.' },
  { key: 'invoice', title: 'Invoice Items', zh: '发票明细', action: 'save_invoice_items', note: 'Replace invoice items and update invoice total.' },
  { key: 'payment', title: 'Payment Reconciliation', zh: '付款对账', action: 'reconcile_payment', note: 'Update payment amount/status and create transaction log.' },
  { key: 'warranty', title: 'Warranty Issue', zh: '保修签发', action: 'issue_warranty', note: 'Create or update warranty coverage for a job.' }
];

const defaults: Record<EditorKind, Values> = {
  quotation: { quotation_id: '', warranty_years: '1', warranty_terms: 'NANOFIX warranty coverage is based on the confirmed quotation scope and completed repair works.', description_1: 'Waterproofing repair works', qty_1: '1', unit_price_1: '0', description_2: 'Materials and preparation', qty_2: '1', unit_price_2: '0' },
  invoice: { invoice_id: '', status: 'draft', description_1: 'Waterproofing repair works', qty_1: '1', unit_price_1: '0', description_2: 'Materials and preparation', qty_2: '1', unit_price_2: '0' },
  payment: { payment_id: '', amount: '0', fee: '0', provider: 'manual', external_id: '', status: 'reconciled' },
  warranty: { warranty_id: '', job_id: '', customer_id: '', source_quotation_id: '', source_acceptance_id: '', source_invoice_id: '', warranty_years: '1', status: 'active', coverage: 'NANOFIX standard workmanship warranty.', terms_snapshot: 'NANOFIX warranty coverage is based on the completed repair scope.', starts_at: '', ends_at: '' }
};

function text(values: Values, key: string) { return values[key]?.trim() ?? ''; }
function numberValue(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : NaN; }
function lineItems(values: Values) {
  return [1, 2].map((index) => ({
    description: text(values, `description_${index}`),
    qty: numberValue(text(values, `qty_${index}`)),
    unit_price: numberValue(text(values, `unit_price_${index}`))
  })).filter((item) => item.description || Number.isFinite(item.qty) || Number.isFinite(item.unit_price));
}

function validate(kind: EditorKind, values: Values) {
  const errors: string[] = [];
  if (kind === 'quotation') {
    if (!uuidPattern.test(text(values, 'quotation_id'))) errors.push('Valid quotation_id is required. / 必须填写有效 quotation_id。');
    const years = numberValue(text(values, 'warranty_years'));
    if (!Number.isFinite(years) || years < 0 || years > 30) errors.push('Warranty years must be between 0 and 30. / 保修年限必须在 0 到 30 之间。');
    for (const [index, item] of lineItems(values).entries()) {
      if (!item.description) errors.push(`Line ${index + 1} description is required. / 第 ${index + 1} 行描述必填。`);
      if (!Number.isFinite(item.qty) || item.qty <= 0) errors.push(`Line ${index + 1} qty must be greater than 0. / 第 ${index + 1} 行数量必须大于 0。`);
      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) errors.push(`Line ${index + 1} price must be 0 or greater. / 第 ${index + 1} 行单价不能小于 0。`);
    }
  }
  if (kind === 'invoice') {
    if (!uuidPattern.test(text(values, 'invoice_id'))) errors.push('Valid invoice_id is required. / 必须填写有效 invoice_id。');
    for (const [index, item] of lineItems(values).entries()) {
      if (!item.description) errors.push(`Line ${index + 1} description is required. / 第 ${index + 1} 行描述必填。`);
      if (!Number.isFinite(item.qty) || item.qty <= 0) errors.push(`Line ${index + 1} qty must be greater than 0. / 第 ${index + 1} 行数量必须大于 0。`);
      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) errors.push(`Line ${index + 1} price must be 0 or greater. / 第 ${index + 1} 行单价不能小于 0。`);
    }
  }
  if (kind === 'payment') {
    if (!uuidPattern.test(text(values, 'payment_id'))) errors.push('Valid payment_id is required. / 必须填写有效 payment_id。');
    if (!Number.isFinite(numberValue(text(values, 'amount'))) || numberValue(text(values, 'amount')) < 0) errors.push('Payment amount must be 0 or greater. / 付款金额不能小于 0。');
    if (!Number.isFinite(numberValue(text(values, 'fee'))) || numberValue(text(values, 'fee')) < 0) errors.push('Payment fee must be 0 or greater. / 手续费不能小于 0。');
  }
  if (kind === 'warranty') {
    if (text(values, 'warranty_id') && !uuidPattern.test(text(values, 'warranty_id'))) errors.push('warranty_id must be UUID when provided. / warranty_id 如填写必须是 UUID。');
    if (!uuidPattern.test(text(values, 'job_id'))) errors.push('Valid job_id is required. / 必须填写有效 job_id。');
    const years = numberValue(text(values, 'warranty_years'));
    if (!Number.isFinite(years) || years < 0 || years > 30) errors.push('Warranty years must be between 0 and 30. / 保修年限必须在 0 到 30 之间。');
    if (!text(values, 'coverage')) errors.push('Coverage is required. / 保修范围必填。');
  }
  return { ok: errors.length === 0, errors };
}

function payload(kind: EditorKind, values: Values) {
  const tab = tabs.find((item) => item.key === kind) ?? tabs[0];
  if (kind === 'quotation') return { action: tab.action, quotation_id: text(values, 'quotation_id'), warranty_years: numberValue(text(values, 'warranty_years')), warranty_terms: text(values, 'warranty_terms'), line_items: lineItems(values) };
  if (kind === 'invoice') return { action: tab.action, invoice_id: text(values, 'invoice_id'), status: text(values, 'status'), line_items: lineItems(values) };
  if (kind === 'payment') return { action: tab.action, payment_id: text(values, 'payment_id'), amount: numberValue(text(values, 'amount')), fee: numberValue(text(values, 'fee')), provider: text(values, 'provider'), external_id: text(values, 'external_id'), status: text(values, 'status') };
  return { action: tab.action, warranty_id: text(values, 'warranty_id'), job_id: text(values, 'job_id'), customer_id: text(values, 'customer_id'), source_quotation_id: text(values, 'source_quotation_id'), source_acceptance_id: text(values, 'source_acceptance_id'), source_invoice_id: text(values, 'source_invoice_id'), warranty_years: numberValue(text(values, 'warranty_years')), coverage: text(values, 'coverage'), terms_snapshot: text(values, 'terms_snapshot'), starts_at: text(values, 'starts_at'), ends_at: text(values, 'ends_at'), status: text(values, 'status') };
}

async function submitEditor(kind: EditorKind, values: Values) {
  const checked = validate(kind, values);
  if (!checked.ok) return { ok: false, result: null, error: checked.errors.join('\n') };
  try {
    const response = await fetch('/api/admin/service-operations/financial-documents', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload(kind, values))
    });
    const bodyText = await response.text();
    let result: ApiPayload | null = null;
    try { result = bodyText ? JSON.parse(bodyText) as ApiPayload : null; } catch { result = null; }
    const error = typeof result?.error === 'string' ? result.error : `Financial document API returned ${response.status}`;
    return { ok: response.ok && result?.ok !== false, result, error: response.ok && result?.ok !== false ? null : error };
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

export function ServiceOperationsFinancialEditors() {
  const [active, setActive] = useState<EditorKind>('quotation');
  const [forms, setForms] = useState<Record<EditorKind, Values>>(defaults);
  const [state, setState] = useState<EditorState>({ loading: false, message: null, error: null, result: null });
  const values = forms[active];
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];
  const usesLineItems = active === 'quotation' || active === 'invoice';

  function change(name: string, value: string) {
    setForms((current) => ({ ...current, [active]: { ...current[active], [name]: value } }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, message: null, error: null, result: null });
    const response = await submitEditor(active, values);
    if (!response.ok) {
      setState({ loading: false, message: null, error: response.error ?? 'Financial editor submit failed.', result: null });
      return;
    }
    setState({ loading: false, message: `${activeTab.title} saved through live API. / 已通过真实 API 保存。`, error: null, result: response.result });
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Financial & Warranty Editors / 财务与保修编辑器</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Quotation / Invoice / Payment / Warranty</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">These editors submit to `/api/admin/service-operations/financial-documents`, update real tables and write Audit Logs. Warranty years confirmed here are locked when the customer accepts a quotation. / 这些编辑器提交到服务端 API，更新真实表并写入审计日志；这里确认的保修年限会在客户接受报价时锁定。</p>
      </div>
      <div className="p-6">
        <div className="grid gap-3 md:grid-cols-4">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActive(tab.key)} className={`rounded-2xl p-4 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${active === tab.key ? 'bg-blue-50 ring-activeBlue' : 'bg-slate-50 ring-slate-200'}`}>
              <div className="text-sm font-black text-slate-950">{tab.title}</div>
              <div className="text-xs font-bold text-activeBlue">{tab.zh}</div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{tab.note}</p>
            </button>
          ))}
        </div>

        {state.loading || state.message || state.error ? <div className={`mt-5 rounded-3xl p-4 text-xs font-bold ring-1 ${state.error ? 'bg-red-50 text-red-950 ring-red-200' : 'bg-blue-50 text-blue-950 ring-blue-200'}`}>{state.loading ? 'Submitting financial editor… / 正在提交财务编辑器…' : state.error ?? state.message}</div> : null}

        <form onSubmit={(event) => void onSubmit(event)} className="mt-5 grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            {active === 'quotation' ? <>
              <Input label="Quotation ID / 报价 ID" name="quotation_id" value={values.quotation_id} onChange={change} />
              <Input label="Warranty Years / 保修年限" name="warranty_years" value={values.warranty_years} onChange={change} placeholder="1 / 2 / 5 / 10" />
              <Textarea label="Warranty Terms / 保修条款" name="warranty_terms" value={values.warranty_terms} onChange={change} />
            </> : null}
            {active === 'invoice' ? <><Input label="Invoice ID / 发票 ID" name="invoice_id" value={values.invoice_id} onChange={change} /><Input label="Invoice Status / 发票状态" name="status" value={values.status} onChange={change} /></> : null}
            {usesLineItems ? <>
              <Input label="Line 1 Description / 明细 1 描述" name="description_1" value={values.description_1} onChange={change} />
              <Input label="Line 1 Qty / 明细 1 数量" name="qty_1" value={values.qty_1} onChange={change} />
              <Input label="Line 1 Unit Price / 明细 1 单价" name="unit_price_1" value={values.unit_price_1} onChange={change} />
              <Input label="Line 2 Description / 明细 2 描述" name="description_2" value={values.description_2} onChange={change} />
              <Input label="Line 2 Qty / 明细 2 数量" name="qty_2" value={values.qty_2} onChange={change} />
              <Input label="Line 2 Unit Price / 明细 2 单价" name="unit_price_2" value={values.unit_price_2} onChange={change} />
            </> : null}
            {active === 'payment' ? <>
              <Input label="Payment ID / 付款 ID" name="payment_id" value={values.payment_id} onChange={change} />
              <Input label="Amount / 金额" name="amount" value={values.amount} onChange={change} />
              <Input label="Fee / 手续费" name="fee" value={values.fee} onChange={change} />
              <Input label="Provider / 渠道" name="provider" value={values.provider} onChange={change} />
              <Input label="External ID / 外部流水号" name="external_id" value={values.external_id} onChange={change} />
              <Input label="Status / 状态" name="status" value={values.status} onChange={change} />
            </> : null}
            {active === 'warranty' ? <>
              <Input label="Warranty ID for update / 更新用保修 ID" name="warranty_id" value={values.warranty_id} onChange={change} placeholder="Leave blank to create / 留空新增" />
              <Input label="Job ID / 工单 ID" name="job_id" value={values.job_id} onChange={change} />
              <Input label="Customer ID / 客户 ID" name="customer_id" value={values.customer_id} onChange={change} />
              <Input label="Source Quotation ID / 来源报价 ID" name="source_quotation_id" value={values.source_quotation_id} onChange={change} />
              <Input label="Source Acceptance ID / 来源接受 ID" name="source_acceptance_id" value={values.source_acceptance_id} onChange={change} />
              <Input label="Source Invoice ID / 来源发票 ID" name="source_invoice_id" value={values.source_invoice_id} onChange={change} />
              <Input label="Warranty Years / 保修年限" name="warranty_years" value={values.warranty_years} onChange={change} />
              <Input label="Status / 状态" name="status" value={values.status} onChange={change} />
              <Input label="Starts At / 开始日期" name="starts_at" value={values.starts_at} onChange={change} placeholder="2026-05-29" />
              <Input label="Ends At / 结束日期" name="ends_at" value={values.ends_at} onChange={change} placeholder="2027-05-29" />
              <Textarea label="Coverage / 保修范围" name="coverage" value={values.coverage} onChange={change} />
              <Textarea label="Terms Snapshot / 条款快照" name="terms_snapshot" value={values.terms_snapshot} onChange={change} />
            </> : null}
          </div>
          <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Save via live API / 通过真实 API 保存</button>
        </form>

        {state.result ? <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200"><div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Last Financial API Result / 最近财务 API 返回</div></div><pre className="max-h-80 overflow-auto whitespace-pre-wrap p-5 text-xs font-semibold text-slate-700">{JSON.stringify(state.result, null, 2)}</pre></div> : null}
      </div>
    </section>
  );
}
