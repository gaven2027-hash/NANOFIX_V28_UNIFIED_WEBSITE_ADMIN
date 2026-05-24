'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { engineerPortalSections, type EngineerPortalSectionConfig } from '@/lib/nanofix/engineerPortalConfig';

type Row = Record<string, unknown>;
type Tab = 'jobs' | 'inspections' | 'checklists' | 'photos' | 'signatures' | 'access' | 'versions';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const jobStatuses = ['assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'rework_required', 'cancelled'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(active|assigned|arrived|in_progress|completed|approved|published|submitted)/i.test(s)) return 'green';
  if (/(scheduled|en_route|draft|pending|review|rescheduled)/i.test(s)) return 'amber';
  if (/(cancelled|rework|required|failed|rejected|archived)/i.test(s)) return 'red';
  return 'blue';
}

function SectionShortcutTabs({ activeSection }: { activeSection?: EngineerPortalSectionConfig | null }) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {engineerPortalSections.map((section) => (
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
    ['jobs', 'Jobs / Field Board', '工单/现场看板'],
    ['inspections', 'Inspections', '查验'],
    ['checklists', 'Checklists', '检查清单'],
    ['photos', 'Photos', '照片'],
    ['signatures', 'Signatures', '签名'],
    ['access', 'Access Scope', '访问范围'],
    ['versions', 'Versions', '版本']
  ];
  return <div className="mb-5 grid gap-2 md:grid-cols-7">{tabs.map(([key, title, zh]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${active === key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}><span className="block">{title}</span><span className="block text-xs font-semibold text-slate-500">{zh}</span></button>)}</div>;
}

function GenericTable({ title, subtitle, rows, empty }: { title: string; subtitle: string; rows: Row[]; empty: string }) {
  const keys = rows[0] ? Object.keys(rows[0]).slice(0, 7) : [];
  return <SectionCard title={title} subtitle={subtitle}><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{keys.length ? keys.map((key) => <th key={key} className="p-3">{key}</th>) : <th className="p-3">Records</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={String(row[Object.keys(row)[0]]) || index.toString()}>{keys.map((key) => <td key={key} className="max-w-56 truncate p-3 text-slate-700">{key.includes('status') ? <Badge tone={statusTone(row[key])}>{formatValue(row[key])}</Badge> : formatValue(row[key])}</td>)}</tr>)}{!rows.length ? <tr><td className="p-6 text-center text-sm font-bold text-slate-500">{empty}</td></tr> : null}</tbody></table></div></SectionCard>;
}

function JobEditor({ row, onSaved, onClose }: { row: Row | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || {});
  const [etaJson, setEtaJson] = useState('{}');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(row || {});
    setEtaJson(row?.eta_json ? JSON.stringify(row.eta_json, null, 2) : '{}');
    setMessage('');
  }, [row]);

  function parseEta() {
    try { return JSON.parse(etaJson || '{}'); } catch { return null; }
  }

  async function save() {
    if (!row?.job_id) { setMessage('Open a job before editing. / 请先打开工单。'); return; }
    const eta = parseEta();
    if (eta === null) { setMessage('ETA JSON is invalid. / ETA JSON 格式错误。'); return; }
    setSaving(true);
    const response = await fetch('/api/admin/engineer-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_job', job_id: row.job_id, status: form.status, scheduled_at: form.scheduled_at, notes: form.notes, completion_notes: form.completion_notes, eta_json: eta }) });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) { setMessage(json.error || 'Save failed. / 保存失败。'); return; }
    setMessage('Job updated. / 工单已更新。');
    onSaved();
  }

  return <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Job Detail / 工单详情</div><h3 className="mt-1 text-xl font-black text-slate-950">{row?.job_id ? String(row.job_id).slice(0, 8) : 'Open a job'}</h3></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button></div>{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<div className="grid gap-4 md:grid-cols-2"><label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={String(form.status || '')} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="">Select status</option>{jobStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label><span className={labelClass}>Scheduled At / 排期</span><input className={inputClass} value={String(form.scheduled_at || '')} onChange={(event) => setForm((current) => ({ ...current, scheduled_at: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Notes / 备注</span><textarea className={`${inputClass} min-h-24`} value={String(form.notes || '')} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Completion Notes / 完工备注</span><textarea className={`${inputClass} min-h-24`} value={String(form.completion_notes || '')} onChange={(event) => setForm((current) => ({ ...current, completion_notes: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>ETA JSON / 到场 ETA JSON</span><textarea className={`${inputClass} min-h-32 font-mono text-xs`} value={etaJson} onChange={(event) => setEtaJson(event.target.value)} /></label></div><button type="button" disabled={saving || !row?.job_id} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save Job / 保存工单</button></div>;
}

export function EngineerPortalWorkspace({ section }: { section?: EngineerPortalSectionConfig | null }) {
  const [activeTab, setActiveTab] = useState<Tab>(section?.tab || 'jobs');
  const [jobs, setJobs] = useState<Row[]>([]);
  const [inspections, setInspections] = useState<Row[]>([]);
  const [checklists, setChecklists] = useState<Row[]>([]);
  const [photos, setPhotos] = useState<Row[]>([]);
  const [signatures, setSignatures] = useState<Row[]>([]);
  const [warranties, setWarranties] = useState<Row[]>([]);
  const [engineers, setEngineers] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [jobId, setJobId] = useState('');
  const [selectedJob, setSelectedJob] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setActiveTab(section?.tab || 'jobs'); }, [section]);

  async function loadAll() {
    setLoading(true); setMessage('');
    const params = new URLSearchParams({ mode: 'all' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (engineerId) params.set('engineer_id', engineerId);
    if (jobId) params.set('job_id', jobId);
    if (section?.key) params.set('section_key', section.key);
    const response = await fetch(`/api/admin/engineer-portal?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) { setMessage(json.error || 'Load failed. / 加载失败。'); return; }
    setJobs(json.jobs || []); setInspections(json.inspections || []); setChecklists(json.checklists || []); setPhotos(json.photos || []); setSignatures(json.signatures || []); setWarranties(json.warranties || []); setEngineers(json.engineers || []); setVersions(json.versions || []);
  }

  useEffect(() => { void loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [section]);

  async function saveVersion(entity?: Row | null, entityType = 'engineer_portal_record') {
    const source = entity || selectedJob;
    const entityId = source?.job_id || source?.inspection_id || source?.checklist_id || source?.photo_id || source?.signature_id || source?.version_id;
    const response = await fetch('/api/admin/engineer-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_version', section_key: section?.key || activeTab, engineer_id: source?.engineer_id || engineerId, job_id: source?.job_id || jobId, entity_type: entityType, entity_id: entityId, status: 'approved', snapshot_json: { section_key: section?.key, active_tab: activeTab, entity: source, created_at: new Date().toISOString() } }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) { setMessage(json.error || 'Save version failed. / 保存版本失败。'); return; }
    setMessage(`Engineer Portal version saved as v${json.version?.version_no}. / 已保存工程师门户版本 v${json.version?.version_no}。`); await loadAll();
  }

  return <div><SectionShortcutTabs activeSection={section} />{section ? <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Engineer Portal Admin Section / 工程师门户管理二级栏目</div><h3 className="mt-1 text-2xl font-black text-slate-950">{section.title} / {section.zh}</h3><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{section.helper}</p><div className="mt-3 flex flex-wrap gap-2"><Badge tone="blue">Admin-side engineer management</Badge><Badge tone="green">Assigned job filtering</Badge><Badge tone="amber">Standalone portal: /portal/engineer</Badge></div></div> : null}<Tabs active={activeTab} onChange={setActiveTab} />{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<SectionCard title="Engineer Portal Control / 工程师门户控制台" subtitle="Admin-side engineer portal data view. Use Engineer ID and Job ID to filter field records. / 管理员侧工程师门户数据视图，可用工程师ID和工单ID筛选现场记录。"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_240px_220px_auto_auto]"><input className={inputClass} placeholder="Search jobs, notes, captions... / 搜索" value={search} onChange={(event) => setSearch(event.target.value)} /><input className={inputClass} placeholder="Engineer ID / 工程师ID" value={engineerId} onChange={(event) => setEngineerId(event.target.value)} /><input className={inputClass} placeholder="Job ID / 工单ID" value={jobId} onChange={(event) => setJobId(event.target.value)} /><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses / 全部状态</option>{[...jobStatuses, 'scheduled', 'submitted', 'approved', 'rejected', 'active', 'expired'].map((s) => <option key={s} value={s}>{s}</option>)}</select><button type="button" onClick={loadAll} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button><button type="button" onClick={() => saveVersion(null)} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">Save Version / 保存版本</button></div></SectionCard>

  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><section>{activeTab === 'jobs' ? <SectionCard title="Jobs / Field Work Board / 工单现场看板" subtitle="Real jobs table with clickable rows for status, ETA and completion updates. / 真实 jobs 表，可打开编辑状态、ETA 和完工备注。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Job</th><th className="p-3">Engineer</th><th className="p-3">Scheduled</th><th className="p-3">Notes</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{jobs.map((job) => <tr key={String(job.job_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(job.status)}>{formatValue(job.status)}</Badge></td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(job.job_id)}</td><td className="p-3 text-slate-600">{formatValue(job.engineer_id)}</td><td className="p-3 text-slate-600">{formatValue(job.scheduled_at)}</td><td className="max-w-md truncate p-3 text-slate-700">{formatValue(job.notes || job.completion_notes)}</td><td className="p-3"><button type="button" onClick={() => { setSelectedJob(job); setJobId(String(job.job_id || '')); setEngineerId(String(job.engineer_id || '')); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}{!jobs.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No jobs. / 暂无工单。'}</td></tr> : null}</tbody></table></div></SectionCard> : null}{activeTab === 'inspections' ? <GenericTable title="Site Inspections / 现场查验" subtitle="Real inspections records." rows={inspections} empty="No inspections. / 暂无查验。" /> : null}{activeTab === 'checklists' ? <GenericTable title="Job Checklists / 工单检查清单" subtitle="Real job_checklists records." rows={checklists} empty="No checklists. / 暂无检查清单。" /> : null}{activeTab === 'photos' ? <GenericTable title="Job Photos / 工单照片" subtitle="Real job_photos records." rows={photos} empty="No photos. / 暂无照片。" /> : null}{activeTab === 'signatures' ? <GenericTable title="Customer Signatures / 客户签名" subtitle="Real customer_signatures records." rows={signatures} empty="No signatures. / 暂无签名。" /> : null}{activeTab === 'access' ? <GenericTable title="Engineer Access Scope / 工程师访问范围" subtitle="Profiles with engineer/admin roles. Plain passwords are never visible." rows={engineers} empty="No engineer profiles. / 暂无工程师账号。" /> : null}{activeTab === 'versions' ? <GenericTable title="Engineer Portal Versions / 工程师门户版本" subtitle="Engineer portal version snapshots." rows={versions} empty="No versions. / 暂无版本。" /> : null}</section>{activeTab === 'jobs' ? <JobEditor row={selectedJob} onSaved={loadAll} onClose={() => setSelectedJob(null)} /> : <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><h3 className="text-lg font-black text-slate-950">Linked Warranties / 关联保修</h3><p className="mt-2 text-sm text-slate-600">Filtered by Job ID where available. / 可按工单ID筛选。</p><div className="mt-4 grid max-h-[560px] gap-2 overflow-y-auto">{warranties.map((warranty) => <button key={String(warranty.warranty_id)} type="button" onClick={() => saveVersion(warranty, 'warranty')} className="rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm hover:border-activeBlue hover:bg-blue-50"><span className="block font-black text-slate-900">{formatValue(warranty.coverage)}</span><span className="block text-xs font-semibold text-slate-500">{formatValue(warranty.status)} · {formatValue(warranty.ends_on)}</span></button>)}{!warranties.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No warranties. / 暂无保修。</div> : null}</div></section>}</div></div>;
}
