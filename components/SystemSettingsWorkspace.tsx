'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { systemSettingsSections, type SystemSettingsSectionConfig } from '@/lib/nanofix/systemSettingsConfig';

type Row = Record<string, unknown>;
type Tab = 'records' | 'audit' | 'health' | 'backup' | 'rbac' | 'versions';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const statuses = ['draft', 'active', 'pending_review', 'approved', 'archived', 'disabled', 'failed', 'healthy', 'degraded'];
const categories = ['all', 'company', 'brand', 'integrations', 'supabase', 'deployment', 'search', 'qr', 'backup', 'backup_schedule', 'restore', 'rbac', 'roles', 'audit', 'privacy', 'retention', 'breach', 'health', 'environment'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(active|approved|published|healthy|completed|enabled|success)/i.test(s)) return 'green';
  if (/(draft|pending|scheduled|running|degraded|unknown|review)/i.test(s)) return 'amber';
  if (/(archived|disabled|failed|down|cancelled|error|suspended)/i.test(s)) return 'red';
  return 'blue';
}

function safeJsonString(value: unknown) {
  if (!value) return '{}';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJsonInput(value: string) {
  try { return JSON.parse(value || '{}'); } catch { return null; }
}

function sectionDefaultJson(section?: SystemSettingsSectionConfig | null) {
  if (!section) return {};
  return {
    section_key: section.key,
    category: section.category,
    title: section.title,
    title_zh: section.zh,
    helper: section.helper,
    is_sensitive: section.sensitive,
    secret_values_stored_here: false,
    notes: 'Store references, policy and configuration notes only. Raw secret keys must remain in Vercel/Supabase server-only environment variables.'
  };
}

function SectionShortcutTabs({ activeSection }: { activeSection?: SystemSettingsSectionConfig | null }) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {systemSettingsSections.map((section) => (
        <Link key={section.key} href={section.href} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${activeSection?.key === section.key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}>
          <span className="block">{section.title}</span>
          <span className="block text-xs font-semibold text-slate-500">{section.zh}</span>
        </Link>
      ))}
    </div>
  );
}

function Tabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<[Tab, string, string]> = [
    ['records', 'Settings Records', '设置记录'],
    ['backup', 'Backup Center', '备份中心'],
    ['rbac', 'RBAC / Roles', '权限/角色'],
    ['audit', 'Audit Logs', '审计日志'],
    ['health', 'Health Checks', '健康检查'],
    ['versions', 'Version Snapshots', '版本快照']
  ];
  return <div className="mb-5 grid gap-2 md:grid-cols-6">{tabs.map(([key, title, zh]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${active === key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}><span className="block">{title}</span><span className="block text-xs font-semibold text-slate-500">{zh}</span></button>)}</div>;
}

function RecordEditor({ row, section, onSaved, onClose }: { row: Row | null; section?: SystemSettingsSectionConfig | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || { section_key: section?.key || 'company-settings', category: section?.category || 'general', title: section?.title || '', body: '', status: 'draft', is_sensitive: section?.sensitive || false, config_json: sectionDefaultJson(section) });
  const [configJson, setConfigJson] = useState(safeJsonString(row?.config_json || sectionDefaultJson(section)));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(row || { section_key: section?.key || 'company-settings', category: section?.category || 'general', title: section?.title || '', body: '', status: 'draft', is_sensitive: section?.sensitive || false, config_json: sectionDefaultJson(section) });
    setConfigJson(safeJsonString(row?.config_json || sectionDefaultJson(section)));
    setMessage('');
  }, [row, section]);

  async function save() {
    const parsed = parseJsonInput(configJson);
    if (parsed === null) { setMessage('Config JSON is invalid. / 配置 JSON 格式错误。'); return; }
    setSaving(true);
    const response = await fetch('/api/admin/system-settings', { method: row ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, config_json: parsed, action: row ? 'update_record' : 'create_record', record_id: row?.record_id }) });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) { setMessage(json.error || 'Save failed. / 保存失败。'); return; }
    setMessage('Saved. / 已保存。');
    onSaved();
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit Setting Record' : 'New Setting Record'}</div><h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.title) : `Create ${section?.title || 'Setting Record'}`}</h3></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button></div>
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className={labelClass}>Section Key / 栏目键名</span><input className={inputClass} value={String(form.section_key || '')} onChange={(event) => setForm((current) => ({ ...current, section_key: event.target.value }))} /></label>
        <label><span className={labelClass}>Category / 分类</span><select className={inputClass} value={String(form.category || 'general')} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{categories.filter((c) => c !== 'all').map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={String(form.status || 'draft')} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="flex items-end gap-3 rounded-2xl border border-slate-200 p-3"><input type="checkbox" checked={Boolean(form.is_sensitive)} onChange={(event) => setForm((current) => ({ ...current, is_sensitive: event.target.checked }))} /><span className="text-sm font-black text-slate-700">Sensitive metadata / 敏感配置标记</span></label>
        <label className="md:col-span-2"><span className={labelClass}>Title / 标题</span><input className={inputClass} value={String(form.title || '')} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Body / 内容</span><textarea className={`${inputClass} min-h-28`} value={String(form.body || '')} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Config JSON / 配置 JSON</span><textarea className={`${inputClass} min-h-44 font-mono text-xs`} value={configJson} onChange={(event) => setConfigJson(event.target.value)} /></label>
      </div>
      <button type="button" disabled={saving} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save Record / 保存记录</button>
    </div>
  );
}

