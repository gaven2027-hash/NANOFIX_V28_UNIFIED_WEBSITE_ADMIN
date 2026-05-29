'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Payload = {
  ok?: boolean;
  error?: string;
  service_requests?: unknown[];
  jobs?: unknown[];
  invoices?: unknown[];
  payments?: unknown[];
  warranties?: unknown[];
};

type State = { loading: boolean; error: string | null; payload: Payload | null };

const quickLinks = [
  { href: '/customer-portal/records', title: 'My Records', zh: '我的记录', text: 'Repair requests, jobs, invoices, payments and warranties.' },
  { href: '/customer-portal/uploads', title: 'Approved Uploads', zh: '已审核文件', text: 'Customer-visible approved photos, videos and PDFs.' },
  { href: '/customer-portal/records#warranties', title: 'Warranty', zh: '保修', text: 'View warranty coverage and dates.' },
  { href: '/customer-portal/financial', title: 'Finance', zh: '财务', text: 'Quotations, invoice PDFs, payment links and payment status.' }
];

async function loadRecords() {
  const response = await fetch('/api/customer-portal/records?limit=20', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: Payload | null = null;
  try { payload = text ? JSON.parse(text) as Payload : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Customer records API returned ${response.status}`);
  return payload ?? { ok: true };
}

function count(payload: Payload | null, key: keyof Payload) {
  const value = payload?.[key];
  return Array.isArray(value) ? value.length : 0;
}

export function CustomerPortalDashboard() {
  const [state, setState] = useState<State>({ loading: true, error: null, payload: null });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await loadRecords();
      setState({ loading: false, error: null, payload });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : String(error), payload: null });
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer Portal Dashboard / 客户门户首页</div>
            <h1 className="mt-2 text-3xl font-black text-slate-950">My NANOFIX Service Centre</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">A separated customer-only portal for your own repair records, invoices, payments, warranties and approved uploads. / 独立客户门户，只显示您自己的报修、发票、付款、保修和已审核文件。</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
        </div>
        {state.error ? <div className="mt-5 rounded-3xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ['Repair Requests', '报修', count(state.payload, 'service_requests')],
          ['Jobs', '工单', count(state.payload, 'jobs')],
          ['Invoices', '发票', count(state.payload, 'invoices')],
          ['Payments', '付款', count(state.payload, 'payments')],
          ['Warranties', '保修', count(state.payload, 'warranties')]
        ].map(([label, zh, value]) => (
          <div key={String(label)} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="text-3xl font-black text-slate-950">{String(value)}</div>
            <div className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-activeBlue">{String(label)}</div>
            <div className="text-xs font-bold text-slate-500">{String(zh)}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
            <div className="text-lg font-black text-slate-950">{link.title}</div>
            <div className="text-xs font-bold text-activeBlue">{link.zh}</div>
            <p className="mt-2 text-sm font-semibold text-slate-600">{link.text}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
