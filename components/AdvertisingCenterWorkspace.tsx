'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import {
  adApprovalGateRules,
  adCenterSections,
  adPlatforms,
  adRoleMatrix,
  adServiceCategories,
  adWorkflow,
  calculateCpl,
  calculateRoas,
  calculateRoi,
  sampleAdAccounts,
  sampleAdCampaignRows,
  sampleAdSuggestions,
  superAdminAdvertisingCapabilities
} from '@/lib/nanofix/advertising-center';

type Row = Record<string, unknown>;

type ApiState = {
  campaigns: Row[];
  accounts: Row[];
  suggestions: Row[];
  approvals: Row[];
  budgetRequests: Row[];
  syncLogs: Row[];
  takeovers: Row[];
  role: string;
  fullAccess: boolean;
  fallback?: string | null;
};

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

function num(value: unknown) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function money(value: unknown) { return `$${num(value).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`; }
function pct(value: number) { return `${(value * 100).toFixed(1)}%`; }
function tone(value: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' { const text = String(value || '').toLowerCase(); if (text.includes('approved') || text.includes('active') || text.includes('normal')) return 'green'; if (text.includes('review') || text.includes('draft') || text.includes('submitted') || text.includes('pending')) return 'amber'; if (text.includes('high') || text.includes('critical') || text.includes('paused') || text.includes('rejected')) return 'red'; if (text.includes('google') || text.includes('meta') || text.includes('tiktok') || text.includes('manual')) return 'cyan'; return 'blue'; }
function text(value: unknown, fallback = '—') { return value === null || value === undefined || value === '' ? fallback : String(value); }
function campaignName(row: Row) { return text(row.campaign_name || row.campaign, 'Untitled Campaign'); }
function campaignSpend(row: Row) { return num(row.spend_amount ?? row.spend); }
function campaignRevenue(row: Row) { return num(row.revenue_amount ?? row.revenue); }
function campaignGross(row: Row) { return num(row.gross_profit_amount ?? row.revenue_amount ?? row.revenue); }
function campaignLeads(row: Row) { return num(row.leads_count ?? row.leads); }
function campaignBookings(row: Row) { return num(row.bookings_count ?? row.bookings); }

export function AdvertisingCenterWorkspace() {
  const [state, setState] = useState<ApiState>({
    campaigns: sampleAdCampaignRows as unknown as Row[],
    accounts: sampleAdAccounts as unknown as Row[],
    suggestions: sampleAdSuggestions as unknown as Row[],
    approvals: [],
    budgetRequests: [],
    syncLogs: [],
    takeovers: [],
    role: 'unknown',
    fullAccess: false,
    fallback: 'initial_sample'
  });
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState({
    platform: 'google_ads',
    service_category: adServiceCategories[0],
    campaign_name: 'HDB Ceiling Leak Search Campaign',
    daily_budget: '30',
    monthly_budget: '900',
    landing_page_url: 'https://www.nanofixsg.com/leak-detection',
    headline: 'No-Hacking Leak Detection in Singapore',
    primary_text: 'Send photos on WhatsApp. NANOFIX checks leakage source before hacking tiles.',
    utm_campaign: 'hdb_ceiling_leak_search'
  });

  async function loadData() {
    const response = await fetch('/api/admin/advertising-center', { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) return setMessage(json.error || 'Advertising center data unavailable. / 广告中心数据暂不可用。');
    setState({
      campaigns: json.campaigns || sampleAdCampaignRows,
      accounts: json.accounts || sampleAdAccounts,
      suggestions: json.suggestions || sampleAdSuggestions,
      approvals: json.approvals || [],
      budgetRequests: json.budgetRequests || [],
      syncLogs: json.syncLogs || [],
      takeovers: json.takeovers || [],
      role: json.context?.role || 'unknown',
      fullAccess: Boolean(json.super_admin_full_access),
      fallback: json.fallback
    });
  }

  useEffect(() => { void loadData(); }, []);

  const metrics = useMemo(() => {
    const spend = state.campaigns.reduce((s, r) => s + campaignSpend(r), 0);
    const leads = state.campaigns.reduce((s, r) => s + campaignLeads(r), 0);
    const bookings = state.campaigns.reduce((s, r) => s + campaignBookings(r), 0);
    const revenue = state.campaigns.reduce((s, r) => s + campaignRevenue(r), 0);
    const gross = state.campaigns.reduce((s, r) => s + campaignGross(r), 0);
    return { spend, leads, bookings, revenue, gross, cpl: calculateCpl(spend, leads), roas: calculateRoas(revenue, spend), roi: calculateRoi(revenue, spend, gross) };
  }, [state.campaigns]);

  function generatedUrl() {
    try {
      const url = new URL(draft.landing_page_url || 'https://www.nanofixsg.com');
      url.searchParams.set('utm_source', draft.platform);
      url.searchParams.set('utm_medium', draft.platform === 'manual_import' ? 'manual' : 'paid');
      url.searchParams.set('utm_campaign', draft.utm_campaign || draft.campaign_name);
      url.searchParams.set('utm_content', draft.headline.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60));
      return url.toString();
    } catch { return draft.landing_page_url; }
  }

  async function createDraft() {
    setMessage('');
    const response = await fetch('/api/admin/advertising-center', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_campaign', ...draft, landing_page_url: generatedUrl() }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) return setMessage(json.error || 'Create draft failed. / 创建草稿失败。');
    setMessage('Campaign draft created. / 广告活动草稿已创建。');
    await loadData();
  }

  async function updateCampaign(action: string, campaign: Row) {
    setMessage('');
    if (String(campaign.campaign_id || '').startsWith('sample-')) return setMessage('Sample campaign cannot be changed until Supabase tables are applied. / 示例广告需先应用 Supabase 表后才能修改。');
    const response = await fetch('/api/admin/advertising-center', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, campaign_id: campaign.campaign_id, takeover_reason: 'Super Admin manual takeover from Advertising Center' }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) return setMessage(json.error || 'Update failed. / 更新失败。');
    setMessage(action === 'super_admin_takeover' ? 'Super Admin takeover recorded. / 总管理员接管已记录。' : 'Campaign updated. / 广告活动已更新。');
    await loadData();
  }

  return <div className="space-y-5"><SectionCard title="Advertising & Promotion Center / 广告投放与推广中心" subtitle="Unified paid acquisition, campaign ROI, Google/social promotion, budgets, creatives, AI suggestions, approvals and Super Admin takeover. / 统一管理付费获客、广告 ROI、谷歌/社媒推广、预算、素材、AI 建议、审批与总管理员接管。"><div className="grid gap-3 md:grid-cols-6"><div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-blue-900">{money(metrics.spend)}</div><div className="text-xs font-bold text-blue-700">Spend / 花费</div></div><div className="rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100"><div className="text-2xl font-black text-cyan-900">{metrics.leads}</div><div className="text-xs font-bold text-cyan-700">Leads / 线索</div></div><div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-900">{metrics.bookings}</div><div className="text-xs font-bold text-emerald-700">Bookings / 预约</div></div><div className="rounded-2xl bg-green-50 p-4 ring-1 ring-green-100"><div className="text-2xl font-black text-green-900">{money(metrics.revenue)}</div><div className="text-xs font-bold text-green-700">Revenue / 收款</div></div><div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-900">{money(metrics.cpl)}</div><div className="text-xs font-bold text-amber-700">CPL / 线索成本</div></div><div className="rounded-2xl bg-slate-950 p-4 text-white"><div className="text-lg font-black">{state.role}</div><div className="text-xs font-bold text-slate-300">{state.fullAccess ? 'Super Admin full access / 总管理员全部权限' : 'Scoped access / 范围权限'}</div></div></div>{state.fallback ? <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 ring-1 ring-amber-100">Fallback mode: {state.fallback} / 若数据库表未应用，系统显示示例数据，不会假装写入成功。</div> : null}</SectionCard>{message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]"><SectionCard title="Create Campaign Draft / 创建广告草稿" subtitle="Draft only. Publishing and budget increase require approval. / 只创建草稿，发布和加预算必须审批。"><div className="space-y-3"><label><span className={labelClass}>Platform / 平台</span><select className={inputClass} value={draft.platform} onChange={(event) => setDraft({ ...draft, platform: event.target.value })}>{adPlatforms.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label><label><span className={labelClass}>Service / 服务</span><select className={inputClass} value={draft.service_category} onChange={(event) => setDraft({ ...draft, service_category: event.target.value })}>{adServiceCategories.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><input className={inputClass} value={draft.campaign_name} onChange={(event) => setDraft({ ...draft, campaign_name: event.target.value })} placeholder="Campaign Name" /><div className="grid grid-cols-2 gap-3"><input className={inputClass} value={draft.daily_budget} type="number" onChange={(event) => setDraft({ ...draft, daily_budget: event.target.value })} placeholder="Daily Budget" /><input className={inputClass} value={draft.monthly_budget} type="number" onChange={(event) => setDraft({ ...draft, monthly_budget: event.target.value })} placeholder="Monthly Budget" /></div><input className={inputClass} value={draft.landing_page_url} onChange={(event) => setDraft({ ...draft, landing_page_url: event.target.value })} placeholder="Landing Page" /><input className={inputClass} value={draft.headline} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} placeholder="Headline" /><textarea className={`${inputClass} min-h-24`} value={draft.primary_text} onChange={(event) => setDraft({ ...draft, primary_text: event.target.value })} placeholder="Primary text" /><input className={inputClass} value={draft.utm_campaign} onChange={(event) => setDraft({ ...draft, utm_campaign: event.target.value })} placeholder="UTM Campaign" /><div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Generated URL / 生成追踪链接:<br /><span className="break-all text-activeBlue">{generatedUrl()}</span></div><button type="button" onClick={createDraft} className="w-full rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700">Save Draft / 保存草稿</button></div></SectionCard><SectionCard title="Campaign ROI & Approval / 广告 ROI 与审批" subtitle="Compare Google, social and manual promotion by spend, leads, bookings, revenue and ROI. / 按花费、线索、预约、收款和 ROI 对比谷歌、社媒和手动推广。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[1120px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Campaign</th><th className="p-3">Platform</th><th className="p-3">Status</th><th className="p-3">Spend</th><th className="p-3">Leads</th><th className="p-3">Revenue</th><th className="p-3">ROAS</th><th className="p-3">ROI</th><th className="p-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{state.campaigns.map((row, index) => { const spend = campaignSpend(row); const revenue = campaignRevenue(row); const gross = campaignGross(row); return <tr key={String(row.campaign_id || index)} className="hover:bg-blue-50/50"><td className="p-3"><div className="font-black text-slate-900">{campaignName(row)}</div><div className="text-xs font-semibold text-slate-500">{text(row.service_category || row.service)}</div></td><td className="p-3"><Badge tone={tone(row.platform)}>{text(row.platform)}</Badge></td><td className="p-3"><Badge tone={tone(row.approval_status || row.status)}>{text(row.approval_status || row.status)}</Badge></td><td className="p-3 font-bold">{money(spend)}</td><td className="p-3 font-bold">{campaignLeads(row)}</td><td className="p-3 font-bold text-green-700">{money(revenue)}</td><td className="p-3 font-bold">{calculateRoas(revenue, spend)}x</td><td className="p-3 font-bold">{pct(calculateRoi(revenue, spend, gross))}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => updateCampaign('submit_for_review', row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100">Review</button><button type="button" onClick={() => updateCampaign('super_admin_approve', row)} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">Approve</button><button type="button" onClick={() => updateCampaign('super_admin_takeover', row)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">Takeover</button></div></td></tr>; })}</tbody></table></div></SectionCard></div><div className="grid gap-5 xl:grid-cols-3"><SectionCard title="Connected Accounts / 广告账号" subtitle="API connection is planned; CSV/manual fallback remains available. / 预留 API 连接，同时保留 CSV/手动导入。"><div className="space-y-3">{state.accounts.map((a, i) => <div key={String(a.ad_account_id || i)} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="font-black text-slate-900">{text(a.account_name)}</div><div className="mt-1 flex flex-wrap gap-2"><Badge tone={tone(a.platform)}>{text(a.platform)}</Badge><Badge tone={tone(a.connection_status || a.status)}>{text(a.connection_status || a.status)}</Badge></div><div className="mt-2 text-xs font-bold text-slate-500">{text(a.sync_mode)} · {text(a.currency)} · {text(a.timezone)}</div></div>)}</div></SectionCard><SectionCard title="AI Suggestions / AI 广告建议" subtitle="Editable suggestions only; no automatic publishing. / 只做可编辑建议，不自动发布。"><div className="space-y-3">{state.suggestions.map((s, i) => <div key={String(s.suggestion_id || i)} className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100"><div className="text-xs font-black uppercase text-amber-700">{text(s.suggestion_type)}</div><div className="mt-1 font-black text-slate-900">{text(s.title)}</div><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{text(s.summary)}</p><textarea className={`${inputClass} mt-2 min-h-20 bg-white text-xs`} defaultValue={text(s.editable_text, '')} /></div>)}</div></SectionCard><SectionCard title="Approval Gates / 审批闸门" subtitle="Budget and publishing controls remain human-approved. / 预算和发布必须人工审批。"><div className="space-y-2">{adApprovalGateRules.map((rule) => <div key={rule} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-700 ring-1 ring-slate-200">{rule}</div>)}</div></SectionCard></div><div className="grid gap-5 xl:grid-cols-3"><SectionCard title="Super Admin Rule / 总管理员规则" subtitle="Super Admin owns every backend role and every advertising process. / 总管理员拥有所有后台角色与广告流程。"><div className="grid gap-2">{superAdminAdvertisingCapabilities.map((item) => <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-700 ring-1 ring-slate-100">✓ {item}</div>)}</div></SectionCard><SectionCard title="Workflow / 工作流程" subtitle="From campaign draft to ROI and audit logs. / 从广告草稿到 ROI 和审计日志。"><ol className="space-y-2">{adWorkflow.map((step, index) => <li key={step} className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-700 ring-1 ring-slate-200"><span className="mr-2 text-activeBlue">{index + 1}.</span>{step}</li>)}</ol></SectionCard><SectionCard title="Menu & Roles / 菜单与角色" subtitle="The module connects website, social, AI, customers, operations, finance and payments. / 模块连接网站、社媒、AI、客户、运营、财务和付款。"><div className="space-y-3"><div className="grid gap-2 md:grid-cols-2">{adCenterSections.map(([en, zh]) => <div key={en} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{en} / {zh}</div>)}</div>{adRoleMatrix.map((r) => <div key={r.role} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-blue-800 ring-1 ring-blue-100">{r.label}: {r.permissions}</div>)}</div></SectionCard></div></div>;
}
