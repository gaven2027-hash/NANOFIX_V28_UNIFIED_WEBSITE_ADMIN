'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { boardLanes, operationModules, type OperationModuleKey } from '@/lib/nanofix/operationsConfig';

type BadgeTone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';
type Row = Record<string, unknown>;
type PublicModuleConfig = {
  key: OperationModuleKey;
  title: string;
  zh: string;
  primaryKey: string;
  route: string;
  statusOptions: string[];
  formFields: Array<{ name: string; label: string; type?: string; required?: boolean; options?: string[] }>;
  summaryFields: string[];
  boardLane: string;
};

type WorkspaceProps = {
  moduleKey?: OperationModuleKey;
  mode?: 'board' | 'module';
};

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toInputValue(value: unknown, type?: string) {
  if (value === null || value === undefined) return '';
  if (type === 'datetime-local') {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  }
  return String(value);
}

function pickTitle(row: Row, config: PublicModuleConfig) {
  const candidates = ['name', 'contact_name', 'invoice_no', 'booking_type', 'issue_type', 'coverage', 'transaction_id', config.primaryKey];
  return candidates.map((key) => row[key]).find(Boolean) || row[config.primaryKey] || 'Record';
}

function toneForStatus(status: string): BadgeTone {
  if (/(new|pending|draft|scheduled|assigned)/i.test(status)) return 'amber';
  if (/(completed|paid|active|accepted|succeeded|confirmed|approved|converted)/i.test(status)) return 'green';
  if (/(cancelled|void|failed|lost|rejected|expired|no_show)/i.test(status)) return 'red';
  return 'blue';
}

function parseJsonObject(value: unknown): Row | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Row;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Row;
    } catch {
      return null;
    }
  }
  return null;
}

function sourceMessageFromLead(row: Row | null, config: PublicModuleConfig) {
  if (!row || config.key !== 'leads') return null;
  const data = parseJsonObject(row.ai_extracted_data);
  const messageId = data?.message_id || data?.source_message_id;
  if (!messageId && data?.source !== 'social_message') return null;
  return {
    messageId: messageId ? String(messageId) : '',
    source: formatValue(data?.source || 'social_message'),
    channel: formatValue(data?.channel || row.source_platform),
    direction: formatValue(data?.direction),
    risk: formatValue(data?.risk_level),
    createdFrom: formatValue(data?.created_from),
    body: formatValue(row.message)
  };
}

function SourceMessageCard({ row, config }: { row: Row | null; config: PublicModuleConfig }) {
  const source = sourceMessageFromLead(row, config);
  if (!source) return null;
  return (
    <div className="mb-5 rounded-3xl bg-blue-50 p-4 ring-1 ring-blue-100">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Source Message / 来源消息</div>
      <div className="mt-2 grid gap-3 text-sm md:grid-cols-2">
        <div><span className={labelClass}>Source / 来源</span><div className="font-black text-slate-800">{source.source}</div></div>
        <div><span className={labelClass}>Channel / 渠道</span><div className="font-black text-slate-800">{source.channel}</div></div>
        <div><span className={labelClass}>Risk / 风险</span><Badge tone={toneForStatus(source.risk)}>{source.risk}</Badge></div>
        <div><span className={labelClass}>Message ID</span><div className="break-all font-mono text-xs font-bold text-slate-600">{source.messageId || '—'}</div></div>
        <div className="md:col-span-2"><span className={labelClass}>Original / 原始消息</span><div className="rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-blue-100">{source.body}</div></div>
      </div>
      {source.messageId ? (
        <Link href={`/social-media/messages-inbox?message_id=${encodeURIComponent(source.messageId)}`} className="mt-4 inline-flex rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700">
          Open Source Message / 打开来源消息
        </Link>
      ) : null}
    </div>
  );
}

