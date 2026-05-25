'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const platforms = ['facebook', 'instagram', 'tiktok', 'youtube_shorts', 'xiaohongshu', 'google_business_profile', 'whatsapp', 'website_live_chat', 'linktree', 'other'];
const statuses = ['draft', 'connected', 'needs_reauth', 'disconnected', 'disabled', 'error'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (s === 'connected') return 'green';
  if (s === 'draft' || s === 'needs_reauth') return 'amber';
  if (s === 'disabled' || s === 'error') return 'red';
  if (s === 'disconnected') return 'gray';
  return 'blue';
}

function safeJsonString(value: unknown, fallback: unknown) {
  if (value === null || value === undefined || value === '') return JSON.stringify(fallback, null, 2);
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJsonInput(value: string, fallback: unknown) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch {
    return null;
  }
}

const defaultForm = (): Row => ({
  platform: 'facebook',
  account_name: '',
  account_handle: '',
  account_url: '',
  business_id: '',
  page_id: '',
  app_id: '',
  connection_status: 'draft',
  is_active: true,
  webhook_url: '',
  api_base_url: '',
  access_token_secret_name: '',
  refresh_token_secret_name: '',
  token_expires_at: '',
  permissions_json: [],
  settings_json: { admin_review_required: true, ai_auto_publish_allowed: false },
  notes: ''
});

function SocialAccountEditor({ row, onSaved, onClose }: { row: Row | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || defaultForm());
  const [permissionsJson, setPermissionsJson] = useState(safeJsonString(row?.permissions_json, []));
  const [settingsJson, setSettingsJson] = useState(safeJsonString(row?.settings_json, { admin_review_required: true, ai_auto_publish_allowed: false }));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(row || defaultForm());
    setPermissionsJson(safeJsonString(row?.permissions_json, []));
    setSettingsJson(safeJsonString(row?.settings_json, { admin_review_required: true, ai_auto_publish_allowed: false }));
    setMessage('');
  }, [row]);

  function patch(name: string, value: unknown) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function save() {
    const permissions = parseJsonInput(permissionsJson, []);
    const settings = parseJsonInput(settingsJson, {});
    if (permissions === null) return setMessage('Permissions JSON is invalid. / 权限 JSON 格式错误。');
    if (settings === null) return setMessage('Settings JSON is invalid. / 设置 JSON 格式错误。');
    if (!String(form.account_name || '').trim()) return setMessage('Account name is required. / 必须填写账号名称。');

    setSaving(true);
    setMessage('');
    const method = row ? 'PATCH' : 'POST';
    const response = await fetch('/api/admin/social-accounts', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, permissions_json: permissions, settings_json: settings, social_account_id: row?.social_account_id })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Save failed. / 保存失败。');
    setMessage('Saved. / 已保存。');
    onSaved();
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit Social Account Binding' : 'New Social Account Binding'}</div>
          <h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.account_name) : 'Bind New Social Account / 绑定新社媒账号'}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">Tokens are stored as secret names only. Do not paste raw access tokens here. / 这里只保存密钥名称，不填写明文 Token。</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button>
      </div>

      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label><span className={labelClass}>Platform / 平台</span><select className={inputClass} value={String(form.platform || 'facebook')} onChange={(event) => patch('platform', event.target.value)}>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className={labelClass}>Connection Status / 连接状态</span><select className={inputClass} value={String(form.connection_status || 'draft')} onChange={(event) => patch('connection_status', event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className={labelClass}>Account Name / 账号名称 *</span><input className={inputClass} value={String(form.account_name || '')} onChange={(event) => patch('account_name', event.target.value)} /></label>
        <label><span className={labelClass}>Account Handle / 账号名</span><input className={inputClass} placeholder="@nanofixsg" value={String(form.account_handle || '')} onChange={(event) => patch('account_handle', event.target.value)} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Account URL / 账号链接</span><input className={inputClass} placeholder="https://..." value={String(form.account_url || '')} onChange={(event) => patch('account_url', event.target.value)} /></label>
        <label><span className={labelClass}>Business ID / 商业账号ID</span><input className={inputClass} value={String(form.business_id || '')} onChange={(event) => patch('business_id', event.target.value)} /></label>
        <label><span className={labelClass}>Page / Channel ID / 页面或频道ID</span><input className={inputClass} value={String(form.page_id || '')} onChange={(event) => patch('page_id', event.target.value)} /></label>
        <label><span className={labelClass}>App ID / 应用ID</span><input className={inputClass} value={String(form.app_id || '')} onChange={(event) => patch('app_id', event.target.value)} /></label>
        <label><span className={labelClass}>Active / 启用</span><select className={inputClass} value={String(Boolean(form.is_active))} onChange={(event) => patch('is_active', event.target.value === 'true')}><option value="true">true</option><option value="false">false</option></select></label>
        <label className="md:col-span-2"><span className={labelClass}>Webhook URL / Webhook 地址</span><input className={inputClass} placeholder="https://..." value={String(form.webhook_url || '')} onChange={(event) => patch('webhook_url', event.target.value)} /></label>
        <label className="md:col-span-2"><span className={labelClass}>API Base URL / API 基础地址</span><input className={inputClass} placeholder="https://..." value={String(form.api_base_url || '')} onChange={(event) => patch('api_base_url', event.target.value)} /></label>
        <label><span className={labelClass}>Access Token Secret Name / Access Token 密钥名</span><input className={inputClass} placeholder="VERCEL_SOCIAL_FB_ACCESS_TOKEN" value={String(form.access_token_secret_name || '')} onChange={(event) => patch('access_token_secret_name', event.target.value)} /></label>
        <label><span className={labelClass}>Refresh Token Secret Name / Refresh Token 密钥名</span><input className={inputClass} placeholder="VERCEL_SOCIAL_FB_REFRESH_TOKEN" value={String(form.refresh_token_secret_name || '')} onChange={(event) => patch('refresh_token_secret_name', event.target.value)} /></label>
        <label><span className={labelClass}>Token Expires At / Token 到期时间</span><input className={inputClass} type="datetime-local" value={String(form.token_expires_at || '').slice(0, 16)} onChange={(event) => patch('token_expires_at', event.target.value)} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Permissions JSON / 权限 JSON</span><textarea className={`${inputClass} min-h-28 font-mono text-xs`} value={permissionsJson} onChange={(event) => setPermissionsJson(event.target.value)} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Settings JSON / 设置 JSON</span><textarea className={`${inputClass} min-h-32 font-mono text-xs`} value={settingsJson} onChange={(event) => setSettingsJson(event.target.value)} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Notes / 备注</span><textarea className={`${inputClass} min-h-24`} value={String(form.notes || '')} onChange={(event) => patch('notes', event.target.value)} /></label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={saving} onClick={save} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save Binding / 保存绑定</button>
        <button type="button" disabled={saving} onClick={() => { patch('connection_status', 'connected'); patch('is_active', true); }} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">Mark Connected / 标记已连接</button>
        <button type="button" disabled={saving} onClick={() => { patch('connection_status', 'disabled'); patch('is_active', false); }} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-700 disabled:opacity-60">Disable / 停用</button>
      </div>
    </div>
  );
}

