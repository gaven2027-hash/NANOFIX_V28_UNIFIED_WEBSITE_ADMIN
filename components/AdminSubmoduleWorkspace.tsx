'use client';

import { useEffect, useMemo, useState } from 'react';
import { menu } from '@/data/adminNavigation';

type Section = {
  id: string;
  href: string;
  title: string;
  zh: string;
  parentOrder: string;
  parentTitle: string;
  childOrder: string;
};

function basePath(href: string) {
  return href.split('#')[0] || '/admin';
}

function currentHash() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#/, '');
}

function actionSet(section: Section) {
  const key = `${section.parentTitle} ${section.title}`.toLowerCase();
  if (key.includes('advertising') || key.includes('campaign') || key.includes('roi') || key.includes('budget')) return ['Create campaign draft', 'Review ROI', 'Approve budget', 'Export report'];
  if (key.includes('website') || key.includes('seo') || key.includes('guide') || key.includes('publish')) return ['Edit content', 'Preview page', 'Request approval', 'Publish approved version'];
  if (key.includes('service') || key.includes('lead') || key.includes('job') || key.includes('quote') || key.includes('invoice')) return ['Open record list', 'Create new record', 'Assign owner', 'Update status'];
  if (key.includes('social') || key.includes('whatsapp') || key.includes('gmb')) return ['Open inbox', 'Draft reply', 'Transfer to human', 'Schedule content'];
  if (key.includes('customer')) return ['Open customer list', 'Review binding', 'View timeline', 'Export permitted data'];
  if (key.includes('settings') || key.includes('backup') || key.includes('permission')) return ['Open settings', 'Run health check', 'Review audit log', 'Download backup'];
  return ['Open list', 'Create draft', 'Review item', 'Export audit trail'];
}

function statusCards(section: Section) {
  const prefix = section.childOrder;
  return [
    { label: 'Pending / 待处理', value: prefix.includes('5') ? '6' : '12', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
    { label: 'Approved / 已批准', value: prefix.includes('3') ? '9' : '24', tone: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
    { label: 'Needs review / 需审核', value: prefix.includes('7') ? '3' : '5', tone: 'border-red-400 bg-red-50 text-red-900' },
    { label: 'Audit logs / 审计', value: '∞', tone: 'border-blue-400 bg-blue-50 text-blue-900' }
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
  useEffect(() => {
    const applyHash = () => setActiveId(currentHash() || sections[0]?.id || '');
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [sections]);
  const active = sections.find((section) => section.id === activeId) || sections[0];
  if (!active) return null;
  const cards = statusCards(active);
  const actions = actionSet(active);
  return (
    <section className="mt-6 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Submodules / 二级栏目</div>
        <div className="mt-3 grid gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                window.history.replaceState(null, '', `#${section.id}`);
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              }}
              className={`rounded-2xl px-3 py-3 text-left text-sm font-black transition ${section.id === active.id ? 'bg-activeBlue text-white shadow-sm' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-activeBlue'}`}
            >
              <span className="block text-xs opacity-80">{section.childOrder}</span>
              <span className="block">{section.title}</span>
              <span className="block text-xs font-bold opacity-75">{section.zh}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="space-y-5">
        <div id={active.id} className="scroll-mt-40 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">{active.parentOrder}. {active.parentTitle}</div>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{active.childOrder} {active.title}</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">{active.zh}</p>
            </div>
            <span className="rounded-2xl bg-green-50 px-3 py-2 text-xs font-black text-green-700 ring-1 ring-green-100">Workspace active / 工作区已打开</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className={`rounded-2xl border-l-4 p-4 ${card.tone}`}>
                <div className="text-2xl font-black">{card.value}</div>
                <div className="text-xs font-black">{card.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {actions.map((action) => (
              <button key={action} type="button" className="rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700">
                {action}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-black text-slate-900">Operational panel / 操作面板</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This area now behaves as the active right-side workspace for the selected submenu. It is designed for real CRUD/API tables, approval queues, editable drafts, upload controls, and audit logs without forcing a full page jump. / 当前区域会根据左侧选择的二级栏目切换为右侧工作区，后续可接入真实 CRUD/API 表格、审批队列、可编辑草稿、上传控件和审计日志，不强制整页跳转。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
