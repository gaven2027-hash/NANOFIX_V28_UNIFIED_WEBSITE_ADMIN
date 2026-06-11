'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { createBrowserClient } from '@/lib/supabase/browser';

type ReviewLink = {
  review_link_id?: string;
  provider_key: string;
  label_en: string;
  label_zh: string;
  review_url: string;
  help_text_en?: string | null;
  help_text_zh?: string | null;
  display_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
  updated_at?: string;
};

const emptyLink: ReviewLink = {
  provider_key: 'google_review',
  label_en: 'Leave a Google Review',
  label_zh: '我要评论 / Google 评价',
  review_url: '',
  help_text_en: 'Share your repair experience with NANOFIX.',
  help_text_zh: '分享您对 NANOFIX 维修服务的体验。',
  display_order: 10,
  is_active: true,
  open_in_new_tab: true
};

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

async function sessionHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function CustomerReviewLinkSettings() {
  const [links, setLinks] = useState<ReviewLink[]>([]);
  const [form, setForm] = useState<ReviewLink>(emptyLink);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/customer-review-links', { cache: 'no-store', headers: await sessionHeaders() });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        setMessage(json.error || 'Load review links failed. / 加载评论链接失败。');
        return;
      }
      setLinks(json.links || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Load review links failed. / 加载评论链接失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    setLoading(true);
    setMessage('');
    try {
      const method = form.review_link_id ? 'PATCH' : 'POST';
      const response = await fetch('/api/admin/customer-review-links', {
        method,
        headers: { 'content-type': 'application/json', ...(await sessionHeaders()) },
        body: JSON.stringify(form)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        setMessage(json.error || 'Save review link failed. / 保存评论链接失败。');
        return;
      }
      setMessage('Review link saved and audited. / 评论链接已保存并写入审计。');
      setForm(emptyLink);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save review link failed. / 保存评论链接失败。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="Customer Review Link / 客户我要评论链接" subtitle="Admin can add Google, Facebook or other review URLs. Customers will see a Leave a Review button in Customer Portal and jump directly to the review page. / 管理员可加入 Google、Facebook 或其他评论链接，客户在客户后台点击我要评论后直接跳转。">
      <div id="customer-review-link-settings" className="scroll-mt-32 space-y-5">
        {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-blue-100">{message}</div> : null}
        <div className="grid gap-3 xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]">
          <label>
            <span className={labelClass}>Provider / 平台</span>
            <select className={inputClass} value={form.provider_key} onChange={(event) => setForm((current) => ({ ...current, provider_key: event.target.value }))}>
              <option value="google_review">Google Review / Google 评价</option>
              <option value="facebook_review">Facebook Review / Facebook 评价</option>
              <option value="custom_review">Custom Review / 自定义评论</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>English Label / 英文按钮</span>
            <input className={inputClass} value={form.label_en} onChange={(event) => setForm((current) => ({ ...current, label_en: event.target.value }))} />
          </label>
          <label>
            <span className={labelClass}>Chinese Label / 中文按钮</span>
            <input className={inputClass} value={form.label_zh} onChange={(event) => setForm((current) => ({ ...current, label_zh: event.target.value }))} />
          </label>
        </div>
        <label>
          <span className={labelClass}>Review URL / 评论页面链接</span>
          <input className={inputClass} value={form.review_url} onChange={(event) => setForm((current) => ({ ...current, review_url: event.target.value }))} placeholder="https://..." />
        </label>
        <div className="grid gap-3 xl:grid-cols-2">
          <label>
            <span className={labelClass}>English Help Text / 英文说明</span>
            <input className={inputClass} value={form.help_text_en || ''} onChange={(event) => setForm((current) => ({ ...current, help_text_en: event.target.value }))} />
          </label>
          <label>
            <span className={labelClass}>Chinese Help Text / 中文说明</span>
            <input className={inputClass} value={form.help_text_zh || ''} onChange={(event) => setForm((current) => ({ ...current, help_text_zh: event.target.value }))} />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="w-36">
            <span className={labelClass}>Sort / 排序</span>
            <input className={inputClass} type="number" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: Number(event.target.value) }))} />
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /> Active / 启用
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200">
            <input type="checkbox" checked={form.open_in_new_tab} onChange={(event) => setForm((current) => ({ ...current, open_in_new_tab: event.target.checked }))} /> New tab / 新窗口
          </label>
          <button type="button" disabled={loading} onClick={save} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save Review Link / 保存评论链接</button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-3">Button / 按钮</th><th className="p-3">URL</th><th className="p-3">Status / 状态</th><th className="p-3">Action / 操作</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {links.map((link) => (
                <tr key={link.review_link_id} className="bg-white hover:bg-blue-50/50">
                  <td className="p-3"><div className="font-black text-slate-900">{link.label_en}</div><div className="text-xs font-semibold text-slate-500">{link.label_zh}</div></td>
                  <td className="max-w-sm truncate p-3 text-xs font-bold text-activeBlue">{link.review_url}</td>
                  <td className="p-3"><Badge tone={link.is_active ? 'green' : 'gray'}>{link.is_active ? 'Active' : 'Disabled'}</Badge></td>
                  <td className="p-3"><button type="button" onClick={() => setForm(link)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Edit / 编辑</button></td>
                </tr>
              ))}
              {!links.length ? <tr><td colSpan={4} className="p-6 text-center text-sm font-bold text-slate-500">No review links yet. / 暂无评论链接。</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}
