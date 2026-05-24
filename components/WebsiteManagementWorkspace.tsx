'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { websiteSections, type WebsiteSectionConfig } from '@/lib/nanofix/websiteManagementConfig';

type Row = Record<string, unknown>;
type Tab = 'pages' | 'blocks' | 'publish';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const pageStatuses = ['draft', 'published', 'archived'];
const blockStatuses = ['draft', 'pending_review', 'published', 'archived'];
const contentTypes = ['hero', 'section', 'card_grid', 'faq', 'cta', 'seo', 'form', 'json'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (s === 'published' || s === 'approved') return 'green';
  if (s === 'draft' || s === 'pending_review') return 'amber';
  if (s === 'archived' || s === 'rejected') return 'red';
  return 'blue';
}

function safeJsonString(value: unknown) {
  if (!value) return '{}';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJsonInput(value: string) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return null;
  }
}

function sectionDefaultJson(section?: WebsiteSectionConfig | null) {
  if (!section) return {};
  return {
    section_key: section.key,
    title: section.title,
    title_zh: section.zh,
    helper: section.helper,
    editable_from_admin: true,
    notes: 'This CMS block is editable from NANOFIX Website Management. Public website wiring can read this block by route_path + block_key.'
  };
}

function SectionShortcutTabs({ activeSection }: { activeSection?: WebsiteSectionConfig | null }) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {websiteSections.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${activeSection?.key === section.key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}
        >
          <span className="block">{section.title}</span>
          <span className="block text-xs font-semibold text-slate-500">{section.zh}</span>
        </Link>
      ))}
    </div>
  );
}

function PortalTabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<[Tab, string, string]> = [
    ['pages', 'Pages & SEO', '页面与 SEO'],
    ['blocks', 'Content Blocks', '内容区块'],
    ['publish', 'Publish Versions', '发布版本']
  ];
  return (
    <div className="mb-5 grid gap-2 md:grid-cols-3">
      {tabs.map(([key, title, zh]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${active === key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}
        >
          <span className="block">{title}</span>
          <span className="block text-xs font-semibold text-slate-500">{zh}</span>
        </button>
      ))}
    </div>
  );
}

function PageEditor({ row, onSaved, onClose, section }: { row: Row | null; onSaved: () => void; onClose: () => void; section?: WebsiteSectionConfig | null }) {
  const [form, setForm] = useState<Row>(row || { route_path: section?.defaultRoutePath || '/', title: section?.title || '', description: section?.helper || '', status: 'draft', metadata: sectionDefaultJson(section) });
  const [metadata, setMetadata] = useState(safeJsonString(row?.metadata || sectionDefaultJson(section)));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(row || { route_path: section?.defaultRoutePath || '/', title: section?.title || '', description: section?.helper || '', status: 'draft', metadata: sectionDefaultJson(section) });
    setMetadata(safeJsonString(row?.metadata || sectionDefaultJson(section)));
    setMessage('');
  }, [row, section]);

  async function save() {
    const parsed = parseJsonInput(metadata);
    if (parsed === null) {
      setMessage('Metadata JSON is invalid. / Metadata JSON 格式错误。');
      return;
    }
    setSaving(true);
    const action = row ? 'update_page' : 'create_page';
    const payload = { ...form, metadata: parsed, action, page_id: row?.page_id };
    const response = await fetch('/api/admin/website-management', {
      method: row ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    setMessage('Saved. / 已保存。');
    onSaved();
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit Page' : 'New Page'}</div>
          <h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.title) : `Create ${section?.title || 'Website Page'}`}</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button>
      </div>
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className={labelClass}>Route Path / 页面路径</span>
          <input className={inputClass} value={String(form.route_path || '')} onChange={(event) => setForm((current) => ({ ...current, route_path: event.target.value }))} placeholder="/" />
        </label>
        <label>
          <span className={labelClass}>Status / 状态</span>
          <select className={inputClass} value={String(form.status || 'draft')} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            {pageStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="md:col-span-2">
          <span className={labelClass}>Title / 标题</span>
          <input className={inputClass} value={String(form.title || '')} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label className="md:col-span-2">
          <span className={labelClass}>Description / 描述</span>
          <textarea className={`${inputClass} min-h-24`} value={String(form.description || '')} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </label>
        <label className="md:col-span-2">
          <span className={labelClass}>Metadata JSON / SEO 与页面元数据</span>
          <textarea className={`${inputClass} min-h-40 font-mono text-xs`} value={metadata} onChange={(event) => setMetadata(event.target.value)} />
        </label>
      </div>
      <button type="button" disabled={saving} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save Page / 保存页面</button>
    </div>
  );
}