export function SystemSettingsWorkspace({ section }: { section?: SystemSettingsSectionConfig | null }) {
  const [activeTab, setActiveTab] = useState<Tab>(section?.tab || 'records');
  const [records, setRecords] = useState<Row[]>([]);
  const [audit, setAudit] = useState<Row[]>([]);
  const [backup, setBackup] = useState<{ jobs: Row[]; schedules: Row[] }>({ jobs: [], schedules: [] });
  const [health, setHealth] = useState<{ modules: Row[]; events: Row[] }>({ modules: [], events: [] });
  const [rbac, setRbac] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [search, setSearch] = useState(section?.key || '');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState(section?.category || 'all');
  const [selectedRecord, setSelectedRecord] = useState<Row | null>(null);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setActiveTab(section?.tab || 'records'); setSearch(section?.key || ''); setCategory(section?.category || 'all'); setSelectedRecord(null); setCreatingRecord(false); }, [section]);

  async function loadAll() {
    setLoading(true); setMessage('');
    const params = new URLSearchParams({ mode: 'all' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (section?.key) params.set('section_key', section.key);
    if (category) params.set('category', category);
    const response = await fetch(`/api/admin/system-settings?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) { setMessage(json.error || 'Load failed. / 加载失败。'); return; }
    setRecords(json.records || []); setAudit(json.audit || []); setBackup(json.backup || { jobs: [], schedules: [] }); setHealth(json.health || { modules: [], events: [] }); setRbac(json.rbac || []); setVersions(json.versions || []);
  }

  useEffect(() => { void loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [section]);

  async function saveVersion(row?: Row | null) {
    const source = row || selectedRecord;
    const response = await fetch('/api/admin/system-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_version', record_id: source?.record_id, section_key: section?.key || 'general', status: 'approved', snapshot_json: { section_key: section?.key, category, source, secret_values_stored_here: false, created_at: new Date().toISOString() } }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) { setMessage(json.error || 'Save version failed. / 保存版本失败。'); return; }
    setMessage(`System setting version saved as v${json.version?.version_no}. / 已保存系统设置版本 v${json.version?.version_no}。`); await loadAll();
  }

  return <div><SectionShortcutTabs activeSection={section} />{section ? <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">System Settings Section / 系统设置二级栏目</div><h3 className="mt-1 text-2xl font-black text-slate-950">{section.title} / {section.zh}</h3><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{section.helper}</p><div className="mt-3 flex flex-wrap gap-2"><Badge tone="blue">Category: {section.category}</Badge>{section.sensitive ? <Badge tone="red">Sensitive: no raw secrets</Badge> : <Badge tone="green">Non-sensitive</Badge>}<Badge tone="amber">Audit log enabled</Badge></div></div> : null}<Tabs active={activeTab} onChange={setActiveTab} />{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<SectionCard title="System Settings Control / 系统设置控制台" subtitle="Manage settings records, backup jobs, RBAC summaries, audit logs, health checks and version snapshots. / 管理设置记录、备份、权限、审计、健康检查和版本快照。"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto]"><input className={inputClass} placeholder="Search settings, audit, modules... / 搜索" value={search} onChange={(event) => setSearch(event.target.value)} /><select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses / 全部状态</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select><button type="button" onClick={loadAll} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button><button type="button" onClick={() => saveVersion()} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">Save Version / 保存版本</button></div></SectionCard>

  {activeTab === 'records' ? <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]"><SectionCard title="Settings Records / 设置记录" subtitle="Create and edit system settings metadata. Raw API keys and service-role keys must not be stored here. / 新增和编辑系统设置元数据，不存储明文密钥。"><div className="mb-3 flex justify-end"><button type="button" onClick={() => { setCreatingRecord(true); setSelectedRecord(null); }} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white">New Record / 新增记录</button></div><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Sensitive</th><th className="p-3">Section</th><th className="p-3">Category</th><th className="p-3">Title</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((r) => <tr key={String(r.record_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(r.status)}>{formatValue(r.status)}</Badge></td><td className="p-3"><Badge tone={r.is_sensitive ? 'red' : 'green'}>{r.is_sensitive ? 'sensitive' : 'normal'}</Badge></td><td className="p-3 text-slate-600">{formatValue(r.section_key)}</td><td className="p-3 text-slate-600">{formatValue(r.category)}</td><td className="p-3 font-bold text-slate-800">{formatValue(r.title)}</td><td className="p-3"><button type="button" onClick={() => { setSelectedRecord(r); setCreatingRecord(false); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}{!records.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No setting records yet. / 暂无设置记录。'}</td></tr> : null}</tbody></table></div></SectionCard><RecordEditor row={creatingRecord ? null : selectedRecord} section={section} onSaved={loadAll} onClose={() => { setSelectedRecord(null); setCreatingRecord(false); }} /></div> : null}

  {activeTab === 'backup' ? <div className="mt-5 grid gap-5"><SectionCard title="Backup Jobs / 备份任务" subtitle="Review encrypted backup jobs and module backup schedules. / 查看加密备份任务和模块备份计划。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Module</th><th className="p-3">Cron</th><th className="p-3">File</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{backup.jobs.map((job) => <tr key={String(job.backup_id)}><td className="p-3"><Badge tone={statusTone(job.status)}>{formatValue(job.status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(job.module)}</td><td className="p-3 text-slate-600">{formatValue(job.schedule_cron)}</td><td className="max-w-md truncate p-3 text-slate-600">{formatValue(job.encrypted_file_path)}</td><td className="p-3 text-slate-500">{formatValue(job.created_at)}</td></tr>)}{!backup.jobs.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">No backup jobs yet. / 暂无备份任务。</td></tr> : null}</tbody></table></div></SectionCard><SectionCard title="Backup Schedules / 备份计划" subtitle="Per-module schedule configuration stored in backup_schedules. / 每个模块的备份计划。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Enabled</th><th className="p-3">Module</th><th className="p-3">Frequency</th><th className="p-3">Run Time</th><th className="p-3">Retention</th><th className="p-3">Next Run</th></tr></thead><tbody className="divide-y divide-slate-100">{backup.schedules.map((s) => <tr key={String(s.module)}><td className="p-3"><Badge tone={s.enabled ? 'green' : 'red'}>{s.enabled ? 'enabled' : 'disabled'}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(s.module)}</td><td className="p-3 text-slate-600">{formatValue(s.frequency)}</td><td className="p-3 text-slate-600">{formatValue(s.exact_run_time)} {formatValue(s.timezone)}</td><td className="p-3 text-slate-600">{formatValue(s.retention_days)} days</td><td className="p-3 text-slate-500">{formatValue(s.next_run_at)}</td></tr>)}{!backup.schedules.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">No backup schedules yet. / 暂无备份计划。</td></tr> : null}</tbody></table></div></SectionCard></div> : null}

  {activeTab === 'rbac' ? <div className="mt-5"><SectionCard title="RBAC / Roles / 权限与角色" subtitle="Review profiles role, active state and password status. Plain passwords are never visible. / 查看角色、激活状态和密码状态，绝不显示明文密码。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[850px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Active</th><th className="p-3">Role</th><th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Password</th><th className="p-3">Updated</th></tr></thead><tbody className="divide-y divide-slate-100">{rbac.map((p) => <tr key={String(p.profile_id)}><td className="p-3"><Badge tone={p.is_active ? 'green' : 'red'}>{p.is_active ? 'active' : 'inactive'}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(p.role)}</td><td className="p-3 text-slate-600">{formatValue(p.email)}</td><td className="p-3 text-slate-600">{formatValue(p.full_name)}</td><td className="p-3"><Badge tone="blue">{formatValue(p.password_status)}</Badge></td><td className="p-3 text-slate-500">{formatValue(p.updated_at)}</td></tr>)}{!rbac.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">No profiles found. / 暂无账号资料。</td></tr> : null}</tbody></table></div></SectionCard></div> : null}

  {activeTab === 'audit' ? <div className="mt-5"><SectionCard title="Audit Logs / 审计日志" subtitle="Search audit logs by actor, action and object type. / 按操作者、动作和对象类型搜索审计日志。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Role</th><th className="p-3">Action</th><th className="p-3">Object</th><th className="p-3">Object ID</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{audit.map((a) => <tr key={String(a.audit_id)}><td className="p-3"><Badge tone="blue">{formatValue(a.actor_role)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(a.action)}</td><td className="p-3 text-slate-600">{formatValue(a.object_type)}</td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(a.object_id)}</td><td className="p-3 text-slate-500">{formatValue(a.created_at)}</td></tr>)}{!audit.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">No audit logs yet. / 暂无审计日志。</td></tr> : null}</tbody></table></div></SectionCard></div> : null}

  {activeTab === 'health' ? <div className="mt-5 grid gap-5"><SectionCard title="Module Health / 模块健康" subtitle="Review app_modules health status. / 查看模块健康状态。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Health</th><th className="p-3">Module</th><th className="p-3">Name</th><th className="p-3">Criticality</th><th className="p-3">Enabled</th></tr></thead><tbody className="divide-y divide-slate-100">{health.modules.map((m) => <tr key={String(m.module_key)}><td className="p-3"><Badge tone={statusTone(m.health_status)}>{formatValue(m.health_status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(m.module_key)}</td><td className="p-3 text-slate-600">{formatValue(m.name)}</td><td className="p-3 text-slate-600">{formatValue(m.criticality)}</td><td className="p-3"><Badge tone={m.enabled ? 'green' : 'red'}>{m.enabled ? 'enabled' : 'disabled'}</Badge></td></tr>)}{!health.modules.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">No module health records. / 暂无模块健康记录。</td></tr> : null}</tbody></table></div></SectionCard><SectionCard title="Health Events / 健康事件" subtitle="Recent module_health_events records. / 最近模块健康事件。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Module</th><th className="p-3">Check</th><th className="p-3">Message</th><th className="p-3">Latency</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{health.events.map((e) => <tr key={String(e.health_event_id)}><td className="p-3"><Badge tone={statusTone(e.status)}>{formatValue(e.status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(e.module_key)}</td><td className="p-3 text-slate-600">{formatValue(e.check_name)}</td><td className="max-w-md truncate p-3 text-slate-600">{formatValue(e.message)}</td><td className="p-3 text-slate-600">{formatValue(e.latency_ms)}</td><td className="p-3 text-slate-500">{formatValue(e.created_at)}</td></tr>)}{!health.events.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">No health events. / 暂无健康事件。</td></tr> : null}</tbody></table></div></SectionCard></div> : null}

  {activeTab === 'versions' ? <div className="mt-5"><SectionCard title="Version Snapshots / 版本快照" subtitle="Save system setting snapshots for audit and rollback. / 保存系统设置快照，便于审计和回滚。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Section</th><th className="p-3">Version</th><th className="p-3">Published</th></tr></thead><tbody className="divide-y divide-slate-100">{versions.map((v) => <tr key={String(v.version_id)}><td className="p-3"><Badge tone={statusTone(v.status)}>{formatValue(v.status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(v.section_key)}</td><td className="p-3"><Badge tone="green">v{formatValue(v.version_no)}</Badge></td><td className="p-3 text-slate-500">{formatValue(v.published_at)}</td></tr>)}{!versions.length ? <tr><td colSpan={4} className="p-6 text-center text-sm font-bold text-slate-500">No versions yet. / 暂无版本。</td></tr> : null}</tbody></table></div></SectionCard></div> : null}
  </div>;
}
