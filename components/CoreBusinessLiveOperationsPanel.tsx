import Link from 'next/link';
import { coreBusinessLiveRequirements, coreBusinessSummary } from '@/data/coreBusinessLiveRequirements';

const statusTone = {
  live: 'bg-emerald-50 text-emerald-950 ring-emerald-200',
  partial: 'bg-amber-50 text-amber-950 ring-amber-200',
  planned: 'bg-slate-50 text-slate-700 ring-slate-200'
};

export function CoreBusinessLiveOperationsPanel() {
  const summary = coreBusinessSummary();
  return (
    <section id="core-business-live-operations" className="mt-6 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Phase E / Core Business OA</div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Core Business Fully Operable Checklist / 核心业务真实可操作清单</h2>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">This panel separates real live modules from partial or planned modules. A module is production-ready only when it has dedicated tables, guarded server APIs, live right-side workspace, audit logs and degraded/error states. / 本面板区分真实可操作模块与部分完成模块；只有具备独立数据表、受保护服务端 API、真实右侧工作区、审计日志和异常降级状态，才算生产可用。</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-950 ring-1 ring-emerald-200"><div className="text-2xl">{summary.live}</div><div>Live</div></div>
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-amber-950 ring-1 ring-amber-200"><div className="text-2xl">{summary.partial}</div><div>Partial</div></div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700 ring-1 ring-slate-200"><div className="text-2xl">{summary.planned}</div><div>Planned</div></div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {coreBusinessLiveRequirements.map((item) => (
          <article key={item.id} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-activeBlue">{item.id}</div>
                <h3 className="mt-1 text-lg font-black text-slate-950">{item.title}</h3>
                <p className="text-sm font-bold text-slate-500">{item.zh}</p>
              </div>
              <span className={`rounded-2xl px-3 py-2 text-xs font-black ring-1 ${statusTone[item.currentStatus]}`}>{item.currentStatus.toUpperCase()} → LIVE</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item.productionDefinition}</p>
            <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><span className="text-slate-400">Tables</span><br />{item.requiredTables.join(' + ')}</div>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><span className="text-slate-400">APIs</span><br />{item.requiredApis.join(' + ')}</div>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><span className="text-slate-400">Panels</span><br />{item.requiredPanels.join(' + ')}</div>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><span className="text-slate-400">Audit</span><br />{item.requiredAuditActions.join(' + ')}</div>
            </div>
            <div className="mt-3 rounded-2xl bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-950 ring-1 ring-blue-200">Next / 下一步：{item.nextImplementationStep}</div>
            <Link href={item.route} className="mt-3 inline-flex rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-blue-700">Open OA Section / 打开 OA 栏目</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
