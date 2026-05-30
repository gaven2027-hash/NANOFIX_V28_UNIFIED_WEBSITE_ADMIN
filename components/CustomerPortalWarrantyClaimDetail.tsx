'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { CustomerPortalWarrantyClaimAttachmentsPanel } from '@/components/CustomerPortalWarrantyClaimAttachmentsPanel';

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
  customer_timeline?: Row[];
};

type State = { loading: boolean; error: string | null; payload: Payload | null };
type MessageState = { loading: boolean; submitting: boolean; error: string | null; message: string | null; messages: Row[] };

async function loadWarrantyClaimDetail(serviceRequestId: string) {
  const response = await fetch(`/api/customer-portal/warranty-claims/${serviceRequestId}`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Payload | null = null;
  try { payload = text ? JSON.parse(text) as Payload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim detail API returned ${response.status}`);
  return payload ?? { ok: true };
}

async function loadWarrantyClaimMessages(serviceRequestId: string) {
  const response = await fetch(`/api/customer-portal/warranty-claims/${serviceRequestId}/messages`, { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; messages?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; messages?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty claim messages API returned ${response.status}`);
  return Array.isArray(payload?.messages) ? payload.messages : [];
}

async function submitWarrantyClaimMessage(serviceRequestId: string, messageBody: string) {
  const response = await fetch(`/api/customer-portal/warranty-claims/${serviceRequestId}/messages`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message_body: messageBody })
  });
  const text = await response.text();
  let payload: Row | null = null;
  try { payload = text ? JSON.parse(text) as Row : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(typeof payload?.error === 'string' ? payload.error : `Warranty claim message submit API returned ${response.status}`);
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

function TimelinePanel({ items }: { items: Row[] }) {
  return (
    <Section id="customer-timeline" title="Customer Timeline" zh="客户可读进度时间线" count={items.length}>
      {!items.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No timeline items yet. / 暂无时间线记录。</div> : null}
      <div className="grid gap-3">
        {items.map((item, index) => (
          <article key={`${formatValue(item.event_key)}-${index}`} className="relative rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-950">{formatValue(item.title)}</div>
                <div className="mt-1 text-xs font-bold text-activeBlue">{formatValue(item.zh)}</div>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-activeBlue ring-1 ring-blue-100">{formatValue(item.status)}</span>
            </div>
            <div className="mt-3 text-xs font-semibold leading-5 text-slate-600">{formatValue(item.description)}</div>
            <div className="mt-3 grid gap-1 text-[11px] font-bold text-slate-500 md:grid-cols-3">
              <div>Time / 时间: {formatValue(item.timestamp)}</div>
              <div>Type / 类型: {formatValue(item.object_type)}</div>
              <div>Ref / 编号: {formatValue(item.object_id)}</div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

function MessageThreadPanel({ serviceRequestId }: { serviceRequestId: string }) {
  const [state, setState] = useState<MessageState>({ loading: true, submitting: false, error: null, message: null, messages: [] });
  const [draft, setDraft] = useState('');

  async function refreshMessages() {
    setState((current) => ({ ...current, loading: true, error: null, message: null }));
    try {
      const messages = await loadWarrantyClaimMessages(serviceRequestId);
      setState((current) => ({ ...current, loading: false, error: null, messages }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const messageBody = draft.trim();
    if (!messageBody) return;
    setState((current) => ({ ...current, submitting: true, error: null, message: null }));
    try {
      await submitWarrantyClaimMessage(serviceRequestId, messageBody);
      setDraft('');
      const messages = await loadWarrantyClaimMessages(serviceRequestId);
      setState({ loading: false, submitting: false, error: null, message: 'Message submitted to NANOFIX. / 留言已提交给 NANOFIX。', messages });
    } catch (error) {
      setState((current) => ({ ...current, submitting: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  useEffect(() => { void refreshMessages(); }, [serviceRequestId]);

  return (
    <Section id="message-thread" title="Message Thread" zh="保修申请留言线程" count={state.messages.length}>
      {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
      {state.message ? <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-200">{state.message}</div> : null}
      {state.loading ? <div className="rounded-2xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading messages… / 正在读取留言…</div> : null}
      <div className="grid gap-3">
        {!state.messages.length && !state.loading ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-200">No messages yet. / 暂无留言。</div> : null}
        {state.messages.map((message) => (
          <article key={String(message.message_id)} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-sm font-black text-slate-950">{formatValue(message.sender_type)} · {formatValue(message.sender_role)}</div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-activeBlue ring-1 ring-blue-100">{formatValue(message.created_at)}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{formatValue(message.message_body)}</p>
          </article>
        ))}
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 rounded-3xl bg-white p-4 ring-1 ring-slate-200">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-activeBlue">Add Message / 添加留言</div>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">You can add notes or photos description for this warranty claim. This does not edit any quotation, invoice, warranty or payment record. / 您可以补充说明保修申请情况；这不会修改任何报价、发票、保修单或付款记录。</p>
        </div>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={5} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-activeBlue focus:ring-2 ring-blue-100" placeholder="Add your message here / 在这里填写留言" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-500">{draft.length}/2000</span>
          <button type="submit" disabled={state.submitting || !draft.trim()} className="rounded-2xl bg-activeBlue px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.submitting ? 'Submitting… / 提交中…' : 'Submit Message / 提交留言'}</button>
        </div>
      </form>
    </Section>
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
  const timeline = list(state.payload, 'customer_timeline');
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

      <TimelinePanel items={timeline} />
      <MessageThreadPanel serviceRequestId={serviceRequestId} />
      <CustomerPortalWarrantyClaimAttachmentsPanel serviceRequestId={serviceRequestId} />

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