function LeadConversionCard({ row, config, saving, onConvert }: { row: Row | null; config: PublicModuleConfig; saving: boolean; onConvert: () => void }) {
  if (!row || config.key !== 'leads') return null;
  return (
    <div className="mb-5 rounded-3xl bg-green-50 p-4 ring-1 ring-green-100">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Lead Conversion / 线索转换</div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
        Convert this lead into a Service Request for booking, inspection and quotation workflow. / 将此线索转换为报修单，进入预约、查验和报价流程。
      </p>
      <button
        type="button"
        disabled={saving}
        onClick={onConvert}
        className="mt-4 rounded-2xl bg-green-600 px-4 py-2 text-sm font-black text-white hover:bg-green-700 disabled:opacity-60"
      >
        Create Service Request / 创建报修单
      </button>
    </div>
  );
}

function ServiceRequestProgressionCard({ row, config, saving, onCreateBooking, onCreateInspection }: { row: Row | null; config: PublicModuleConfig; saving: boolean; onCreateBooking: () => void; onCreateInspection: () => void }) {
  if (!row || config.key !== 'service-requests') return null;
  return (
    <div className="mb-5 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-100">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Next Step / 下一步流程</div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
        Move this service request into site booking and inspection workflow. / 将此报修单推进到预约和现场查验流程。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={onCreateBooking} className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60">
          Create Booking / 创建预约
        </button>
        <button type="button" disabled={saving} onClick={onCreateInspection} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">
          Create Inspection / 创建查验
        </button>
      </div>
    </div>
  );
}

