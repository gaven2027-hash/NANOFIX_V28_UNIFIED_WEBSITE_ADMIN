'use client';

import { useEffect, useMemo, useState } from 'react';
import { menu } from '@/data/adminNavigation';
import { getAdminModuleReality, type AdminModuleReality, type ModuleRealityStatus } from '@/data/adminModuleReality';

type Section = {
  id: string;
  href: string;
  title: string;
  zh: string;
  parentOrder: string;
  parentTitle: string;
  childOrder: string;
};

type WorkRow = {
  id: string;
  subject: string;
  owner: string;
  status: string;
  priority: string;
  next: string;
};

function basePath(href: string) {
  return href.split('#')[0] || '/admin';
}

function currentHash() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#/, '');
}

function modeCopy(status: ModuleRealityStatus) {
  if (status === 'live') return {
    label: 'Live / 真实模块',
    tone: 'bg-emerald-50 text-emerald-950 ring-emerald-200',
    button: 'bg-activeBlue text-white hover:bg-blue-700',
    note: 'Registry says this module has live server API/database binding. Production truth still depends on staging auth, Supabase migrations and Audit Logs verification. / 注册表标记为真实接口模块；生产真实性仍需通过 staging 登录、Supabase 迁移和 Audit Logs 验证。'
  };
  if (status === 'partial') return {
    label: 'Partial / 部分真实',
    tone: 'bg-amber-50 text-amber-950 ring-amber-200',
    button: 'bg-activeBlue text-white hover:bg-blue-700',
    note: 'Registry says this module has menu/page foundation and some real links, but not every right-side action is a complete live CRUD/write/audit workflow. / 注册表标记为部分真实：已有菜单/页面/部分链路，但右侧动作未全部形成真实 CRUD、写入和审计闭环。'
  };
  if (status === 'missing') return {
    label: 'Missing / 缺失',
    tone: 'bg-red-50 text-red-950 ring-red-200',
    button: 'bg-red-100 text-red-800 hover:bg-red-200',
    note: 'Registry says this module is missing or cannot be considered implemented. / 注册表标记为缺失或不能视为已实现。'
  };
  return {
    label: 'Contract / 契约占位',
    tone: 'bg-slate-50 text-slate-700 ring-slate-200',
    button: 'bg-slate-200 text-slate-700 hover:bg-slate-300',
    note: 'Registry says this is an OA/ERP contract scaffold. It is not a production write workflow until the listed APIs, tables and audits are implemented and verified. / 注册表标记为契约占位：在所列 API、表和审计实现并验证前，不代表真实生产写入流程。'
  };
}

function fallbackReality(section: Section): AdminModuleReality {
  return {
    href: section.href,
    status: 'contract',
    risk: 'P1',
    tables: ['to_be_defined'],
    apis: ['to_be_defined'],
    writeActions: ['to_be_defined'],
    auditActions: ['to_be_defined'],
    ownerRole: 'Super Admin',
    nextStep: 'Add this submodule to data/adminModuleReality.ts with real table/API/audit metadata before production use.',
    evidence: 'No registry entry found. Treated as contract scaffold by default.'
  };
}

function rowsFor(section: Section, reality: AdminModuleReality): WorkRow[] {
  return [
    {
      id: `${section.id}-tables`,
      subject: `Tables / 数据表: ${reality.tables.join(' + ') || 'Not defined'}`,
      owner: reality.ownerRole,
      status: reality.status,
      priority: reality.risk,
      next: reality.nextStep
    },
    {
      id: `${section.id}-apis`,
      subject: `APIs / 接口: ${reality.apis.join(' + ') || 'Not defined'}`,
      owner: reality.ownerRole,
      status: reality.status === 'live' ? 'verify_live' : 'needs_work',
      priority: reality.risk,
      next: reality.apis.length ? 'Verify route protection, request/response shape and Audit Logs.' : 'Create the missing API route before enabling production actions.'
    },
    {
      id: `${section.id}-audit`,
      subject: `Audit / 审计: ${reality.auditActions.join(' + ') || 'Not defined'}`,
      owner: reality.ownerRole,
      status: reality.auditActions.length ? 'audit_required' : 'audit_missing',
      priority: reality.risk,
      next: reality.auditActions.length ? 'Confirm the server API writes the listed Audit Log actions.' : 'Define and implement Audit Log actions.'
    }
  ];
}

