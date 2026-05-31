'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type AdsRule = {
  platform: string;
  zh: string;
  binding: string;
  api: string;
  testApi: string;
  syncApi: string;
  credentialFields: string;
  linkedModules: string;
  providerData: string;
  tables: string;
};

type Result = { action: string; ok: boolean; status?: number; message: string; bridgeReady?: boolean };

const adsRules: AdsRule[] = [
  { platform: 'Google Ads', zh: 'Google 广告', binding: 'OAuth + developer token + customer ID', api: '/api/ads/accounts/google/connect', testApi: '/api/ads/accounts/google/test', syncApi: '/api/ads/accounts/google/sync', credentialFields: 'Developer Token, Client ID, Client Secret, Refresh Token, Login Customer ID, Customer ID', linkedModules: 'Dashboard, Website Leads, Service Requests, Attribution Rules, Campaign Performance, AI Ads Suggestions', providerData: 'Campaigns, ad groups, keywords, conversions, cost, clicks, calls, lead forms', tables: 'ad_accounts, ad_campaigns, ad_leads, attribution_events' },
  { platform: 'Meta Ads', zh: 'Meta / Facebook / Instagram 广告', binding: 'Meta Business OAuth + ad account + pixel', api: '/api/ads/accounts/meta/connect', testApi: '/api/ads/accounts/meta/test', syncApi: '/api/ads/accounts/meta/sync', credentialFields: 'App ID, App Secret, Business ID, Ad Account ID, Access Token, Pixel ID, Webhook Verify Token', linkedModules: 'Dashboard, Website Leads, Social Inbox, Attribution Rules, Campaign Performance, AI Ads Suggestions', providerData: 'Campaigns, ad sets, ads, lead ads, pixel events, messages, comments, cost', tables: 'ad_accounts, ad_campaigns, ad_leads, attribution_events, social_connection_events' },
  { platform: 'TikTok Ads', zh: 'TikTok 广告', binding: 'TikTok Business OAuth + advertiser ID + pixel', api: '/api/ads/accounts/tiktok/connect', testApi: '/api/ads/accounts/tiktok/test', syncApi: '/api/ads/accounts/tiktok/sync', credentialFields: 'Client Key, Client Secret, Advertiser ID, Access Token, Pixel ID', linkedModules: 'Dashboard, Website Leads, Social Inbox, Attribution Rules, Campaign Performance, AI Ads Suggestions', providerData: 'Campaigns, ad groups, video ads, lead generation, pixel events, cost, engagement', tables: 'ad_accounts, ad_campaigns, ad_leads, attribution_events' },
  { platform: 'LinkedIn Ads', zh: 'LinkedIn 广告', binding: 'LinkedIn OAuth + ad account + organisation', api: '/api/ads/accounts/linkedin/connect', testApi: '/api/ads/accounts/linkedin/test', syncApi: '/api/ads/accounts/linkedin/sync', credentialFields: 'Client ID, Client Secret, Refresh Token, Ad Account ID, Organization ID', linkedModules: 'Dashboard, B2B Leads, Attribution Rules, Campaign Performance, AI Ads Suggestions', providerData: 'Campaign groups, campaigns, lead gen forms, cost, impressions, clicks', tables: 'ad_accounts, ad_campaigns, ad_leads, attribution_events' },
  { platform: 'Microsoft / Bing Ads', zh: 'Microsoft / Bing 广告', binding: 'Microsoft Ads OAuth + developer token + account ID', api: '/api/ads/accounts/microsoft/connect', testApi: '/api/ads/accounts/microsoft/test', syncApi: '/api/ads/accounts/microsoft/sync', credentialFields: 'Developer Token, Client ID, Client Secret, Refresh Token, Customer ID, Account ID', linkedModules: 'Dashboard, Website Leads, Attribution Rules, Campaign Performance, AI Ads Suggestions', providerData: 'Campaigns, ad groups, keywords, conversions, cost, clicks', tables: 'ad_accounts, ad_campaigns, ad_leads, attribution_events' },
  { platform: 'Xiaohongshu Ads', zh: '小红书广告', binding: 'Manual/API hybrid mode until approved connector is available', api: '/api/ads/accounts/xiaohongshu/connect', testApi: '/api/ads/accounts/xiaohongshu/test', syncApi: '/api/ads/accounts/xiaohongshu/sync', credentialFields: 'Account Handle, Admin Owner, Advertiser ID, API Token or Manual Import Template', linkedModules: 'Dashboard, Manual Ad Leads, Customer Source History, Attribution Rules, Campaign Performance, AI Ads Suggestions', providerData: 'Manual campaign import, manual lead import, cost, engagement, message leads', tables: 'ad_accounts, manual_ad_leads, ad_campaigns, attribution_events' }
];

