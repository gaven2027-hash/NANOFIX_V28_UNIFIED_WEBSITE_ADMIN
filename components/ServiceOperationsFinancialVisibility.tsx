'use client';

import { FormEvent, useState } from 'react';

type Kind = 'quotation' | 'invoice' | 'payment';
type State = { loading: boolean; message: string | null; error: string | null; result: Record<string, unknown> | null };
type Values = { id: string; visible_to_customer: string; customer_visibility_notes: string; pdf_storage_path: string; payment_url: string; public_ref: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const defaults: Record<Kind, Values> = {
  quotation: { id: '', visible_to_customer: 'false', customer_visibility_notes: 'Quotation reviewed and approved for customer portal visibility.', pdf_storage_path: '', payment_url: '', public_ref: '' },
  invoice: { id: '', visible_to_customer: 'false', customer_visibility_notes: 'Invoice reviewed and approved for customer portal visibility.', pdf_storage_path: '', payment_url: '', public_ref: '' },
  payment: { id: '', visible_to_customer: 'true', customer_visibility_notes: '', pdf_storage_path: '', payment_url: '', public_ref: '' }
};

function actionFor(kind: Kind) {
  if (kind === 'quotation') return 'set_quotation_customer_visibility';
  if (kind === 'invoice') return 'set_invoice_customer_visibility';
  return 'set_payment_customer_visibility';
}

function idField(kind: Kind) {
  if (kind === 'quotation') return 'quotation_id';
  if (kind === 'invoice') return 'invoice_id';
  return 'payment_id';
}

async function submitFinancialVisibility(kind: Kind, values: Values) {
  const id = values.id.trim();
  if (!uuidPattern.test(id)) return { ok: false, payload: null, error: `Valid ${idField(kind)} is required. / 必须填写有效 ${idField(kind)}。` };
  const body: Record<string, unknown> = {
    action: actionFor(kind),
    [idField(kind)]: id,
    visible_to_customer: values.visible_to_customer === 'true'
  };
  if (kind !== 'payment') {
    body.customer_visibility_notes = values.customer_visibility_notes.trim();
    body.pdf_storage_path = values.pdf_storage_path.trim();
    body.public_ref = values.public_ref.trim();
  }
  if (kind === 'invoice' || kind === 'payment') body.payment_url = values.payment_url.trim();

  const response = await fetch('/api/admin/service-operations/financial-documents', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : null; } catch { payload = null; }
  const ok = response.ok && payload?.ok !== false;
  const error = typeof payload?.error === 'string' ? payload.error : `Financial visibility API returned ${response.status}`;
  return { ok, payload, error: ok ? null : error };
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

export function ServiceOperationsFinancialVisibility() {
  const [kind, setKind] = useState<Kind>('quotation');
  const [forms, setForms] = useState<Record<Kind, Values>>(defaults);
  const [state, setState] = useState<State>({ loading: false, message: null, error: null, result: null });
  const values = forms[kind];

  function change(field: keyof Values, value: string) {
    setForms((current) => ({ ...current, [kind]: { ...current[kind], [field]: value } }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, message: null, error: null, result: null });
    const result = await submitFinancialVisibility(kind, values);
    if (!result.ok) {
      setState({ loading: false, message: null, error: result.error ?? 'Financial visibility update failed.', result: result.payload });
      return;
    }
    setState({ loading: false, message: `${kind} customer visibility updated through live API. / 已通过真实 API 更新 ${kind} 客户可见设置。`, error: null, result: result.payload });
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-50 px-6 py-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Financial Customer Visibility / 财务客户可见控制</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Quotation / Invoice PDF / Payment Link Controls</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Use this panel to make quotations, invoices and payments visible in Customer Portal. It stores PDF paths and payment links only after admin/finance review, and every change is written to Audit Logs. / 用此面板控制报价、发票和付款是否在客户门户显示；PDF 路径和付款链接必须经后台/财务审核后填写，所有更改写入审计日志。</p>
      </div>
      <div className="p-6">
        <div className="grid gap-3 md:grid-cols-3">
          {(['quotation', 'invoice', 'payment'] as Kind[]).map((item) => (
            <button key={item} type="button" onClick={() => setKind(item)} className={`rounded-2xl p-4 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${kind === item ? 'bg-blue-50 ring-activeBlue' : 'bg-slate-50 ring-slate-200'}`}>
              <div className="text-sm font-black capitalize text-slate-950">{item}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">{actionFor(item)}</div>
            </button>
          ))}
        </div>

        {state.loading || state.message || state.error ? <div className={`mt-5 rounded-3xl p-4 text-xs font-bold ring-1 ${state.error ? 'bg-red-50 text-red-950 ring-red-200' : 'bg-blue-50 text-blue-950 ring-blue-200'}`}>{state.loading ? 'Updating financial visibility… / 正在更新财务客户可见设置…' : state.error ?? state.message}</div> : null}

        <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={`${idField(kind)} / ID`} value={values.id} onChange={(value) => change('id', value)} />
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              Visible To Customer / 客户可见
              <select value={values.visible_to_customer} onChange={(event) => change('visible_to_customer', event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100">
                <option value="false">false / 隐藏</option>
                <option value="true">true / 可见</option>
              </select>
            </label>
            {kind !== 'payment' ? <Field label="PDF Storage Path / PDF 存储路径" value={values.pdf_storage_path} onChange={(value) => change('pdf_storage_path', value)} placeholder="service-operations/.../quotation.pdf" /> : null}
            {kind !== 'payment' ? <Field label="Public Ref / 公开编号" value={values.public_ref} onChange={(value) => change('public_ref', value)} placeholder="NFX-QUO-2026-0001" /> : null}
            {(kind === 'invoice' || kind === 'payment') ? <Field label="Payment URL / 付款链接" value={values.payment_url} onChange={(value) => change('payment_url', value)} placeholder="https://..." /> : null}
            {kind !== 'payment' ? (
              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2">
                Customer Visibility Notes / 客户可见备注
                <textarea value={values.customer_visibility_notes} onChange={(event) => change('customer_visibility_notes', event.target.value)} rows={3} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" />
              </label>
            ) : null}
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-950 ring-1 ring-amber-200">PDF upload control / PDF 上传控制：当前阶段登记 `pdf_storage_path`；PDF 文件本身应先通过已授权 storage upload 流程上传到 private `service-uploads` bucket，再把路径填入此处。</div>
          <button type="submit" disabled={state.loading} className="w-fit rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Save financial visibility / 保存财务客户可见</button>
        </form>

        {state.result ? <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200"><div className="bg-slate-50 px-5 py-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Last Financial Visibility Result / 最近财务可见设置返回</div></div><pre className="max-h-72 overflow-auto whitespace-pre-wrap p-5 text-xs font-semibold text-slate-700">{JSON.stringify(state.result, null, 2)}</pre></div> : null}
      </div>
    </section>
  );
}
