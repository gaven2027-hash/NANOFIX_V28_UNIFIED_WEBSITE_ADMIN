'use client';

import { useMemo, useState } from 'react';
import { menu } from '@/data/adminNavigation';
import { getAdminModuleReality } from '@/data/adminModuleReality';

type Props = {
  route: string;
};

export function AdminSubmoduleWorkspace({ route }: Props) {
  const items = useMemo(() => menu.find((item) => item.href === route)?.children || [], [route]);
  const [selectedHref, setSelectedHref] = useState(items[0]?.href || '');
  const selected = items.find((item) => item.href === selectedHref) || items[0];
  const reality = selected ? getAdminModuleReality(selected.href) : null;
  const [auditTrail, setAuditTrail] = useState<string[]>([]);

  function runAction(action: string) {
    const stamp = new Date().toLocaleString();
    const prefix = reality?.status === 'live'
      ? 'Registry Live Marker only — use dedicated live workspace/API for real writes'
      : 'Registry non-live marker — no server write from this generic panel';

    setAuditTrail((current) => [
      `${stamp} — ${prefix} — ${action} — ${selected?.href || route}`,
      ...current
    ].slice(0, 6));
  }

  if (!selected) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
        <div className="text-sm font-bold text-slate-500">No submenu items found.</div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Admin Reality Workspace</div>
          <h3 className="mt-2 text-xl font-black text-slate-950">{selected.title} / {selected.zh}</h3>
          <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-slate-600">
            This generic panel shows the module reality status. Production write actions must be implemented in each module dedicated workspace and guarded API.
          </p>
        </div>
        <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
          {reality?.status || 'missing'}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {items.map((item) => (
          <button key={item.href} type="button" onClick={() => setSelectedHref(item.href)} className={`rounded-2xl px-3 py-2 text-xs font-black ${selected.href === item.href ? 'bg-activeBlue text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50'}`}>
            {item.title}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-adminBg p-4 ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase text-slate-500">Risk</div>
          <div className="mt-2 text-lg font-black text-slate-950">{reality?.risk || 'P0'}</div>
        </div>
        <div className="rounded-2xl bg-adminBg p-4 ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase text-slate-500">APIs</div>
          <div className="mt-2 text-sm font-bold text-slate-700">{reality?.apis?.join(', ') || 'No dedicated API registered'}</div>
        </div>
        <div className="rounded-2xl bg-adminBg p-4 ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase text-slate-500">Audit Actions</div>
          <div className="mt-2 text-sm font-bold text-slate-700">{reality?.auditActions?.join(', ') || 'No audit action registered'}</div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950 ring-1 ring-amber-200">
        {reality?.nextStep || 'No registry entry found. Create a dedicated live page, API, database writes and Audit Logs before marking this module as production-real.'}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => runAction('view')} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-200">
          View Status
        </button>
        <button type="button" disabled className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-500">
          Generic Write Disabled
        </button>
      </div>

      {auditTrail.length ? (
        <div className="mt-5 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-activeBlue">Local Action Trail</div>
          <ul className="mt-3 space-y-2 text-xs font-bold text-blue-950">
            {auditTrail.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
