'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;
type Payload = {
  ok?: boolean;
  error?: string;
  service_request?: Row;
  related_warranty?: Row | null;
  routed_jobs?: Row[];
  quotations?: Row[];
  quotation_versions?: Row[];
  invoices?: Row[];
  payments?: Row[];
  warranty_pdfs?: Row[];
};

type State = { loading: boolean; error: string | null; payload: Payload | null };

async function loadWarrantyClaimDetail(serviceRequestId: string) {
  const response = await fetch(`/api/customer-portal/warranty-claims/${serviceRequestId}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Payload | null = null;
  try { payload = text ? JSON.parse(text) as Payload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim detail API returned ${response.status}`);
  return payload ?? { ok: true };
}

function list(payload: Payload | null, key: keyof Payload) {
  const value = payload?.[key];
  return Array.isArray(value) ? value : [];
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    }
    return value;
  }
  return JSON.stringify(value);
}

function titleOf(row: Row) {
  const candidate = row.public_ref || row.invoice_no || row.file_name || row.quotation_id || row.invoice_id || row.warranty_id || row.warranty_pdf_id || row.job_id || row.payment_id;
  return typeof candidate === 'string' ? candidate : 'Record';
}

function PdfButton({ url }: { url: string }) {
  return <a href={url} target="_blank" rel="noreferrer" className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">PDF</a>;
}

function KeyValueGrid({ row, fields }: { row: Row; fields: string[] }) {
  return (
    <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
      {fields.map((field) => (
        <div key={field}>
          <dt className="font-black uppercase tracking-[0.08em] text-slate-400">{field}</dt>
          <dd className="mt-1 font-semibold text-slate-700">{formatValue(row[field])}</dd>
        </div>
      ))}
    </dl>
  );
}

function RecordCard({ row, label, fields }: { row: Row; label: string; fields: string[] }) {
  const pdfUrl = typeof row.pdf_download_url === 'string' ? row.pdf_download_url : '';
  const paymentUrl = typeof row.payment_url === 'string' ? row.payment_url : '';
  return (
    <article className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-950">{titleOf(row)}</div>
          <div className="mt-1 text-xs font-bold text-activeBlue">{label}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {pdfUrl ? <PdfButton url={pdfUrl} /> : null}
          {paymentUrl ? <a href={paymentUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700">Pay Now / 立即付款</a> : null}
        </div>
      </div>
      <KeyValueGrid row={row} fields={fields} />
    </article>
  );
}

function Section({ id, title, zh, children, count }: { id: string; title: string; zh: string; children: React.ReactNode; count?: number }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <div className="text-xs font-bold text-activeBlue">{zh}</div>
        </div>
        {typeof count === 'number' ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-activeBlue ring-1 ring-blue-100">{count}</span> : null}
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

export function CustomerPortalWarrantyClaimDetail({ serviceRequestId }: { serviceRequestId: string }) {
  const [state, setState] = useState<State>({ loading: true, error: null, payload: null });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await loadWarrantyClaimDetail(serviceRequestId);
      setState({ loading: false, error: null, payload });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), payload: null });
    }
  }

  useEffect(() => { void refresh(); }, [serviceRequestId]);

  const claim = state.payload?.service_request ?? null;
  const relatedWarranty = state.payload?.related_warranty ?? null;
  const jobs = list(state.payload, 'routed_jobs');
  const quotations = list(state.payload, 'quotations');
  const versions = list(state.payload, 'quotation_versions');
  const invoices = list(state.payload, 'invoices');
  const payments = list(state.payload, 'payments');
  const warrantyPdfs = list(state.payload, 'warranty_pdfs');

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Warranty Claim Detail / 保修维修申请详情</div>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Warranty Claim Read-Only View</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">View your warranty claim progress, linked warranty, job, quotation, invoice and warranty PDF records. This page is read-only. / 查看保修维修申请进度、关联保修、工单、报价、发票和保修PDF记录。本页面只读。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/customer-portal/records#warranty-claims" className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Back / 返回</Link>
            <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
          </div>
        </div>
        {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        {!state.error && state.loading ? <div className="mt-5 rounded-3xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading warranty claim detail… / 正在读取保修申请详情…</div> : null}
      </section>

      {claim ? (
        <Section id="claim-summary" title="Claim Summary" zh="申请概要">
          <RecordCard row={claim} label="SERVICE REQUEST / 保修申请" fields={['status','issue_type','leak_location','issue_description','related_warranty_id','warranty_claim_decision','warranty_claim_next_action','warranty_claim_routing_status','warranty_claim_reviewed_at','warranty_claim_routed_at']} />
        </Section>
      ) : null}

      {relatedWarranty ? (
        <Section id="linked-warranty" title="Linked Warranty" zh="关联原保修单">
          <RecordCard row={relatedWarranty} label="WARRANTY / 保修单" fields={['status','coverage','starts_at','ends_at','warranty_years','accepted_warranty_years','auto_generated','generation_source','created_at']} />
        </Section>
      ) : null}

      <Section id="routed-jobs" title="Routed Jobs" zh="关联工单" count={jobs.length}>
        {!jobs.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No routed job yet. / 暂无关联工单。</div> : jobs.map((row, index) => <RecordCard key={String(row.job_id ?? index)} row={row} label="JOB / 工单" fields={['status','scheduled_at','notes','created_at','updated_at']} />)}
      </Section>

      <Section id="quotations" title="Quotations" zh="报价" count={quotations.length}>
        {!quotations.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer-visible quotation yet. / 暂无客户可见报价。</div> : quotations.map((row, index) => <RecordCard key={String(row.quotation_id ?? index)} row={row} label="QUOTATION / 报价" fields={['approval_status','current_version','total','customer_visibility_notes','created_at']} />)}
      </Section>

      {versions.length ? (
        <Section id="quotation-versions" title="Quotation Versions" zh="报价版本" count={versions.length}>
          {versions.map((row, index) => <RecordCard key={String(row.version_id ?? index)} row={row} label="QUOTE VERSION / 报价版本" fields={['version','total','warranty_years','warranty_terms','created_at']} />)}
        </Section>
      ) : null}

      <Section id="invoices" title="Invoices" zh="发票" count={invoices.length}>
        {!invoices.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer-visible invoice yet. / 暂无客户可见发票。</div> : invoices.map((row, index) => <RecordCard key={String(row.invoice_id ?? index)} row={row} label="INVOICE / 发票" fields={['invoice_no','status','total','customer_visibility_notes','created_at']} />)}
      </Section>

      <Section id="warranty-pdfs" title="Warranty PDFs" zh="保修PDF" count={warrantyPdfs.length}>
        {!warrantyPdfs.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No customer-visible warranty PDF yet. / 暂无客户可见保修PDF。</div> : warrantyPdfs.map((row, index) => <RecordCard key={String(row.warranty_pdf_id ?? index)} row={row} label="WARRANTY PDF / 保修PDF" fields={['warranty_version','generation_status','file_name','file_size_bytes','generated_at','created_at']} />)}
      </Section>

      <Section id="payments" title="Payments" zh="付款" count={payments.length}>
        {!payments.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No payment record yet. / 暂无付款记录。</div> : payments.map((row, index) => <RecordCard key={String(row.payment_id ?? index)} row={row} label="PAYMENT / 付款" fields={['amount','status','fee','reconciled_at','created_at']} />)}
      </Section>
    </div>
  );
}
