'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type PortalPayload = { ok?: boolean; error?: string; data_loop?: string; [key: string]: unknown; };

function count(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function usePortalData(endpoint: string) {
  const [data, setData] = useState<PortalPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint, { credentials: 'include' })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((error) => {
        if (!cancelled) setData({ ok: false, error: error instanceof Error ? error.message : 'Unable to load portal data' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [endpoint]);

  return { data, loading };
}

export function CustomerPortalDataLoop() {
  const { data, loading } = usePortalData('/api/portal/customer');

  return (
    <SectionCard title="Live Customer Data Loop / 客户实时数据闭环" subtitle="Session cookie → profile_id → customer records → repair, quote, invoice, payment and warranty records.">
      {loading ? <p className="text-sm font-semibold text-slate-500">Loading customer records...</p> : data?.ok === false ? (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">{data.error}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ['Customers', count(data?.customers)],
            ['Repair Requests', count(data?.service_requests)],
            ['Quotations', count(data?.quotations)],
            ['Invoices', count(data?.invoices)],
            ['Payments', count(data?.payments)],
            ['Warranties', count(data?.warranties)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
              <div className="mt-2 text-3xl font-black text-activeBlue">{String(value)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4"><Badge tone="green">RLS-filtered / 权限过滤</Badge></div>
    </SectionCard>
  );
}

export function EngineerPortalDataLoop() {
  const { data, loading } = usePortalData('/api/portal/engineer');

  return (
    <SectionCard title="Live Engineer Data Loop / 工程师实时数据闭环" subtitle="Session cookie → profile_id → assigned jobs → checklist, photos and signature records.">
      {loading ? <p className="text-sm font-semibold text-slate-500">Loading assigned jobs...</p> : data?.ok === false ? (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">{data.error}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {[
            ['Jobs', count(data?.jobs)],
            ['Assignments', count(data?.assignments)],
            ['Checklists', count(data?.checklists)],
            ['Photos', count(data?.photos)],
            ['Signatures', count(data?.signatures)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
              <div className="mt-2 text-3xl font-black text-activeBlue">{String(value)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4"><Badge tone="cyan">Engineer-only / 工程师权限</Badge></div>
    </SectionCard>
  );
}