function BlockEditor({ row, routePath, onSaved, onClose, section }: { row: Row | null; routePath: string; onSaved: () => void; onClose: () => void; section?: WebsiteSectionConfig | null }) {
  const defaultBlockKey = section?.key || 'main';
  const defaultContentType = section?.blockType || 'section';
  const [form, setForm] = useState<Row>(row || { route_path: routePath || section?.defaultRoutePath || '/', locale: 'en', block_key: defaultBlockKey, content_type: defaultContentType, status: 'draft', content_json: sectionDefaultJson(section) });
  const [contentJson, setContentJson] = useState(safeJsonString(row?.content_json || sectionDefaultJson(section)));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(row || { route_path: routePath || section?.defaultRoutePath || '/', locale: 'en', block_key: defaultBlockKey, content_type: defaultContentType, status: 'draft', content_json: sectionDefaultJson(section) });
    setContentJson(safeJsonString(row?.content_json || sectionDefaultJson(section)));
    setMessage('');
  }, [row, routePath, section, defaultBlockKey, defaultContentType]);

  async function save() {
    const parsed = parseJsonInput(contentJson);
    if (parsed === null) {
      setMessage('Content JSON is invalid. / 内容 JSON 格式错误。');
      return;
    }
    setSaving(true);
    const action = row ? 'update_block' : 'create_block';
    const payload = { ...form, content_json: parsed, action, block_id: row?.block_id };
    const response = await fetch('/api/admin/website-management', {
      method: row ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    setMessage('Saved. / 已保存。');
    onSaved();
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit Block' : 'New Block'}</div>
          <h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.block_key) : `Create ${section?.title || 'Content Block'}`}</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button>
      </div>
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className={labelClass}>Route Path / 页面路径</span>
          <input className={inputClass} value={String(form.route_path || '')} onChange={(event) => setForm((current) => ({ ...current, route_path: event.target.value }))} />
        </label>
        <label>
          <span className={labelClass}>Locale / 语言</span>
          <input className={inputClass} value={String(form.locale || 'en')} onChange={(event) => setForm((current) => ({ ...current, locale: event.target.value }))} />
        </label>
        <label>
          <span className={labelClass}>Block Key / 区块键名</span>
          <input className={inputClass} value={String(form.block_key || '')} onChange={(event) => setForm((current) => ({ ...current, block_key: event.target.value }))} />
        </label>
        <label>
          <span className={labelClass}>Content Type / 内容类型</span>
          <select className={inputClass} value={String(form.content_type || 'section')} onChange={(event) => setForm((current) => ({ ...current, content_type: event.target.value }))}>
            {contentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span className={labelClass}>Status / 状态</span>
          <select className={inputClass} value={String(form.status || 'draft')} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            {blockStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="md:col-span-2">
          <span className={labelClass}>Content JSON / 内容 JSON</span>
          <textarea className={`${inputClass} min-h-56 font-mono text-xs`} value={contentJson} onChange={(event) => setContentJson(event.target.value)} />
        </label>
      </div>
      <button type="button" disabled={saving} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save Block / 保存区块</button>
    </div>
  );
}

export function WebsiteManagementWorkspace({ section }: { section?: WebsiteSectionConfig | null }) {
  const [activeTab, setActiveTab] = useState<Tab>((section?.tab === 'publish' ? 'publish' : section?.tab === 'blocks' ? 'blocks' : 'pages'));
  const [pages, setPages] = useState<Row[]>([]);
  const [blocks, setBlocks] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [search, setSearch] = useState(section?.key || '');
  const [status, setStatus] = useState('');
  const [routePath, setRoutePath] = useState(section?.defaultRoutePath || '');
  const [selectedPage, setSelectedPage] = useState<Row | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Row | null>(null);
  const [creatingPage, setCreatingPage] = useState(false);
  const [creatingBlock, setCreatingBlock] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveTab(section?.tab === 'publish' ? 'publish' : section?.tab === 'blocks' ? 'blocks' : 'pages');
    setSearch(section?.key || '');
    setRoutePath(section?.defaultRoutePath || '');
    setSelectedPage(null);
    setSelectedBlock(null);
    setCreatingPage(false);
    setCreatingBlock(false);
  }, [section]);

  const selectedRoute = useMemo(() => routePath || String(selectedPage?.route_path || selectedBlock?.route_path || section?.defaultRoutePath || ''), [routePath, selectedPage, selectedBlock, section]);

  async function loadAll() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ mode: 'all' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (selectedRoute) params.set('route_path', selectedRoute);
    const response = await fetch(`/api/admin/website-management?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    setPages(json.pages || []);
    setBlocks(json.blocks || []);
    setVersions(json.versions || []);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  async function publishRoute() {
    const target = selectedRoute || '/';
    setMessage('');
    const response = await fetch('/api/admin/website-management', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish_route', route_path: target, locale: 'en' })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Publish failed. / 发布失败。');
      return;
    }
    setMessage(`Published ${target} as version ${json.version?.version_no}. / 已发布版本 ${json.version?.version_no}。`);
    await loadAll();
  }

  return (
    <div>
      <SectionShortcutTabs activeSection={section} />
      {section ? (
        <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Website Management Section / 网站后台二级栏目</div>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{section.title} / {section.zh}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{section.helper}</p>
        </div>
      ) : null}
      <PortalTabs active={activeTab} onChange={setActiveTab} />
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <SectionCard title="Website CMS Control Center / 网站 CMS 控制中心" subtitle="Manage real CMS data in Supabase: website_pages, website_content_blocks and website_publish_versions. / 管理 Supabase 真实 CMS 数据。">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto]">
          <input className={inputClass} placeholder="Search route, title, description, block key... / 搜索" value={search} onChange={(event) => setSearch(event.target.value)} />
          <input className={inputClass} placeholder="Route filter / 页面路径" value={routePath} onChange={(event) => setRoutePath(event.target.value)} />
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses / 全部状态</option>
            {[...new Set([...pageStatuses, ...blockStatuses])].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={loadAll} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
          <button type="button" onClick={publishRoute} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">Publish Route / 发布页面</button>
        </div>
      </SectionCard>

      {activeTab === 'pages' ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <SectionCard title="Pages & SEO / 页面与 SEO" subtitle="Create and edit route-level page metadata. / 新增和编辑页面级元数据。">
            <div className="mb-3 flex justify-end">
              <button type="button" onClick={() => { setCreatingPage(true); setSelectedPage(null); }} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white">New Page / 新增页面</button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[820px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Route</th><th className="p-3">Title</th><th className="p-3">Updated</th><th className="p-3">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {pages.map((page) => (
                    <tr key={String(page.page_id)} className="hover:bg-blue-50/50">
                      <td className="p-3"><Badge tone={statusTone(page.status)}>{formatValue(page.status)}</Badge></td>
                      <td className="p-3 font-bold text-slate-800">{formatValue(page.route_path)}</td>
                      <td className="max-w-80 truncate p-3 font-semibold text-slate-700">{formatValue(page.title)}</td>
                      <td className="p-3 text-slate-500">{formatValue(page.updated_at)}</td>
                      <td className="p-3"><button type="button" onClick={() => { setSelectedPage(page); setCreatingPage(false); setRoutePath(String(page.route_path || '')); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td>
                    </tr>
                  ))}
                  {!pages.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No pages yet. / 暂无页面。'}</td></tr> : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <PageEditor row={creatingPage ? null : selectedPage} section={section} onSaved={loadAll} onClose={() => { setSelectedPage(null); setCreatingPage(false); }} />
        </div>
      ) : null}

      {activeTab === 'blocks' ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
          <SectionCard title="Content Blocks / 内容区块" subtitle="Edit CMS content blocks. Frontend pages can consume these blocks by route_path + block_key. / 编辑 CMS 内容区块，前台可按路径和键名读取。">
            <div className="mb-3 flex justify-end">
              <button type="button" onClick={() => { setCreatingBlock(true); setSelectedBlock(null); }} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white">New Block / 新增区块</button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[920px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Route</th><th className="p-3">Block Key</th><th className="p-3">Type</th><th className="p-3">Version</th><th className="p-3">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {blocks.map((block) => (
                    <tr key={String(block.block_id)} className="hover:bg-blue-50/50">
                      <td className="p-3"><Badge tone={statusTone(block.status)}>{formatValue(block.status)}</Badge></td>
                      <td className="p-3 font-bold text-slate-800">{formatValue(block.route_path)}</td>
                      <td className="p-3 font-semibold text-slate-700">{formatValue(block.block_key)}</td>
                      <td className="p-3 text-slate-600">{formatValue(block.content_type)}</td>
                      <td className="p-3 text-slate-600">{formatValue(block.published_version)}</td>
                      <td className="p-3"><button type="button" onClick={() => { setSelectedBlock(block); setCreatingBlock(false); setRoutePath(String(block.route_path || '')); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td>
                    </tr>
                  ))}
                  {!blocks.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No blocks yet. / 暂无区块。'}</td></tr> : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <BlockEditor row={creatingBlock ? null : selectedBlock} section={section} routePath={selectedRoute || '/'} onSaved={loadAll} onClose={() => { setSelectedBlock(null); setCreatingBlock(false); }} />
        </div>
      ) : null}

      {activeTab === 'publish' ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <SectionCard title="Publish Versions / 发布版本" subtitle="Every Publish Route action stores a snapshot for rollback and audit review. / 每次发布都会保存快照，便于回滚和审计。">
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[820px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Route</th><th className="p-3">Locale</th><th className="p-3">Version</th><th className="p-3">Published At</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {versions.map((version) => (
                    <tr key={String(version.version_id)}>
                      <td className="p-3 font-bold text-slate-800">{formatValue(version.route_path)}</td>
                      <td className="p-3 text-slate-600">{formatValue(version.locale)}</td>
                      <td className="p-3"><Badge tone="green">v{formatValue(version.version_no)}</Badge></td>
                      <td className="p-3 text-slate-500">{formatValue(version.published_at)}</td>
                    </tr>
                  ))}
                  {!versions.length ? <tr><td colSpan={4} className="p-6 text-center text-sm font-bold text-slate-500">No publish versions yet. / 暂无发布版本。</td></tr> : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <h3 className="text-lg font-black text-slate-950">Public Website Connection / 前台网站连接</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">This phase creates the real CMS admin workflow. The next phase should connect selected public website sections to read published CMS snapshots or content blocks without changing the approved visual layout.</p>
            <Link href="/" className="mt-4 inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-700">Open Public Website / 打开官网</Link>
          </section>
        </div>
      ) : null}
    </div>
  );
}
