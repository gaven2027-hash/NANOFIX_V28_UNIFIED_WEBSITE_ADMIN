'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { createBrowserClient } from '@/lib/supabase/browser';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';
type Row = Record<string, unknown>;

type Section = {
  key: string;
  label: string;
  zh: string;
  route: string;
  tone: Tone;
  count: number;
  error?: string | null;
};

type WebsitePayload = {
  ok?: boolean;
  generated_at?: string;
  selected_key?: string;
  sections?: Section[];
  selectedRows?: Row[];
  errors?: Array<{ key: string; error: string }>;
  error?: string;
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function rowKey(row: Row, index: number) {
  const keys = ['page_id', 'block_id', 'service_request_id', 'lead_id', 'audit_id'];
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value) return value;
  }
  return String(index);
}

function rowHref(row: Row) {
  const href = row._website_href;
  return typeof href === 'string' && href ? href : '';
}

function rowId(row: Row) {
  for (const key of ['page_id', 'block_id']) {
    const value = row[key];
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

function visibleColumns(rows: Row[]) {
  const first = rows[0];
  if (!first) return [];
  return Object.keys(first).filter((key) => !key.startsWith('_')).slice(0, 7);
}

async function sessionHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

function CmsRows({ rows, section, onStatusUpdate }: { rows: Row[]; section: string; onStatusUpdate: (row: Row, status: string) => void }) {
  const columns = useMemo(() => visibleColumns(rows), [rows]);
  const editable = section === 'pages' || section === 'blocks';
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[1080px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => <th key={column} className="p-3">{column}</th>)}
            <th className="p-3">Action / 操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)} className="bg-white hover:bg-blue-50/50">
              {columns.map((column) => (
                <td key={column} className="max-w-64 truncate p-3 text-xs font-semibold text-slate-700">
                  {column.includes('status') ? <Badge tone="blue">{displayValue(row[column])}</Badge> : displayValue(row[column])}
                </td>
              ))}
              <td className="p-3">
                <div className="flex flex-wrap gap-2">
                  {rowHref(row) ? <Link href={rowHref(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open</Link> : null}
                  {editable ? <button type="button" onClick={() => onStatusUpdate(row, 'pending_approval')} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 ring-1 ring-amber-100 hover:bg-amber-100">Send Approval</button> : null}
                  {editable ? <button type="button" onClick={() => onStatusUpdate(row, 'published')} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100">Publish</button> : null}
                  {editable ? <button type="button" onClick={() => onStatusUpdate(row, 'archived')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Archive</button> : null}
                </div>
              </td>
            </tr>
          ))}
          {!rows.length ? <tr><td colSpan={Math.max(columns.length + 1, 1)} className="p-6 text-center text-sm font-bold text-slate-500">No live records found. / 暂无真实记录。</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export function WebsiteManagementLiveCore() {
  const [payload, setPayload] = useState<WebsitePayload>({});
  const [section, setSection] = useState('pages');
  const [search, setSearch] = useState('');
  const [newType, setNewType] = useState<'page' | 'block'>('page');
  const [title, setTitle] = useState('NANOFIX editable content');
  const [slug, setSlug] = useState('new-editable-page');
  const [blockKey, setBlockKey] = useState('homepage_cta_block');
  const [body, setBody] = useState('Editable CMS content controlled from Website Management.');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function load(nextSection = section) {
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams({ section: nextSection });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/admin/website-management?${params.toString()}`, {
        cache: 'no-store',
        headers: await sessionHeaders()
      });
      const json = (await response.json().catch(() => ({}))) as WebsitePayload;
      setPayload(json);
      if (!response.ok && response.status !== 207) setMessage(json.error || 'Website Management live API failed. / 网站后台真实 API 加载失败。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Website Management live API failed. / 网站后台真实 API 加载失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load('pages'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function chooseSection(key: string) {
    setSection(key);
    await load(key);
  }

  async function createCmsRecord() {
    setLoading(true);
    setMessage('');
    try {
      const action = newType === 'page' ? 'create_page' : 'create_block';
      const response = await fetch('/api/admin/website-management', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await sessionHeaders()) },
        body: JSON.stringify({ action, title, slug, block_key: blockKey, body, locale: 'en', status: 'draft' })
      });
      const json = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setMessage(json.error || 'Create failed. / 新增失败。');
        return;
      }
      setMessage(newType === 'page' ? 'CMS page created and audited. / CMS 页面已新增并写入审计。' : 'Content block created and audited. / 内容区块已新增并写入审计。');
      await load(newType === 'page' ? 'pages' : 'blocks');
      setSection(newType === 'page' ? 'pages' : 'blocks');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create failed. / 新增失败。');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(row: Row, status: string) {
    const id = rowId(row);
    if (!id) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/website-management', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(await sessionHeaders()) },
        body: JSON.stringify({ section, id, status })
      });
      const json = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setMessage(json.error || 'Status update failed. / 状态更新失败。');
        return;
      }
      setMessage('CMS status updated and audited. / CMS 状态已更新并写入审计。');
      await load(section);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Status update failed. / 状态更新失败。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="Live Website CMS Core / 真实网站 CMS 核心" subtitle="Connected to Supabase website pages, content blocks, public intake, leads, uploads and publish audit logs. / 已接入网站页面、内容区块、公开入口、线索、上传审核和发布审计日志。">
      <div id="page-content" className="scroll-mt-32 space-y-5">
        {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950 ring-1 ring-blue-100">{message}</div> : null}
        {payload.errors?.length ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 ring-1 ring-amber-100">Some sources returned warnings. / 部分数据源有警告：{payload.errors.map((item) => `${item.key}: ${item.error}`).join(' | ')}</div> : null}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search website CMS, forms, leads, uploads... / 搜索网站 CMS、表单、线索、上传..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-activeBlue focus:ring-2 focus:ring-blue-100" />
          <button type="button" onClick={() => load(section)} disabled={loading} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">{loading ? 'Loading...' : 'Refresh / 刷新'}</button>
        </div>

        <div id="navigation-menu" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(payload.sections || []).map((item) => (
            <button key={item.key} type="button" onClick={() => chooseSection(item.key)} className={`rounded-3xl p-5 text-left shadow-soft ring-1 transition hover:-translate-y-0.5 hover:ring-activeBlue ${section === item.key ? 'bg-blue-50 ring-activeBlue' : 'bg-white ring-slate-200'}`}>
              <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-slate-900">{item.label}</div><div className="text-xs font-semibold text-slate-500">{item.zh}</div></div><Badge tone={item.error ? 'red' : item.tone}>{item.error ? 'Check' : 'Live'}</Badge></div>
              <div className="mt-4 text-4xl font-black tracking-tight text-slate-950">{item.count}</div>
              <div className="mt-2 text-xs font-black text-activeBlue">Click to show records / 点击查看记录</div>
            </button>
          ))}
        </div>

        <div id="homepage-content" className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Create CMS Draft / 新增 CMS 草稿</div>
          <div className="mt-4 grid gap-3 xl:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
            <select value={newType} onChange={(event) => setNewType(event.target.value === 'block' ? 'block' : 'page')} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-activeBlue"><option value="page">Page / 页面</option><option value="block">Block / 区块</option></select>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Title / 标题" />
            <input value={newType === 'page' ? slug : blockKey} onChange={(event) => newType === 'page' ? setSlug(event.target.value) : setBlockKey(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-activeBlue" placeholder={newType === 'page' ? 'Slug / 页面路径' : 'Block key / 区块键'} />
          </div>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-3 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-activeBlue" placeholder="Body / 正文" />
          <button type="button" disabled={loading} onClick={createCmsRecord} className="mt-3 rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Create Draft / 新建草稿</button>
        </div>

        <CmsRows rows={payload.selectedRows || []} section={section} onStatusUpdate={updateStatus} />
        <div className="text-xs font-bold text-slate-400">Generated at / 生成时间：{payload.generated_at || '—'}</div>
      </div>
    </SectionCard>
  );
}