function ModuleTabs({ activeKey }: { activeKey?: OperationModuleKey }) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {operationModules.map((module) => (
        <Link
          key={module.key}
          href={module.route}
          className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${activeKey === module.key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}
        >
          <span className="block">{module.title}</span>
          <span className="block text-xs font-semibold text-slate-500">{module.zh}</span>
        </Link>
      ))}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: PublicModuleConfig['formFields'][number]; value: unknown; onChange: (value: string) => void }) {
  if (field.type === 'textarea') {
    return <textarea className={`${inputClass} min-h-24`} value={toInputValue(value)} onChange={(event) => onChange(event.target.value)} />;
  }
  if (field.type === 'select') {
    return (
      <select className={inputClass} value={toInputValue(value)} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select / 选择</option>
        {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }
  return <input className={inputClass} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'datetime-local' ? 'datetime-local' : 'text'} value={toInputValue(value, field.type)} onChange={(event) => onChange(event.target.value)} />;
}

function DetailPanel({ config, row, onClose, onSaved }: { config: PublicModuleConfig; row: Row | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Row>(() => row || {});
  const [status, setStatus] = useState(String(row?.status || ''));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(row || {});
    setStatus(String(row?.status || ''));
    setReason('');
    setMessage('');
  }, [row]);

  async function saveRecord() {
    setSaving(true);
    setMessage('');
    const endpoint = '/api/admin/service-operations';
    const method = row ? 'PATCH' : 'POST';
    const payload = row ? { module: config.key, id: row[config.primaryKey], data: form } : { module: config.key, data: form };
    const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    setMessage('Saved. / 已保存。');
    onSaved();
  }

  async function updateStatus() {
    if (!row || !status) return;
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/service-operations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: config.key, id: row[config.primaryKey], status, reason })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Status update failed. / 状态修改失败。');
      return;
    }
    setMessage('Status updated and audit log written. / 状态已修改并写入审计日志。');
    onSaved();
  }

  async function convertLeadToServiceRequest() {
    if (!row?.lead_id) return;
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/lead-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_service_request', lead_id: row.lead_id })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Failed to create service request. / 创建报修单失败。');
      return;
    }
    const serviceRequestId = json.service_request?.service_request_id;
    setMessage(json.existing ? 'Existing service request opened. / 已打开现有报修单。' : 'Service request created. / 报修单已创建。');
    onSaved();
    if (serviceRequestId && typeof window !== 'undefined') {
      window.location.assign(`/service-operations/service-requests?open=${encodeURIComponent(String(serviceRequestId))}`);
    }
  }

  async function progressServiceRequest(action: 'create_booking' | 'create_inspection') {
    if (!row?.service_request_id) return;
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/request-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, service_request_id: row.service_request_id })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Failed to create next step. / 创建下一步失败。');
      return;
    }
    onSaved();
    if (action === 'create_booking') {
      const bookingId = json.booking?.booking_id;
      setMessage(json.existing ? 'Existing booking opened. / 已打开现有预约。' : 'Booking created. / 预约已创建。');
      if (bookingId && typeof window !== 'undefined') window.location.assign(`/service-operations/bookings?open=${encodeURIComponent(String(bookingId))}`);
    } else {
      const inspectionId = json.inspection?.inspection_id;
      setMessage(json.existing ? 'Existing inspection opened. / 已打开现有查验。' : 'Inspection created. / 查验已创建。');
      if (inspectionId && typeof window !== 'undefined') window.location.assign(`/service-operations/inspections?open=${encodeURIComponent(String(inspectionId))}`);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'View / Edit Detail' : 'New Record'}</div>
          <h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(pickTitle(row, config)) : `Create ${config.title}`}</h3>
          {row ? <p className="mt-1 break-all text-xs font-semibold text-slate-500">{config.primaryKey}: {formatValue(row[config.primaryKey])}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button>
      </div>

      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <SourceMessageCard row={row} config={config} />
      <LeadConversionCard row={row} config={config} saving={saving} onConvert={convertLeadToServiceRequest} />
      <ServiceRequestProgressionCard row={row} config={config} saving={saving} onCreateBooking={() => progressServiceRequest('create_booking')} onCreateInspection={() => progressServiceRequest('create_inspection')} />

      <div className="grid gap-4 md:grid-cols-2">
        {config.formFields.map((field) => (
          <label key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
            <span className={labelClass}>{field.label}{field.required ? ' *' : ''}</span>
            <FieldInput field={field} value={form[field.name]} onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))} />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={saving} onClick={saveRecord} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save / 保存</button>
        {row ? (
          <>
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700" value={status} onChange={(event) => setStatus(event.target.value)}>
              {config.statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input className="min-w-60 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700" placeholder="Reason / 状态修改原因" value={reason} onChange={(event) => setReason(event.target.value)} />
            <button type="button" disabled={saving} onClick={updateStatus} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-700 disabled:opacity-60">Update Status / 修改状态</button>
          </>
        ) : null}
      </div>

      {row ? (
        <div className="mt-5 rounded-2xl bg-adminBg p-4">
          <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Raw Detail / 原始详情</div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs font-semibold leading-5 text-slate-600">{JSON.stringify(row, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}

function ModuleWorkspace({ moduleKey }: { moduleKey: OperationModuleKey }) {
  const searchParams = useSearchParams();
  const openId = searchParams.get('open');
  const [rows, setRows] = useState<Row[]>([]);
  const [config, setConfig] = useState<PublicModuleConfig | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadRows() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ module: moduleKey });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const response = await fetch(`/api/admin/service-operations?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setError(json.error || 'Load failed. / 加载失败。');
      return;
    }
    const nextRows = (json.rows || []) as Row[];
    const nextConfig = json.config as PublicModuleConfig;
    setRows(nextRows);
    setConfig(nextConfig);
    if (openId) {
      const target = nextRows.find((row) => String(row[nextConfig.primaryKey]) === openId);
      if (target) {
        setSelected(target);
        setCreating(false);
      }
    }
  }

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, openId]);

  const visibleColumns = useMemo(() => config?.summaryFields || [], [config]);

  if (!config) {
    return <div className="rounded-3xl bg-white p-6 text-sm font-bold text-slate-600 shadow-soft ring-1 ring-slate-200">Loading module... / 正在加载模块...</div>;
  }

  return (
    <div>
      <ModuleTabs activeKey={moduleKey} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard title={`${config.title} / ${config.zh}`} subtitle="Real Supabase list, search, filter, detail, create, edit and status updates. / 真实 Supabase 列表、搜索、筛选、详情、新增、编辑和状态修改。">
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
            <input className={inputClass} placeholder="Search name, phone, issue, invoice no... / 搜索" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses / 全部状态</option>
              {config.statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <button type="button" onClick={loadRows} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
            <button type="button" onClick={() => { setCreating(true); setSelected(null); }} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">New / 新增</button>
          </div>

          {error ? <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">{error}</div> : null}

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Status / 状态</th>
                  {visibleColumns.map((column) => <th key={column} className="p-3">{column}</th>)}
                  <th className="p-3">Action / 操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={String(row[config.primaryKey])} className="hover:bg-blue-50/50">
                    <td className="p-3"><Badge tone={toneForStatus(String(row.status || ''))}>{formatValue(row.status)}</Badge></td>
                    {visibleColumns.map((column) => <td key={column} className="max-w-56 truncate p-3 font-semibold text-slate-700">{formatValue(row[column])}</td>)}
                    <td className="p-3"><button type="button" onClick={() => { setSelected(row); setCreating(false); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr><td colSpan={visibleColumns.length + 2} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading... / 加载中...' : 'No records yet. Use New to create one. / 暂无记录，可点击新增。'}</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <DetailPanel config={config} row={creating ? null : selected} onClose={() => { setSelected(null); setCreating(false); }} onSaved={loadRows} />
      </div>
    </div>
  );
}

function BoardWorkspace() {
  const [modules, setModules] = useState<Array<{ config: PublicModuleConfig; rows: Row[]; error?: string | null }>>([]);
  const [loading, setLoading] = useState(false);

  async function loadBoard() {
    setLoading(true);
    const response = await fetch('/api/admin/service-operations?board=1', { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (response.ok && json.ok) setModules(json.modules || []);
  }

  useEffect(() => {
    void loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <ModuleTabs />
      <SectionCard title="Dispatch & Field Work Board / 派工与现场作业看板" subtitle="Real board grouped by Lead → Inspection → Quotation → Work Execution → Finance → Warranty. / 按真实业务链路分组的看板。">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-600">Cards are clickable and open their real module detail page. / 卡片可点击进入真实模块详情页。</p>
          <button type="button" onClick={loadBoard} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700">Refresh / 刷新</button>
        </div>
        <div className="grid gap-4 xl:grid-cols-6">
          {boardLanes.map((lane) => {
            const laneModules = modules.filter((module) => module.config.boardLane === lane);
            const laneRows = laneModules.flatMap((module) => module.rows.map((row) => ({ row, config: module.config })));
            return (
              <div key={lane} className="rounded-3xl border border-slate-200 bg-adminBg p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-slate-900">{lane}</h4>
                  <Badge tone={laneRows.length ? 'blue' : 'gray'}>{laneRows.length}</Badge>
                </div>
                <div className="space-y-2">
                  {laneRows.slice(0, 12).map(({ row, config }) => (
                    <Link key={`${config.key}-${String(row[config.primaryKey])}`} href={`${config.route}?open=${String(row[config.primaryKey])}`} className="block rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-blue-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-900">{formatValue(pickTitle(row, config))}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{config.title}</div>
                        </div>
                        <Badge tone={toneForStatus(String(row.status || ''))}>{formatValue(row.status)}</Badge>
                      </div>
                      <div className="mt-2 break-all text-[11px] font-semibold text-slate-400">{String(row[config.primaryKey]).slice(0, 8)}...</div>
                    </Link>
                  ))}
                  {!laneRows.length ? <div className="rounded-2xl bg-white/70 p-3 text-xs font-bold text-slate-400">{loading ? 'Loading...' : 'No cards / 暂无卡片'}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

export function ServiceOperationsWorkspace({ moduleKey, mode = moduleKey ? 'module' : 'board' }: WorkspaceProps) {
  if (mode === 'module' && moduleKey) return <ModuleWorkspace moduleKey={moduleKey} />;
  return <BoardWorkspace />;
}