function metricCards(reality: AdminModuleReality) {
  return [
    { label: 'Reality / 真实性', value: reality.status.toUpperCase(), tone: reality.status === 'live' ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : reality.status === 'partial' ? 'border-amber-400 bg-amber-50 text-amber-900' : reality.status === 'missing' ? 'border-red-400 bg-red-50 text-red-900' : 'border-slate-400 bg-slate-50 text-slate-900' },
    { label: 'Risk / 风险', value: reality.risk, tone: reality.risk === 'P0' ? 'border-red-400 bg-red-50 text-red-900' : reality.risk === 'P1' ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-sky-400 bg-sky-50 text-sky-900' },
    { label: 'APIs / 接口', value: String(reality.apis.length), tone: 'border-sky-400 bg-sky-50 text-sky-900' },
    { label: 'Audit / 审计', value: reality.auditActions.length ? 'Required' : 'Missing', tone: reality.auditActions.length ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-red-400 bg-red-50 text-red-900' }
  ];
}

export function AdminSubmoduleWorkspace({ route }: { route: string }) {
  const sections = useMemo<Section[]>(() => menu
    .filter((item) => basePath(item.href) === route)
    .flatMap((item) => item.children.map((child, index) => ({
      id: child.href.split('#')[1] || `${item.order}-${index + 1}`,
      href: child.href,
      title: child.title,
      zh: child.zh,
      parentOrder: item.order,
      parentTitle: item.title,
      childOrder: `${item.order}.${index + 1}`
    }))), [route]);

  const [activeId, setActiveId] = useState('');
  const [selectedRowId, setSelectedRowId] = useState('');
  const [auditTrail, setAuditTrail] = useState<string[]>([]);

  useEffect(() => {
    const applyHash = () => setActiveId(currentHash() || sections[0]?.id || '');
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [sections]);

  const active = sections.find((section) => section.id === activeId) || sections[0];
  const reality = active ? (getAdminModuleReality(active.href) ?? fallbackReality(active)) : null;
  const rows = active && reality ? rowsFor(active, reality) : [];
  const selected = rows.find((row) => row.id === selectedRowId) || rows[0];
  const mode = reality ? modeCopy(reality.status) : null;
  const metrics = reality ? metricCards(reality) : [];

  useEffect(() => {
    if (rows[0]?.id) setSelectedRowId(rows[0].id);
  }, [activeId]);

  if (!active || !reality || !selected || !mode) return null;

  function runAction(action: string) {
    const stamp = new Date().toLocaleString();
    const prefix = reality.status === 'live'
      ? 'Registry live marker only — use dedicated live workspace/API for real writes'
      : 'Registry non-live marker — no server write from this generic panel';
    setAuditTrail((items) => [`${stamp} — ${prefix} — ${action} — ${selected.id}`, ...items].slice(0, 6));
  }

  return (
    <section className="mt-6 w-full">
      <div className="space-y-5">
        <div id={active.id} className="scroll-mt-40 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-sky-500 via-cyan-300 to-blue-600 p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/80">{active.parentOrder}. {active.parentTitle}</div>
                <h2 className="mt-2 text-2xl font-black">{active.childOrder} {active.title}</h2>
                <p className="mt-1 text-sm font-bold text-white/85">{active.zh}</p>
              </div>
              <span className="rounded-2xl bg-white/20 px-3 py-2 text-xs font-black ring-1 ring-white/30">{mode.label}</span>
            </div>
            <p className="mt-4 max-w-none text-sm font-semibold leading-6 text-white/90">{reality.evidence}</p>
          </div>

          <div className="p-6">
            <div className={`mb-5 rounded-3xl p-4 text-xs font-bold ring-1 ${mode.tone}`}>{mode.note}</div>
            <div className="mb-5 rounded-3xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-200">
              Source of truth / 真实性来源: <code className="rounded bg-white/70 px-1">data/adminModuleReality.ts</code>. Generic panel buttons below are not production writes; real writes must happen in dedicated live workspaces and server APIs. / 下方通用按钮不是生产写入；真实写入必须在专用真实工作区和服务端 API 中完成。
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {metrics.map((card) => (
                <button key={card.label} type="button" onClick={() => runAction(`Open metric / 打开指标: ${card.label}`)} className={`rounded-2xl border-l-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${card.tone}`}>
                  <div className="text-2xl font-black">{card.value}</div>
                  <div className="text-xs font-black">{card.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.45fr)]">
              <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <div className="grid grid-cols-[1fr_120px_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[1.6fr_150px_130px_90px]">
                  <span>Reality item / 真实性条目</span>
                  <span>Owner / 负责人</span>
                  <span>Status / 状态</span>
                  <span className="hidden md:block">Risk</span>
                </div>
                {rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedRowId(row.id)}
                    className={`grid w-full grid-cols-[1fr_120px_110px] gap-3 border-t border-slate-200 px-4 py-3 text-left text-sm transition md:grid-cols-[1.6fr_150px_130px_90px] ${selected.id === row.id ? 'bg-sky-50' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <span>
                      <span className="block font-black text-slate-950">{row.subject}</span>
                      <span className="mt-1 block text-xs font-bold text-activeBlue">{row.id}</span>
                    </span>
                    <span className="font-bold text-slate-600">{row.owner}</span>
                    <span className="font-bold text-slate-600">{row.status}</span>
                    <span className="hidden font-black text-red-600 md:block">{row.priority}</span>
                  </button>
                ))}
              </div>

              <aside className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-activeBlue">Selected item / 当前条目</div>
                <h3 className="mt-2 text-lg font-black text-slate-950">{selected.subject}</h3>
                <dl className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                  <div><dt className="text-xs font-black uppercase text-slate-400">Route</dt><dd>{reality.href}</dd></div>
                  <div><dt className="text-xs font-black uppercase text-slate-400">Next step / 下一步</dt><dd>{selected.next}</dd></div>
                  <div><dt className="text-xs font-black uppercase text-slate-400">Tables / 数据表</dt><dd>{reality.tables.join(' · ') || 'Not defined'}</dd></div>
                  <div><dt className="text-xs font-black uppercase text-slate-400">APIs / 接口</dt><dd>{reality.apis.join(' · ') || 'Not defined'}</dd></div>
                  <div><dt className="text-xs font-black uppercase text-slate-400">Write actions / 写操作</dt><dd>{reality.writeActions.join(' · ') || 'Not defined'}</dd></div>
                  <div><dt className="text-xs font-black uppercase text-slate-400">Audit actions / 审计动作</dt><dd>{reality.auditActions.join(' · ') || 'Not defined'}</dd></div>
                </dl>
                <div className="mt-4 grid gap-2">
                  {['Open registry evidence / 查看真实性证据', 'Open next implementation step / 查看下一步', 'Open audit requirement / 查看审计要求'].map((action) => (
                    <button key={action} type="button" onClick={() => runAction(action)} className={`rounded-2xl px-4 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${mode.button}`}>
                      {action}
                    </button>
                  ))}
                </div>
              </aside>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">Reality log / 真实性页面日志</div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">This log is client-side only. It records what the user clicked in the reality panel, not a production workflow action. / 此日志只记录真实性面板点击，不代表生产业务写入。</p>
                </div>
                <button type="button" onClick={() => setAuditTrail([])} className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Clear / 清空</button>
              </div>
              <div className="mt-3 grid gap-2">
                {auditTrail.length ? auditTrail.map((item) => (
                  <div key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">{item}</div>
                )) : <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-100">No reality-panel actions yet / 暂无真实性面板操作</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
