'use client';

import { useState } from 'react';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

const platforms = [
  { value: 'meta', label: 'Meta Business / Facebook / Instagram' },
  { value: 'google_business', label: 'Google Business Profile' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'whatsapp', label: 'WhatsApp Business Cloud API' },
  { value: 'tiktok', label: 'TikTok Business' },
  { value: 'youtube', label: 'YouTube / YouTube Shorts' },
  { value: 'xiaohongshu', label: 'Xiaohongshu / Manual Mode' },
  { value: 'manual', label: 'Manual / Other Platform' }
];

export function SocialAccountApiConnector({ defaultPlatform = 'meta' }: { defaultPlatform?: string }) {
  const [form, setForm] = useState({
    platform: defaultPlatform,
    accountName: '',
    externalAccountId: '',
    apiClientId: '',
    apiSecret: '',
    accessToken: '',
    refreshToken: '',
    webhookSecret: '',
    rawConfig: '',
    notes: ''
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveConnection() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/social/accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(form)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        setMessage(json.error || 'Save failed. / 保存失败。');
        return;
      }
      setMessage(`Saved: ${json.platform} / ${json.account_name}. Connected modules can now reference account_id=${json.account_id}. / 已保存账号，相关模块可按 account_id 关联。`);
      setForm((current) => ({ ...current, apiSecret: '', accessToken: '', refreshToken: '', webhookSecret: '', rawConfig: '' }));
    } catch {
      setMessage('Connection API unavailable. / 接入接口暂不可用。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="account-api-connector" className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Account API Connector / 账号 API 接入口</div>
          <h3 className="mt-2 text-xl font-black text-slate-950">Connect social, Google Business and ad accounts / 接入社媒、Google 商家和广告账号</h3>
          <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-slate-600">
            Paste OAuth client information, API tokens, webhook secret or platform config here. The backend stores the account binding record and Audit Log, then other modules can reference the same account ID for inbox, AI drafts, publishing, analytics and attribution. / 可在这里粘贴 OAuth、API Token、Webhook Secret 或平台配置；后台保存账号绑定记录和审计日志，统一收件箱、AI 草稿、发布、分析和归因模块按同一 account_id 关联。
          </p>
        </div>
        <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">Admin only / 仅内部管理员</span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <label><span className={labelClass}>Platform / 平台</span><select className={inputClass} value={form.platform} onChange={(event) => update('platform', event.target.value)}>{platforms.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span className={labelClass}>Account display name / 账号显示名</span><input className={inputClass} value={form.accountName} onChange={(event) => update('accountName', event.target.value)} placeholder="NANOFIX Meta Business / NANOFIX Google Ads" /></label>
        <label><span className={labelClass}>External account / page / location ID / 外部账号ID</span><input className={inputClass} value={form.externalAccountId} onChange={(event) => update('externalAccountId', event.target.value)} placeholder="Page ID, Ad Account ID, GMB Location ID, WhatsApp Phone Number ID" /></label>
        <label><span className={labelClass}>OAuth Client ID / API Key</span><input className={inputClass} value={form.apiClientId} onChange={(event) => update('apiClientId', event.target.value)} placeholder="Client ID / App ID / API Key" /></label>
        <label><span className={labelClass}>OAuth Client Secret / App Secret</span><input className={inputClass} type="password" value={form.apiSecret} onChange={(event) => update('apiSecret', event.target.value)} placeholder="Sensitive - will be masked/encrypted when available" /></label>
        <label><span className={labelClass}>Access Token</span><input className={inputClass} type="password" value={form.accessToken} onChange={(event) => update('accessToken', event.target.value)} placeholder="Paste access token if platform provides one" /></label>
        <label><span className={labelClass}>Refresh Token</span><input className={inputClass} type="password" value={form.refreshToken} onChange={(event) => update('refreshToken', event.target.value)} placeholder="Refresh token / long-lived token" /></label>
        <label><span className={labelClass}>Webhook Verify Secret</span><input className={inputClass} type="password" value={form.webhookSecret} onChange={(event) => update('webhookSecret', event.target.value)} placeholder="Webhook secret / verify token" /></label>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <label><span className={labelClass}>Raw API config / JSON / 复制粘贴配置</span><textarea className={`${inputClass} min-h-32`} value={form.rawConfig} onChange={(event) => update('rawConfig', event.target.value)} placeholder='{"client_id":"...","project_id":"...","location_id":"..."}' /></label>
        <label><span className={labelClass}>Internal notes / 内部备注</span><textarea className={`${inputClass} min-h-32`} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Who owns this account, what modules can use it, approval notes..." /></label>
      </div>

      {message ? <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-blue-100">{message}</div> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={saveConnection} disabled={saving} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
          {saving ? 'Saving... / 保存中...' : 'Save & Link Account / 保存并关联账号'}
        </button>
        <a href="/social-media#social-account-binding-rules" className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200">View binding rules / 查看绑定规则</a>
      </div>
    </div>
  );
}
