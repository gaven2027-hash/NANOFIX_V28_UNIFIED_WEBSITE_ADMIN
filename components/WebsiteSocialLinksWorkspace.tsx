'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const platforms = ['facebook', 'instagram', 'tiktok', 'youtube', 'youtube_shorts', 'xiaohongshu', 'google_business_profile', 'whatsapp', 'linktree', 'other'];
const placements = ['header', 'footer', 'floating', 'contact_page', 'all'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function platformLabel(platform: unknown) {
  return String(platform || '').replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

const defaultForm = (): Row => ({
  platform: 'facebook',
  label: 'Facebook',
  url: '',
  icon_key: 'facebook',
  display_order: 1,
  placement: 'footer',
  is_active: true,
  open_new_tab: true,
  rel_attr: 'noopener noreferrer',
  notes: ''
});

function WebsiteSocialLinkEditor({ row, onSaved, onClose }: { row: Row | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || defaultForm());
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(row || defaultForm());
    setMessage('');
  }, [row]);

  function patch(name: string, value: unknown) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'platform' && !row) {
        next.label = platformLabel(value);
        next.icon_key = value;
      }
      return next;
    });
  }

  async function save() {
    setMessage('');
    if (!String(form.label || '').trim()) return setMessage('Label is required. / 必须填写显示名称。');
    const url = String(form.url || '').trim();
    if (url && !url.startsWith('https://')) return setMessage('URL must start with https:// / 链接必须以 https:// 开头。');

    setSaving(true);
    const method = row ? 'PATCH' : 'POST';
    const response = await fetch('/api/admin/website-social-links', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, website_social_link_id: row?.website_social_link_id })
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
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit Website Social Link' : 'New Website Social Link'}</div>
          <h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.label) : 'Add / Replace Social Link / 新增或替换社媒链接'}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">For public website icon links only. / 仅用于官网前台图标跳转链接。</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button>
      </div>

      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label><span className={labelClass}>Platform / 平台</span><select className={inputClass} value={String(form.platform || 'facebook')} onChange={(event) => patch('platform', event.target.value)}>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className={labelClass}>Placement / 显示位置</span><select className={inputClass} value={String(form.placement || 'footer')} onChange={(event) => patch('placement', event.target.value)}>{placements.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className={labelClass}>Label / 显示名称</span><input className={inputClass} value={String(form.label || '')} onChange={(event) => patch('label', event.target.value)} /></label>
        <label><span className={labelClass}>Icon Key / 图标键名</span><input className={inputClass} value={String(form.icon_key || '')} onChange={(event) => patch('icon_key', event.target.value)} /></label>
        <label className="md:col-span-2"><span className={labelClass}>URL / 链接地址</span><input className={inputClass} placeholder="https://..." value={String(form.url || '')} onChange={(event) => patch('url', event.target.value)} /></label>
        <label><span className={labelClass}>Display Order / 排序</span><input className={inputClass} type="number" value={String(form.display_order ?? 0)} onChange={(event) => patch('display_order', Number(event.target.value))} /></label>
        <label><span className={labelClass}>Active / 启用</span><select className={inputClass} value={String(Boolean(form.is_active))} onChange={(event) => patch('is_active', event.target.value === 'true')}><option value="true">true</option><option value="false">false</option></select></label>
        <label><span className={labelClass}>Open New Tab / 新窗口打开</span><select className={inputClass} value={String(Boolean(form.open_new_tab))} onChange={(event) => patch('open_new_tab', event.target.value === 'true')}><option value="true">true</option><option value="false">false</option></select></label>
        <label><span className={labelClass}>rel Attribute / rel 属性</span><input className={inputClass} value={String(form.rel_attr || 'noopener noreferrer')} onChange={(event) => patch('rel_attr', event.target.value)} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Notes / 备注</span><textarea className={`${inputClass} min-h-24`} value={String(form.notes || '')} onChange={(event) => patch('notes', event.target.value)} /></label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={saving} onClick={save} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save Link / 保存链接</button>
        <button type="button" disabled={saving} onClick={() => patch('is_active', true)} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">Enable / 启用</button>
        <button type="button" disabled={saving} onClick={() => patch('is_active', false)} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-700 disabled:opacity-60">Disable / 停用</button>
      </div>
    </div>
  );
}

export function WebsiteSocialLinksWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [placement, setPlacement] = useState('footer');
  const [active, setActive] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadRows() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (placement) params.set('placement', placement);
    if (active) params.set('active', active);
    const response = await fetch(`/api/admin/website-social-links?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Load failed. / 加载失败。');
    setRows(json.rows || []);
  }

  useEffect(() => { void loadRows(); }, []);

  return (
    <div>
      <SectionCard title="Website Social Links / 官网社媒链接" subtitle="Manage the public website social icon URLs. These are customer-facing links, not API account tokens. / 管理官网前台社媒图标跳转链接，不是平台 API Token。">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px_auto_auto]">
          <input className={inputClass} placeholder="Search platform, label, URL... / 搜索" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className={inputClass} value={placement} onChange={(event) => setPlacement(event.target.value)}><option value="">All placements / 全部位置</option>{placements.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className={inputClass} value={active} onChange={(event) => setActive(event.target.value)}><option value="">All / 全部</option><option value="true">Active</option><option value="false">Inactive</option></select>
          <button type="button" onClick={loadRows} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
          <button type="button" onClick={() => { setCreating(true); setSelected(null); }} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">New Link / 新增链接</button>
        </div>
        <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">
          Default public website social slots / 默认官网社媒位：Facebook, Instagram, TikTok, YouTube. You can replace URL, icon, order and active status here.
        </div>
      </SectionCard>

      {message ? <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <SectionCard title="Public Website Social Icon Links / 官网图标链接" subtitle="Open any row to edit or replace the customer-facing social link. / 打开任意记录可修改或替换官网跳转链接。">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Active</th><th className="p-3">Order</th><th className="p-3">Platform</th><th className="p-3">Label</th><th className="p-3">Placement</th><th className="p-3">URL</th><th className="p-3">Updated</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={String(row.website_social_link_id)} className="hover:bg-blue-50/50">
                    <td className="p-3"><Badge tone={row.is_active ? 'green' : 'gray'}>{row.is_active ? 'active' : 'inactive'}</Badge></td>
                    <td className="p-3 font-black text-slate-800">{formatValue(row.display_order)}</td>
                    <td className="p-3 font-bold text-slate-800">{formatValue(row.platform)}</td>
                    <td className="p-3 font-semibold text-slate-700">{formatValue(row.label)}</td>
                    <td className="p-3 text-slate-600">{formatValue(row.placement)}</td>
                    <td className="max-w-80 truncate p-3 text-slate-600">{formatValue(row.url)}</td>
                    <td className="p-3 text-slate-500">{formatValue(row.updated_at)}</td>
                    <td className="p-3"><button type="button" onClick={() => { setSelected(row); setCreating(false); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td>
                  </tr>
                ))}
                {!rows.length ? <tr><td colSpan={8} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No website social links yet. / 暂无官网社媒链接。'}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <WebsiteSocialLinkEditor row={creating ? null : selected} onSaved={loadRows} onClose={() => { setSelected(null); setCreating(false); }} />
      </div>
    </div>
  );
}
