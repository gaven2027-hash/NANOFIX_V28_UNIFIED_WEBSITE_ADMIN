'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { SOCIAL_PREVIEW_PLATFORMS } from './SocialMultiPlatformPreviewBoard';

type Row = Record<string, unknown>;

type BindablePlatform = {
  platform: string;
  label: string;
  zh: string;
  secretPrefix: string;
  apiHint: string;
};

const bindablePlatforms: BindablePlatform[] = [
  { platform: 'facebook', label: 'Facebook / FB', zh: 'Facebook 账号', secretPrefix: 'VERCEL_SOCIAL_FACEBOOK', apiHint: 'Meta Graph API page/account connection' },
  { platform: 'instagram', label: 'Instagram / INS', zh: 'Instagram 账号', secretPrefix: 'VERCEL_SOCIAL_INSTAGRAM', apiHint: 'Meta Instagram Graph API business account' },
  { platform: 'tiktok', label: 'TikTok / TK', zh: 'TikTok 账号', secretPrefix: 'VERCEL_SOCIAL_TIKTOK', apiHint: 'TikTok Business / Content Posting API metadata' },
  { platform: 'youtube_shorts', label: 'YouTube Shorts', zh: 'YouTube Shorts 频道', secretPrefix: 'VERCEL_SOCIAL_YOUTUBE', apiHint: 'YouTube Data API channel connection' },
  { platform: 'xiaohongshu', label: 'Xiaohongshu', zh: '小红书账号', secretPrefix: 'VERCEL_SOCIAL_XIAOHONGSHU', apiHint: 'Official/open platform or manual publishing metadata' },
  { platform: 'forum', label: 'Forum', zh: '论坛账号', secretPrefix: 'VERCEL_SOCIAL_FORUM', apiHint: 'Forum/community account or manual posting workflow' },
  { platform: 'google_business_profile', label: 'Google Business Profile', zh: 'Google 商家资料', secretPrefix: 'VERCEL_SOCIAL_GBP', apiHint: 'Google Business Profile account/location connection' },
  { platform: 'linkedin', label: 'LinkedIn', zh: 'LinkedIn 公司页', secretPrefix: 'VERCEL_SOCIAL_LINKEDIN', apiHint: 'LinkedIn organization page connection' },
  { platform: 'whatsapp', label: 'WhatsApp 1-to-1', zh: 'WhatsApp 客服回复', secretPrefix: 'VERCEL_SOCIAL_WHATSAPP', apiHint: 'WhatsApp Business API one-to-one messaging' },
  { platform: 'whatsapp_channel', label: 'WhatsApp Channel', zh: 'WhatsApp 频道', secretPrefix: 'VERCEL_SOCIAL_WHATSAPP_CHANNEL', apiHint: 'WhatsApp Channel metadata; AI cannot auto-send' },
  { platform: 'telegram_channel', label: 'Telegram Channel', zh: 'Telegram 频道', secretPrefix: 'VERCEL_SOCIAL_TELEGRAM', apiHint: 'Telegram Bot/Channel posting metadata' },
  { platform: 'website_blog', label: 'Website Blog', zh: '网站博客', secretPrefix: 'VERCEL_SOCIAL_WEBSITE_BLOG', apiHint: 'Website CMS publishing handoff' },
  { platform: 'website_live_chat', label: 'Website Live Chat', zh: '网站在线聊天', secretPrefix: 'VERCEL_SOCIAL_LIVE_CHAT', apiHint: 'Website chat/webhook collector metadata' },
  { platform: 'linktree', label: 'Linktree', zh: 'Linktree 汇总链接', secretPrefix: 'VERCEL_SOCIAL_LINKTREE', apiHint: 'Public account profile link' }
];

const statuses = ['draft', 'connected', 'needs_reauth', 'disconnected', 'disabled', 'error'];
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

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

function defaultForm(platform = 'facebook'): Row {
  const meta = bindablePlatforms.find((item) => item.platform === platform) || bindablePlatforms[0];
  return {
    platform: meta.platform,
    account_name: `NANOFIX ${meta.label}`,
    account_handle: '',
    account_url: '',
    business_id: '',
    page_id: '',
    app_id: '',
    connection_status: 'draft',
    is_active: true,
    webhook_url: '',
    api_base_url: '',
    access_token_secret_name: `${meta.secretPrefix}_ACCESS_TOKEN`,
    refresh_token_secret_name: `${meta.secretPrefix}_REFRESH_TOKEN`,
    token_expires_at: '',
    permissions_json: JSON.stringify(['read_profile', 'create_draft', 'schedule_after_admin_approval'], null, 2),
    settings_json: JSON.stringify({ admin_review_required: true, ai_auto_publish_allowed: false, preview_window_enabled: true, platform: meta.platform }, null, 2),
    notes: meta.apiHint
  };
}