export function SocialAccountsBindingWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadRows() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (platform) params.set('platform', platform);
    if (status) params.set('status', status);
    const response = await fetch(`/api/admin/social-accounts?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Load failed. / 加载失败。');
    setRows(json.rows || []);
  }

  useEffect(() => { void loadRows(); }, []);

  return (
    <div>
      <SectionCard title="Social Account Binding / 社媒账号绑定" subtitle="Bind, edit and manage API connection metadata for Facebook, Instagram, TikTok, YouTube Shorts, Xiaohongshu, Google Business Profile, WhatsApp and other platforms. / 绑定和维护各平台 API 连接资料。">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto]">
          <input className={inputClass} placeholder="Search account, handle, URL, notes... / 搜索账号" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className={inputClass} value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="">All platforms / 全部平台</option>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses / 全部状态</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" onClick={loadRows} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
          <button type="button" onClick={() => { setCreating(true); setSelected(null); }} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">New Binding / 新增绑定</button>
        </div>
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-100">
          Security note / 安全提示：后台只保存 Token 的 Secret Name，不保存明文 Token。真实 Token 应放在 Vercel Environment Variables、Supabase Vault 或专用密钥管理服务中。
        </div>
      </SectionCard>

      {message ? <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <SectionCard title="Bound Social Accounts / 已绑定社媒账号" subtitle="Open any row to edit API metadata, connection state, webhook and secret names. / 打开任意记录可修改 API 资料、连接状态、Webhook 和密钥名。">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Active</th><th className="p-3">Platform</th><th className="p-3">Account</th><th className="p-3">Handle</th><th className="p-3">URL</th><th className="p-3">Secret</th><th className="p-3">Updated</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={String(row.social_account_id)} className="hover:bg-blue-50/50">
                    <td className="p-3"><Badge tone={statusTone(row.connection_status)}>{formatValue(row.connection_status)}</Badge></td>
                    <td className="p-3"><Badge tone={row.is_active ? 'green' : 'gray'}>{row.is_active ? 'active' : 'inactive'}</Badge></td>
                    <td className="p-3 font-bold text-slate-800">{formatValue(row.platform)}</td>
                    <td className="p-3 font-semibold text-slate-700">{formatValue(row.account_name)}</td>
                    <td className="p-3 text-slate-600">{formatValue(row.account_handle)}</td>
                    <td className="max-w-64 truncate p-3 text-slate-600">{formatValue(row.account_url)}</td>
                    <td className="max-w-52 truncate p-3 font-mono text-xs text-slate-500">{formatValue(row.access_token_secret_name)}</td>
                    <td className="p-3 text-slate-500">{formatValue(row.updated_at)}</td>
                    <td className="p-3"><button type="button" onClick={() => { setSelected(row); setCreating(false); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td>
                  </tr>
                ))}
                {!rows.length ? <tr><td colSpan={9} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No social accounts bound yet. / 暂无绑定账号。'}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SocialAccountEditor row={creating ? null : selected} onSaved={loadRows} onClose={() => { setSelected(null); setCreating(false); }} />
      </div>
    </div>
  );
}
