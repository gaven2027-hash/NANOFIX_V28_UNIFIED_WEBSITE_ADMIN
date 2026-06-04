import { AdminSubmoduleWorkspace } from './AdminSubmoduleWorkspace';

export function SystemSettingsDiagnosticsWorkspace() {
  return (
    <section id="health-checks" className="scroll-mt-40 space-y-4">
      <div className="rounded-3xl bg-blue-50 p-5 ring-1 ring-blue-100">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">
          System Settings Only / 仅系统设置可见
        </div>
        <h2 className="mt-1 text-xl font-black text-slate-950">
          Module Diagnostics & Health Checks / 模块诊断与健康检查
        </h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
          Diagnostic cards are intentionally kept in Website & System Settings only. Daily admin workspaces should show real business panels instead of PARTIAL status cards, table/API probes, audit write tools, task probes, or linked API buttons.
          / 诊断卡只保留在网站与系统设置中。日常后台页面应显示真实业务操作面板，不显示 PARTIAL 状态卡、数据表/API 探针、审计写入工具、任务探针或关联 API 按钮。
        </p>
      </div>
      <AdminSubmoduleWorkspace route="/system-settings" />
    </section>
  );
}
