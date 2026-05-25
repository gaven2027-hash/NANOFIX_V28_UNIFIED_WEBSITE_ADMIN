'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;
type ResolutionStatus = 'open' | 'investigating' | 'resolved' | 'ignored' | 'escalated';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const resolutionStatuses: ResolutionStatus[] = ['open', 'investigating', 'resolved', 'ignored', 'escalated'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '').toLowerCase();
  if (/(healthy|active|enabled|success|ok|resolved)/.test(s)) return 'green';
  if (/(degraded|pending|warning|unknown|open|investigating)/.test(s)) return 'amber';
  if (/(failed|down|disabled|error|critical|escalated)/.test(s)) return 'red';
  return 'blue';
}

export function ModuleHealthWorkspace() {
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get('module_key') || '';
  const [search, setSearch] = useState(moduleKey);
  const [modules, setModules] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [selectedModule, setSelectedModule] = useState<Row | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Row | null>(null);
  const [moduleNote, setModuleNote] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<ResolutionStatus>('investigating');
  const [resolutionNote, setResolutionNote] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSearch(moduleKey); }, [moduleKey]);

  function chooseModule(row: Row | null) {
    setSelectedModule(row);
    setModuleNote(String(row?.admin_note || ''));
  }

  function chooseEvent(row: Row | null) {
    setSelectedEvent(row);
    setResolutionStatus(String(row?.resolution_status || 'investigating') as ResolutionStatus);
    setResolutionNote(String(row?.resolution_note || ''));
  }

  async function load() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ mode: 'health' });
    if (search) params.set('search', search);
    const response = await fetch(`/api/admin/system-settings?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    const nextModules = json.health?.modules || [];
    const nextEvents = json.health?.events || [];
    setModules(nextModules);
    setEvents(nextEvents);
    const moduleMatch = moduleKey ? nextModules.find((row: Row) => String(row.module_key) === moduleKey) : null;
    chooseModule(moduleMatch || nextModules[0] || null);
    chooseEvent(nextEvents[0] || null);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [moduleKey]);

  const openedModule = useMemo(() => {
    if (!moduleKey) return selectedModule;
    return modules.find((row) => String(row.module_key) === moduleKey) || selectedModule;
  }, [modules, moduleKey, selectedModule]);

  async function saveModuleNote() {
    if (!selectedModule?.module_key) {
      setMessage('Select a module first. / 请先选择模块。');
      return;
    }
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/review-actions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_module_note', module_key: selectedModule.module_key, admin_note: moduleNote })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    chooseModule(json.record || selectedModule);
    setMessage('Module note saved and audit log recorded. / 模块备注已保存并写入审计日志。');
    await load();
  }

  async function updateEvent(nextStatus?: ResolutionStatus) {
    if (!selectedEvent?.health_event_id) {
      setMessage('Select a health event first. / 请先选择健康事件。');
      return;
    }
    const finalStatus = nextStatus || resolutionStatus;
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/review-actions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_health_event', health_event_id: selectedEvent.health_event_id, resolution_status: finalStatus, resolution_note: resolutionNote })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    chooseEvent(json.record || selectedEvent);
    setMessage('Health event resolution saved and audit log recorded. / 健康事件处理结果已保存并写入审计日志。');
    await load();
  }

  return (
    <div>
      {openedModule ? (
        <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-blue-100">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Opened from Dashboard / 来自仪表盘跳转</div>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{formatValue(openedModule.name || openedModule.module_key)}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={tone(openedModule.health_status)}>{formatValue(openedModule.health_status)}</Badge>
            <Badge tone={openedModule.enabled ? 'green' : 'red'}>{openedModule.enabled ? 'enabled' : 'disabled'}</Badge>
            <Badge tone="blue">{formatValue(openedModule.category)}</Badge>
            <Badge tone="amber">{formatValue(openedModule.criticality)}</Badge>
          </div>
        </div>
      ) : null}

      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <SectionCard title="Module Health Checks / 模块健康检查" subtitle="Search and inspect module health records. Dashboard links can open one module directly. / 搜索并查看模块健康状态，仪表盘链接可直接打开对应模块。">
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search module key, name, health status... / 搜索模块" />
          <button type="button" onClick={load} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Health</th><th className="p-3">Module</th><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Criticality</th><th className="p-3">Enabled</th><th className="p-3">Updated</th><th className="p-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((row) => <tr key={String(row.module_key)} className={String(row.module_key) === moduleKey || selectedModule?.module_key === row.module_key ? 'bg-blue-50' : 'hover:bg-blue-50/50'}><td className="p-3"><Badge tone={tone(row.health_status)}>{formatValue(row.health_status)}</Badge></td><td className="p-3 font-black text-slate-800">{formatValue(row.module_key)}</td><td className="p-3 text-slate-700">{formatValue(row.name)}</td><td className="p-3 text-slate-600">{formatValue(row.category)}</td><td className="p-3 text-slate-600">{formatValue(row.criticality)}</td><td className="p-3"><Badge tone={row.enabled ? 'green' : 'red'}>{row.enabled ? 'enabled' : 'disabled'}</Badge></td><td className="p-3 text-slate-500">{formatValue(row.updated_at)}</td><td className="p-3"><button type="button" onClick={() => chooseModule(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}
              {!modules.length ? <tr><td colSpan={8} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No module health records. / 暂无模块健康记录。'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {selectedModule ? <div className="mt-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Module Admin Note / 模块管理备注</div><h3 className="mt-1 text-xl font-black text-slate-950">{formatValue(selectedModule.name || selectedModule.module_key)}</h3><label className="mt-4 block"><span className={labelClass}>Admin Note / 管理备注</span><textarea className={`${inputClass} min-h-24`} value={moduleNote} onChange={(event) => setModuleNote(event.target.value)} placeholder="Record degradation reason, recovery plan or owner note. / 记录降级原因、恢复计划或负责人备注。" /></label><button disabled={saving} type="button" onClick={saveModuleNote} className="mt-3 rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save Module Note / 保存模块备注</button></div> : null}

      <div className="mt-5">
        <SectionCard title="Health Events / 健康事件" subtitle="Recent module health events filtered by the same search. / 根据相同搜索条件显示最近健康事件。">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Resolution</th><th className="p-3">Status</th><th className="p-3">Module</th><th className="p-3">Check</th><th className="p-3">Message</th><th className="p-3">Latency</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((row) => <tr key={String(row.health_event_id)} className={selectedEvent?.health_event_id === row.health_event_id ? 'bg-blue-50' : 'hover:bg-blue-50/50'}><td className="p-3"><Badge tone={tone(row.resolution_status)}>{formatValue(row.resolution_status || 'open')}</Badge></td><td className="p-3"><Badge tone={tone(row.status)}>{formatValue(row.status)}</Badge></td><td className="p-3 font-black text-slate-800">{formatValue(row.module_key)}</td><td className="p-3 text-slate-700">{formatValue(row.check_name)}</td><td className="max-w-md truncate p-3 text-slate-600">{formatValue(row.message)}</td><td className="p-3 text-slate-600">{formatValue(row.latency_ms)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td><td className="p-3"><button type="button" onClick={() => chooseEvent(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}
                {!events.length ? <tr><td colSpan={8} className="p-6 text-center text-sm font-bold text-slate-500">No health events. / 暂无健康事件。</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {selectedEvent ? <div className="mt-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Event Resolution / 事件处理</div><h3 className="mt-1 text-xl font-black text-slate-950">{formatValue(selectedEvent.module_key)} / {formatValue(selectedEvent.check_name)}</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><label><span className={labelClass}>Resolution Status / 处理状态</span><select className={inputClass} value={resolutionStatus} onChange={(event) => setResolutionStatus(event.target.value as ResolutionStatus)}>{resolutionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><div className="rounded-2xl bg-slate-50 p-3"><div className={labelClass}>Event Status / 事件状态</div><Badge tone={tone(selectedEvent.status)}>{formatValue(selectedEvent.status)}</Badge></div></div><label className="mt-4 block"><span className={labelClass}>Resolution Note / 处理备注</span><textarea className={`${inputClass} min-h-24`} value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Write investigation result, fix note or escalation reason. / 填写调查结果、修复备注或升级原因。" /></label><div className="mt-3 flex flex-wrap gap-2"><button disabled={saving} type="button" onClick={() => updateEvent('investigating')} className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-100 hover:bg-amber-100 disabled:opacity-60">Investigating / 调查中</button><button disabled={saving} type="button" onClick={() => updateEvent('resolved')} className="rounded-2xl bg-green-50 px-4 py-2 text-sm font-black text-green-700 ring-1 ring-green-100 hover:bg-green-100 disabled:opacity-60">Resolved / 已解决</button><button disabled={saving} type="button" onClick={() => updateEvent('escalated')} className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:opacity-60">Escalate / 升级</button><button disabled={saving} type="button" onClick={() => updateEvent('ignored')} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-100 hover:bg-slate-100 disabled:opacity-60">Ignore / 忽略</button><button disabled={saving} type="button" onClick={() => updateEvent()} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save Note / 保存备注</button></div></div> : null}
    </div>
  );
}
