'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;
type AlertRule = { rule_id: string; title: string; zh: string; severity: 'red' | 'amber' | 'blue'; count: number; href: string; description: string };
type State = { loading: boolean; error: string | null; summary: Row | null; alert_rules: AlertRule[]; claims: Row[] };

type BadgeTone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';

async function loadWarrantySatisfactionAlerts() {
  const response = await fetch('/api/admin/dashboard/warranty-satisfaction-alerts', { credentials: 'same-origin', cache: 'no-store' });
  const text = await response.text();
  let payload: { ok?: boolean; error?: string; summary?: Row; alert_rules?: AlertRule[]; claims?: Row[] } | null = null;
  try { payload = text ? JSON.parse(text) as { ok?: boolean; error?: string; summary?: Row; alert_rules?: AlertRule[]; claims?: Row[] } : null; } catch { payload = null; }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `Warranty satisfaction alerts API returned ${response.status}`);
  return { summary: payload?.summary ?? null, alert_rules: Array.isArray(payload?.alert_rules) ? payload.alert_rules : [], claims: Array.isArray(payload?.claims) ? payload.claims : [] };
}

function tone(severity: string): BadgeTone {
  if (severity === 'red') return 'red';
  if (severity === 'amber') return 'amber';
  return 'blue';
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
  return String(value);
}

export function DashboardWarrantySatisfactionAlerts() {
  const [state, setState] = useState<State>({ loading: true, error: null, summary: null, alert_rules: [], claims: [] });

  async function refresh() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await loadWarrantySatisfactionAlerts();
      setState({ loading: false, error: null, ...data });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <SectionCard title="Warranty Satisfaction Alerts / 保修满意度预警" subtitle="Red alerts highlight not-satisfied, reopened and P1 warranty follow-up records. / 红色预警突出不满意、重新打开和 P1 保修跟进。">
      <div id="warranty-satisfaction-alerts" className="scroll-mt-32 grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase D.5.2 / Analytics & Alerts</div>
          <button type="button" onClick={() => void refresh()} disabled={state.loading} className="rounded-2xl bg-activeBlue px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">{state.loading ? 'Loading… / 读取中' : 'Refresh / 刷新'}</button>
        </div>
        {state.error ? <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-950 ring-1 ring-red-200">{state.error}</div> : null}
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['Confirmed / 已确认', state.summary?.confirmed_total],
            ['Not Satisfied / 不满意', state.summary?.not_satisfied_total],
            ['Reopened / 重新打开', state.summary?.reopened_total],
            ['Low Rating / 低评分', state.summary?.low_rating_total]
          ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-950">{formatValue(value)}</div><div className="mt-1 text-xs font-black text-slate-500">{String(label)}</div></div>)}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.alert_rules.map((rule) => (
            <Link key={rule.rule_id} href={rule.href} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">{rule.title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{rule.zh}</div>
                </div>
                <Badge tone={tone(rule.severity)}>{rule.count}</Badge>
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-slate-500">{rule.description}</p>
              <div className="mt-2 text-xs font-black text-activeBlue">Open follow-up / 打开跟进 →</div>
            </Link>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Claim / 申请</th><th className="p-3">Satisfaction / 满意</th><th className="p-3">Rating</th><th className="p-3">Next Action / 下一步</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!state.claims.length ? <tr><td colSpan={4} className="p-4 text-xs font-bold text-slate-500">No confirmed warranty satisfaction records. / 暂无已确认满意度记录。</td></tr> : state.claims.slice(0, 8).map((claim) => (
                <tr key={String(claim.service_request_id)} className="bg-white hover:bg-blue-50/50">
                  <td className="p-3"><Link href="/service-operations#warranty-claim-satisfaction-followup" className="font-black text-slate-800 hover:text-activeBlue hover:underline">{formatValue(claim.contact_name)}</Link><div className="text-xs font-bold text-activeBlue">{formatValue(claim.service_request_id)}</div></td>
                  <td className="p-3 text-xs font-bold text-slate-600">{formatValue(claim.warranty_claim_customer_satisfaction_status)}</td>
                  <td className="p-3 text-xs font-bold text-slate-600">{formatValue(claim.warranty_claim_customer_satisfaction_rating)}</td>
                  <td className="p-3 text-xs font-semibold text-slate-600">{formatValue(claim.warranty_claim_next_action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}
