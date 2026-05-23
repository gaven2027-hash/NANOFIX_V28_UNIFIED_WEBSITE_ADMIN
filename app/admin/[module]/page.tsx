import Link from "next/link";
import { notFound } from "next/navigation";
import { adminModules, formatBi } from "@/lib/nanofix/spec";

export const dynamic = "force-dynamic";

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const resolvedParams = await params;
  const adminModule = adminModules.find((item) => item.slug === resolvedParams.module);
  if (!adminModule || adminModule.slug === "dashboard" || adminModule.order === "Top") {
    notFound();
  }

  return (
    <main className="nanofix-admin">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <img alt="NANOFIX logo" src="/assets/images/nanofix-logo-hd-transparent.png" />
            <div>
              <strong>NANOFIX</strong>
              <span>Central Admin / 总管理后台</span>
            </div>
          </div>
          <nav className="admin-nav">
            <Link href="/admin" className="admin-nav-row">
              <span className="admin-nav-order">1</span>
              <span>Dashboard<small>仪表盘</small></span>
            </Link>
            {adminModules
              .filter((module) => module.order !== "Top" && module.slug !== "dashboard")
              .map((module) => (
                <Link href={`/admin/${module.slug}`} key={module.slug} className="admin-nav-row">
                  <span className="admin-nav-order">{module.order}</span>
                  <span>{module.title.en}<small>{module.title.zh}</small></span>
                </Link>
              ))}
          </nav>
        </aside>
        <div className="admin-main">
          <div className="admin-content">
      <div className="page-title">
        <h1>
          {adminModule.order}. {formatBi(adminModule.title)}
        </h1>
        <p>{formatBi(adminModule.description)}</p>
      </div>

      <section className="two-col">
        <article className="card">
          <h2>Functions / 功能</h2>
          <ul className="list">
            {adminModule.features.map((feature) => (
              <li key={feature.en}>{formatBi(feature)}</li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h2>Connections & Rules / 连接与规则</h2>
          <ul className="list">
            {adminModule.connections.map((connection) => (
              <li key={connection.en}>{formatBi(connection)}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Editable Module Content / 可编辑模块内容</h2>
        <div className="two-col">
          <label>
            English
            <textarea defaultValue={adminModule.description.en} rows={5} />
          </label>
          <label>
            中文
            <textarea defaultValue={adminModule.description.zh} rows={5} />
          </label>
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Implementation Contract / 实施契约</h2>
        <p className="muted">
          This module is generated as an isolated admin surface connected through stable APIs, shared identifiers,
          Supabase RLS and audit logs. UI actions should call server routes only; service role keys, AI provider keys,
          social tokens and private customer data must never be exposed to the browser. / 此模块作为独立后台界面生成，通过稳定
          API、共享 ID、Supabase RLS 和审计日志连接。界面操作只能调用服务端路由；service role key、AI key、社媒 token
          和客户隐私数据不得暴露到浏览器。
        </p>
      </section>
          </div>
        </div>
      </div>
    </main>
  );
}
