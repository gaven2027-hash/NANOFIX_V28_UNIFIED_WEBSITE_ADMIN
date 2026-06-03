'use client';

import { useState } from 'react';

const inputClass = 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue';
const labelClass = 'text-xs font-black uppercase tracking-[0.12em] text-slate-500';

export function SocialAccountApiConnector() {
  const [form, setForm] = useState({
    platform: 'facebook',
    accountName: '',
    externalAccountId: '',
    apiClientId: '',
    apiSecret: '',
    accessToken: '',
    refreshToken: '',
    webhookSecret: '',
    rawConfig: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/social/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(form)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        setMessage(json.error || 'Save failed.');
        return;
      }
      setMessage('Saved successfully.');
      setForm((current) => ({
        ...current,
        apiSecret: '',
        accessToken: '',
        refreshToken: '',
        webhookSecret: '',
        rawConfig: ''
      }));
    } catch {
      setMessage('Connection API unavailable.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="account-api-connector" className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Account API Connector</div>
          <h3 className="mt-2 text-xl font-black text-slate-950">Connect social, Google Business and ad accounts</h3>
          <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-slate-600">
            Paste OAuth client information, API tokens, webhook secrets or platform configuration here. The backend stores account binding records and Audit Logs.
          </p>
        </div>
        <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">Admin only</span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <label><span className={labelClass}>Platform</span><select className={inputClass} value={form.platform} onChange={(event) => update('platform', event.target.value)}><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="google_business_profile">Google Business Profile</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="whatsapp">WhatsApp</option></select></label>
        <label><span className={labelClass}>Account display name</span><input className={inputClass} value={form.accountName} onChange={(event) => update('accountName', event.target.value)} placeholder="NANOFIX Meta Business" /></label>
        <label><span className={labelClass}>External account / page ID</span><input className={inputClass} value={form.externalAccountId} onChange={(event) => update('externalAccountId', event.target.value)} placeholder="Page ID, Ad Account ID, Location ID" /></label>
        <label><span className={labelClass}>OAuth Client ID / API Key</span><input className={inputClass} value={form.apiClientId} onChange={(event) => update('apiClientId', event.target.value)} placeholder="Client ID / App ID / API Key" /></label>
        <label><span className={labelClass}>OAuth Client Secret</span><input className={inputClass} type="password" value={form.apiSecret} onChange={(event) => update('apiSecret', event.target.value)} placeholder="Sensitive value" /></label>
        <label><span className={labelClass}>Access Token</span><input className={inputClass} type="password" value={form.accessToken} onChange={(event) => update('accessToken', event.target.value)} placeholder="Access token" /></label>
        <label><span className={labelClass}>Refresh Token</span><input className={inputClass} type="password" value={form.refreshToken} onChange={(event) => update('refreshToken', event.target.value)} placeholder="Refresh token" /></label>
        <label><span className={labelClass}>Webhook Secret</span><input className={inputClass} type="password" value={form.webhookSecret} onChange={(event) => update('webhookSecret', event.target.value)} placeholder="Webhook secret" /></label>
      </div>

      <label className="mt-4 block">
        <span className={labelClass}>Raw Config JSON</span>
        <textarea className={`${inputClass} min-h-[120px] w-full`} value={form.rawConfig} onChange={(event) => update('rawConfig', event.target.value)} placeholder='{"scopes":["messages","reviews"]}' />
      </label>

      {message ? <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950 ring-1 ring-blue-100">{message}</div> : null}

      <button type="button" onClick={save} disabled={saving} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Account Connection'}
      </button>
    </div>
  );
}