function safeJson(value: string, fallback: unknown) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch {
    return null;
  }
}

function findRow(rows: Row[], platform: string) {
  return rows.find((row) => String(row.platform) === platform) || null;
}

export function SocialExpandedAccountsBindingWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('facebook');
  const [form, setForm] = useState<Row>(defaultForm('facebook'));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const existingRow = useMemo(() => findRow(rows, selectedPlatform), [rows, selectedPlatform]);
  const previewPlatformCount = SOCIAL_PREVIEW_PLATFORMS.length;

  function patch(name: string, value: unknown) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function loadRows() {
    setLoading(true);
    setMessage('');
    const response = await fetch('/api/admin/social-accounts', { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    setRows(json.rows || []);
  }

  useEffect(() => {
    void loadRows();
  }, []);

  useEffect(() => {
    if (existingRow) {
      setForm({
        ...existingRow,
        permissions_json: JSON.stringify(existingRow.permissions_json || [], null, 2),
        settings_json: JSON.stringify(existingRow.settings_json || { admin_review_required: true, ai_auto_publish_allowed: false }, null, 2),
        token_expires_at: String(existingRow.token_expires_at || '').slice(0, 16)
      });
    } else {
      setForm(defaultForm(selectedPlatform));
    }
  }, [selectedPlatform, existingRow]);

  async function save() {
    const permissions = safeJson(String(form.permissions_json || '[]'), []);
    const settings = safeJson(String(form.settings_json || '{}'), {});
    if (permissions === null) return setMessage('Permissions JSON is invalid. / 权限 JSON 格式错误。');
    if (settings === null) return setMessage('Settings JSON is invalid. / 设置 JSON 格式错误。');
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/social-accounts', {
      method: existingRow ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, social_account_id: existingRow?.social_account_id, permissions_json: permissions, settings_json: settings })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    setMessage('Saved. / 已保存。');
    await loadRows();
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Expanded Social Account Binding / 扩展社媒账号绑定" subtitle="Bind every preview platform used by the multi-platform review center. Tokens are stored as secret names only; never paste raw tokens here. / 绑定多平台预览中心使用的所有发布平台；这里只保存密钥名称，不保存明文 Token。">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-blue-900">{bindablePlatforms.length}</div><div className="text-xs font-bold text-blue-700">Bindable platforms / 可绑定平台</div></div>
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-900">{rows.filter((row) => row.connection_status === 'connected').length}</div><div className="text-xs font-bold text-emerald-700">Connected / 已连接</div></div>
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-900">{previewPlatformCount}</div><div className="text-xs font-bold text-amber-700">Preview windows / 预览窗口</div></div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-900">0</div><div className="text-xs font-bold text-slate-700">Raw tokens stored / 明文 Token</div></div>
        </div>
      </SectionCard>

      {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Platform Checklist / 平台清单" subtitle="Open a platform to create or update the binding metadata. / 打开平台创建或修改绑定资料。">
          <div className="grid gap-2">
            {bindablePlatforms.map((platform) => {
              const row = findRow(rows, platform.platform);
              return (
                <button key={platform.platform} type="button" onClick={() => setSelectedPlatform(platform.platform)} className={`rounded-2xl border px-4 py-3 text-left transition ${selectedPlatform === platform.platform ? 'border-activeBlue bg-blue-50' : 'border-slate-200 bg-white hover:border-activeBlue'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="text-sm font-black text-slate-900">{platform.label}</div><div className="text-xs font-semibold text-slate-500">{platform.zh}</div></div>
                    <Badge tone={row ? statusTone(row.connection_status) : 'gray'}>{row ? formatValue(row.connection_status) : 'not bound'}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Binding Editor / 绑定编辑" subtitle="Connection metadata, webhook, page ID and secret names for the selected platform. / 当前平台的连接资料、Webhook、页面ID和密钥名称。">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone={existingRow ? 'green' : 'gray'}>{existingRow ? 'Existing binding / 已有绑定' : 'New binding / 新绑定'}</Badge>
            <Badge tone="amber">AI auto publish false</Badge>
            <Badge tone="blue">Admin review required</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className={labelClass}>Platform / 平台</span><select className={inputClass} value={String(form.platform || selectedPlatform)} onChange={(event) => { setSelectedPlatform(event.target.value); patch('platform', event.target.value); }}>{bindablePlatforms.map((item) => <option key={item.platform} value={item.platform}>{item.label}</option>)}</select></label>
            <label><span className={labelClass}>Connection Status / 连接状态</span><select className={inputClass} value={String(form.connection_status || 'draft')} onChange={(event) => patch('connection_status', event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span className={labelClass}>Account Name / 账号名称</span><input className={inputClass} value={String(form.account_name || '')} onChange={(event) => patch('account_name', event.target.value)} /></label>
            <label><span className={labelClass}>Account Handle / 账号名</span><input className={inputClass} value={String(form.account_handle || '')} onChange={(event) => patch('account_handle', event.target.value)} placeholder="@nanofixsg" /></label>
            <label className="md:col-span-2"><span className={labelClass}>Account URL / 账号链接</span><input className={inputClass} value={String(form.account_url || '')} onChange={(event) => patch('account_url', event.target.value)} placeholder="https://..." /></label>
            <label><span className={labelClass}>Business ID / 商业ID</span><input className={inputClass} value={String(form.business_id || '')} onChange={(event) => patch('business_id', event.target.value)} /></label>
            <label><span className={labelClass}>Page / Channel ID / 页面或频道ID</span><input className={inputClass} value={String(form.page_id || '')} onChange={(event) => patch('page_id', event.target.value)} /></label>
            <label><span className={labelClass}>App ID / 应用ID</span><input className={inputClass} value={String(form.app_id || '')} onChange={(event) => patch('app_id', event.target.value)} /></label>
            <label><span className={labelClass}>Active / 启用</span><select className={inputClass} value={String(Boolean(form.is_active))} onChange={(event) => patch('is_active', event.target.value === 'true')}><option value="true">true</option><option value="false">false</option></select></label>
            <label className="md:col-span-2"><span className={labelClass}>Webhook URL / Webhook 地址</span><input className={inputClass} value={String(form.webhook_url || '')} onChange={(event) => patch('webhook_url', event.target.value)} placeholder="https://..." /></label>
            <label className="md:col-span-2"><span className={labelClass}>API Base URL / API 基础地址</span><input className={inputClass} value={String(form.api_base_url || '')} onChange={(event) => patch('api_base_url', event.target.value)} placeholder="https://..." /></label>
            <label><span className={labelClass}>Access Token Secret Name / Access Token 密钥名</span><input className={inputClass} value={String(form.access_token_secret_name || '')} onChange={(event) => patch('access_token_secret_name', event.target.value)} /></label>
            <label><span className={labelClass}>Refresh Token Secret Name / Refresh Token 密钥名</span><input className={inputClass} value={String(form.refresh_token_secret_name || '')} onChange={(event) => patch('refresh_token_secret_name', event.target.value)} /></label>
            <label><span className={labelClass}>Token Expires At / Token 到期</span><input className={inputClass} type="datetime-local" value={String(form.token_expires_at || '').slice(0, 16)} onChange={(event) => patch('token_expires_at', event.target.value)} /></label>
            <label className="md:col-span-2"><span className={labelClass}>Permissions JSON / 权限 JSON</span><textarea className={`${inputClass} min-h-28 font-mono text-xs`} value={String(form.permissions_json || '[]')} onChange={(event) => patch('permissions_json', event.target.value)} /></label>
            <label className="md:col-span-2"><span className={labelClass}>Settings JSON / 设置 JSON</span><textarea className={`${inputClass} min-h-32 font-mono text-xs`} value={String(form.settings_json || '{}')} onChange={(event) => patch('settings_json', event.target.value)} /></label>
            <label className="md:col-span-2"><span className={labelClass}>Notes / 备注</span><textarea className={`${inputClass} min-h-24`} value={String(form.notes || '')} onChange={(event) => patch('notes', event.target.value)} /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={saving} onClick={save} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save Binding / 保存绑定</button>
            <button type="button" disabled={loading} onClick={loadRows} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">Refresh / 刷新</button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
