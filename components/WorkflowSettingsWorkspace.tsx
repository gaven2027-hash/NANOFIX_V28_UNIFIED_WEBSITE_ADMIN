'use client';

import { useEffect, useMemo, useState } from 'react';

type WorkflowSetting = {
  setting_id?: string;
  setting_key?: string | null;
  setting_type?: string | null;
  name?: string | null;
  description?: string | null;
  value_json?: Record<string, unknown> | null;
  is_enabled?: boolean | null;
  updated_at?: string | null;
};

type ApiPayload = Record<string, unknown>;
type State = { loading: boolean; refreshedAt: string | null; settings: WorkflowSetting[]; errors: string[] };
type SaveState = { loading: boolean; message: string | null; error: string | null };

const typeCards = [
  { id: 'automation_rule_setting', title: 'Automation Rule Settings', zh: '自动化规则设置', anchor: 'automation-rule-settings', note: 'Safe write policy, rule activation behaviour and audit requirement defaults.' },
  { id: 'notification_channel', title: 'Notification Channel Settings', zh: '通知渠道设置', anchor: 'notification-channel-settings', note: 'Internal, email and future WhatsApp delivery policy, retries and acknowledgement requirements.' },
  { id: 'unified_task_sla', title: 'Unified Task SLA Settings', zh: '统一任务 SLA 设置', anchor: 'unified-task-sla-settings', note: 'Priority-based due time, escalation timing and default owner routing.' }
];

function listFromPayload<T>(payload: ApiPayload | null, key: string): T[] {
  const value = payload?.[key];
  return Array.isArray(value) ? value as T[] : [];
}