function parseFields(fields: string) { return fields.split(',').map((field) => field.trim()).filter(Boolean); }
function normaliseKey(label: string) { return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function platformSlug(rule: AdsRule) { const match = rule.api.match(/\/api\/ads\/accounts\/([^/]+)\//); return match?.[1] || rule.platform.toLowerCase().replace(/\s+/g, '-'); }
async function postJson(url: string, payload: Record<string, unknown>) { const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' }); const data = await response.json().catch(() => null); return { response, data }; }

export function AdvertisingAccountConnectionCenter() {
  const [selectedApi, setSelectedApi] = useState(adsRules[0].api);
  const active = useMemo(() => adsRules.find((rule) => rule.api === selectedApi) || adsRules[0], [selectedApi]);
  const fields = useMemo(() => parseFields(active.credentialFields), [active]);
  const [accountName, setAccountName] = useState('NANOFIX Ads Official');
  const [accountId, setAccountId] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  function updateCredential(field: string, value: string) { setCredentials((current) => ({ ...current, [normaliseKey(field)]: value })); }

  async function submit(action: 'connect' | 'test' | 'sync') {
    const endpoint = action === 'connect' ? active.api : action === 'test' ? active.testApi : active.syncApi;
    setBusyAction(action);
    setResult(null);
    try {
      const slug = platformSlug(active);
      const payload = { account_name: accountName, account_id: accountId, customer_id: slug === 'google' || slug === 'microsoft' ? accountId : undefined, credentials };
      const { response, data } = await postJson(endpoint, payload);
      setResult({ action, ok: Boolean(data?.ok ?? response.ok), status: response.status, bridgeReady: Boolean(data?.bridge_ready), message: data?.warning || data?.next_step || data?.error || (response.ok ? 'Saved / 已保存' : 'Request failed / 请求失败') });
    } catch (error) {
      setResult({ action, ok: false, message: error instanceof Error ? error.message : 'Unknown error / 未知错误' });
    } finally {
      setBusyAction('');
    }
  }

  return (
    <SectionCard title="Advertising Account Connection Center / 广告账号接入中心" subtitle="Connect paid advertising accounts by platform, test data bridges, then sync campaign, cost, lead and attribution data into the internal backend. / 按平台接入付费广告账号，测试数据桥接，再同步广告活动、成本、线索和归因数据到后台。">
      <div id="advertising-account-connection-center" className="scroll-mt-32 space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-base font-black text-slate-950">Paste Advertising API Credentials & Bind Account / 粘贴广告 API 并绑定账号</h3><p className="mt-1 text-xs font-bold leading-5 text-slate-500">Do not paste secrets into the browser URL. Paste credentials here, then Save Binding, Test Connection and Sync Data. / 不要把密钥粘贴到浏览器地址栏；请粘贴到这里，然后保存绑定、测试连接、同步数据。</p></div>
            <Badge tone="amber">Ads API POST</Badge>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <label className="grid gap-1 text-xs font-black text-slate-600">Platform / 平台<select value={selectedApi} onChange={(event) => { setSelectedApi(event.target.value); setCredentials({}); setResult(null); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">{adsRules.map((rule) => <option key={rule.api} value={rule.api}>{rule.platform} / {rule.zh}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-black text-slate-600">Account Name / 账号名称<input value={accountName} onChange={(event) => setAccountName(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800" placeholder="NANOFIX Google Ads" /></label>
            <label className="grid gap-1 text-xs font-black text-slate-600">Ad Account ID / 广告账号 ID<input value={accountId} onChange={(event) => setAccountId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800" placeholder="Customer ID / Ad Account ID / Advertiser ID" /></label>
          </div>
          <div className="mt-4 grid gap-3 rounded-2xl bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-100 md:grid-cols-2"><div>Linked Modules / 绑定后联通栏目：{active.linkedModules}</div><div>Provider Data / 平台数据：{active.providerData}</div></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => { const key = normaliseKey(field); const secretLike = /secret|token|key/i.test(field); return <label key={field} className="grid gap-1 text-xs font-black text-slate-600">{field}<input type={secretLike ? 'password' : 'text'} value={credentials[key] || ''} onChange={(event) => updateCredential(field, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800" placeholder="Paste here / 粘贴到这里" /></label>; })}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3"><button type="button" onClick={() => submit('connect')} disabled={Boolean(busyAction)} className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{busyAction === 'connect' ? 'Saving...' : 'Save Binding / 保存绑定'}</button><button type="button" onClick={() => submit('test')} disabled={Boolean(busyAction)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">{busyAction === 'test' ? 'Testing...' : 'Test Data Bridge / 测试数据联通'}</button><button type="button" onClick={() => submit('sync')} disabled={Boolean(busyAction)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">{busyAction === 'sync' ? 'Syncing...' : 'Sync Ads Data / 同步广告数据'}</button></div>
          {result ? <div className={`mt-4 rounded-2xl p-3 text-xs font-bold leading-5 ring-1 ${result.ok ? 'bg-emerald-50 text-emerald-950 ring-emerald-200' : 'bg-amber-50 text-amber-950 ring-amber-200'}`}>{result.action.toUpperCase()} · HTTP {result.status || '-'} · Bridge Ready: {result.bridgeReady ? 'YES' : 'NO'} · {result.message}</div> : null}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="grid grid-cols-[170px_1.2fr_1.2fr_1fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500"><span>Platform / 平台</span><span>Required Info / 所需信息</span><span>Backend Bridge / 后台联通</span><span>API / 接口</span></div>
          {adsRules.map((rule) => <div key={rule.platform} className="grid grid-cols-[170px_1.2fr_1.2fr_1fr] gap-3 border-t border-slate-100 px-4 py-3 text-xs font-bold text-slate-700"><span className="font-black text-slate-950">{rule.platform}<br /><span className="text-slate-400">{rule.zh}</span></span><span>{rule.credentialFields}</span><span>{rule.tables}<br /><span className="text-slate-400">{rule.linkedModules}</span></span><span className="space-y-1 text-activeBlue"><Link className="block hover:underline" href={rule.api}>Connect Guide</Link><Link className="block hover:underline" href={rule.testApi}>Test Guide</Link><Link className="block hover:underline" href={rule.syncApi}>Sync Guide</Link></span></div>)}
        </div>
      </div>
    </SectionCard>
  );
}