function errorsFromPayload(payload: ApiPayload | null): string[] {
  const errors = payload?.errors;
  if (Array.isArray(errors)) return errors.filter((item): item is string => typeof item === 'string');
  const error = payload?.error;
  return typeof error === 'string' ? [error] : [];
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function prettyJson(value: Record<string, unknown> | null | undefined) {
  return JSON.stringify(value ?? {}, null, 2);
}

async function fetchSettings(): Promise<{ ok: boolean; payload: ApiPayload | null; error: string | null }> {
  try {
    const response = await fetch('/api/admin/workflow-settings', { credentials: 'same-origin', cache: 'no-store' });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try { payload = text ? JSON.parse(text) as ApiPayload : null; } catch { payload = null; }
    const payloadErrors = errorsFromPayload(payload);
    const ok = response.ok && payload?.ok !== false;
    return { ok, payload, error: ok ? null : `/api/admin/workflow-settings returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}` };
  } catch (error) {
    return { ok: false, payload: null, error: `/api/admin/workflow-settings failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function patchSetting(setting: WorkflowSetting): Promise<{ ok: boolean; error: string | null }> {
  try {
    const response = await fetch('/api/admin/workflow-settings', {
      method: 'PATCH',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ setting_id: setting.setting_id, setting_key: setting.setting_key, is_enabled: !setting.is_enabled, value_json: setting.value_json ?? {} })
    });
    const text = await response.text();
    let payload: ApiPayload | null = null;
    try { payload = text ? JSON.parse(text) as ApiPayload : null; } catch { payload = null; }
    const payloadErrors = errorsFromPayload(payload);
    const ok = response.ok && payload?.ok !== false;
    return { ok, error: ok ? null : `PATCH /api/admin/workflow-settings returned ${response.status}${payloadErrors.length ? `: ${payloadErrors.join('; ')}` : ''}` };
  } catch (error) {
    return { ok: false, error: `PATCH /api/admin/workflow-settings failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function WorkflowSettingsWorkspace() {
  const [state, setState] = useState<State>({ loading: true, refreshedAt: null, settings: [], errors: [] });
  const [selectedType, setSelectedType] = useState('automation_rule_setting');
  const [saveState, setSaveState] = useState<SaveState>({ loading: false, message: null, error: null });
  const selectedCard = typeCards.find((card) => card.id === selectedType) ?? typeCards[0];
  const filtered = useMemo(() => state.settings.filter((setting) => setting.setting_type === selectedType), [state.settings, selectedType]);

  async function loadSettings() {
    setState((current) => ({ ...current, loading: true }));
    const result = await fetchSettings();
    setState({
      loading: false,
      refreshedAt: new Date().toISOString(),
      settings: listFromPayload<WorkflowSetting>(result.payload, 'settings'),
      errors: result.error ? [result.error] : []
    });
  }

  async function toggleSetting(setting: WorkflowSetting) {
    setSaveState({ loading: true, message: null, error: null });
    const result = await patchSetting(setting);
    if (!result.ok) {
      setSaveState({ loading: false, message: null, error: result.error ?? 'Workflow setting update failed.' });
      return;
    }
    setSaveState({ loading: false, message: 'Workflow setting updated and Audit Logs written. / 工作流设置已更新并写入审计日志。', error: null });
    await loadSettings();
  }

  useEffect(() => { void loadSettings(); }, []);

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-gradient-to-br from-sky-500 via-cyan-300 to-blue-600 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/80">V28.2 System Settings Binding / 系统设置绑定</div>
            <h2 className="mt-2 text-2xl font-black">Workflow Settings Workspace</h2>
            <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-white/90">Manage automation rule policy, notification channels and unified task SLA settings from real Supabase-backed data. / 从真实 Supabase 数据管理自动化规则策略、通知渠道和统一任务 SLA 设置。</p>
          </div>
          <button type="button" onClick={() => void loadSettings()} className="rounded-2xl bg-white/20 px-3 py-2 text-xs font-black ring-1 ring-white/30 hover:bg-white/30">{state.loading ? 'Loading… / 读取中' : 'Refresh settings / 刷新设置'}</button>
        </div>
      </div>
      <div className="p-6">
        <div className={`mb-5 rounded-3xl p-4 ring-1 ${state.errors.length ? 'bg-amber-50 text-amber-950 ring-amber-200' : 'bg-emerald-50 text-emerald-950 ring-emerald-200'}`}>
          <div className="text-sm font-black">{state.errors.length ? 'Settings API degraded / 设置 API 降级' : 'Settings live binding ready / 设置真实数据绑定正常'}</div>
          <p className="mt-1 text-xs font-semibold leading-5">Live source: /api/admin/workflow-settings. Last refresh / 上次刷新: {formatDate(state.refreshedAt)}</p>
          {state.errors.length ? <div className="mt-2 grid gap-2">{state.errors.map((error) => <div key={error} className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold">{error}</div>)}</div> : null}
        </div>
        {saveState.message || saveState.error || saveState.loading ? <div className={`mb-5 rounded-3xl p-4 text-xs font-bold ring-1 ${saveState.error ? 'bg-red-50 text-red-950 ring-red-200' : 'bg-blue-50 text-blue-950 ring-blue-200'}`}>{saveState.loading ? 'Saving setting… / 正在保存设置…' : saveState.error ?? saveState.message}</div> : null}
        <div className="grid gap-3 lg:grid-cols-3">
          {typeCards.map((card) => (
            <button key={card.id} id={card.anchor} type="button" onClick={() => setSelectedType(card.id)} className={`scroll-mt-40 rounded-3xl p-4 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${selectedType === card.id ? 'bg-blue-50 ring-activeBlue' : 'bg-slate-50 ring-slate-200'}`}>
              <div className="text-xs font-black uppercase tracking-[0.14em] text-activeBlue">{card.title}</div>
              <h3 className="mt-2 text-lg font-black text-slate-950">{card.zh}</h3>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{card.note}</p>
              <div className="mt-3 text-xs font-black text-slate-500">{state.settings.filter((setting) => setting.setting_type === card.id).length} records / 条设置</div>
            </button>
          ))}
        </div>
        <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200">
          <div className="bg-slate-50 px-5 py-4">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{selectedCard.title}</div>
            <p className="mt-1 text-sm font-semibold text-slate-600">{selectedCard.zh} · {selectedCard.note}</p>
          </div>
          <div className="grid grid-cols-[1fr_120px_110px] gap-3 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1.2fr_1fr_120px_110px]"><span>Setting / 设置</span><span className="hidden md:block">Value JSON / 配置</span><span>Status</span><span>Action</span></div>
          {filtered.length ? filtered.map((setting) => (
            <div key={setting.setting_id ?? setting.setting_key ?? setting.name} className="grid grid-cols-[1fr_120px_110px] gap-3 border-t border-slate-200 px-5 py-4 text-sm md:grid-cols-[1.2fr_1fr_120px_110px]">
              <span><span className="block font-black text-slate-950">{setting.name}</span><span className="mt-1 block text-xs font-bold text-activeBlue">{setting.setting_key}</span><span className="mt-2 block text-xs font-semibold text-slate-500">{setting.description}</span><span className="mt-1 block text-xs font-bold text-slate-400">Updated / 更新: {formatDate(setting.updated_at)}</span></span>
              <pre className="hidden max-h-40 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 md:block">{prettyJson(setting.value_json)}</pre>
              <span className="font-black text-slate-700">{setting.is_enabled === false ? 'disabled' : 'enabled'}</span>
              <button type="button" disabled={saveState.loading} onClick={() => void toggleSetting(setting)} className="h-fit rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{setting.is_enabled === false ? 'Enable / 启用' : 'Disable / 停用'}</button>
            </div>
          )) : <div className="border-t border-slate-200 px-5 py-6 text-sm font-bold text-slate-500">No settings returned for this type. Apply migration 202605290002_v28_2_workflow_settings.sql if needed. / 此类型暂无设置，如有需要请先执行 migration。</div>}
        </div>
      </div>
    </section>
  );
}
