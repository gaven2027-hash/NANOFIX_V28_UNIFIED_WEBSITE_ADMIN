import Link from 'next/link';
import type { Metadata } from 'next';
import { AdminShell } from '@/components/AdminShell';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';
import { PageHeader } from '@/components/PageHeader';
import { menu } from '@/data/adminNavigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Central Admin Backend | NANOFIX 总管理后台',
  description: 'Routed NANOFIX central admin backend with real module pages and submenu entry points.',
  robots: { index: false, follow: false }
};

const coreModules = menu.filter((item) => !String(item.order).startsWith('P'));

export default function AdminPage() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Central Admin Home / 总后台首页"
        title="Global Search & Admin Home"
        description="Choose a real backend module, open its submenu, and continue to the matching routed admin page. / 选择真实后台模块，打开二级栏目并进入对应后台页面。"
      />

      <section id="module-launch-board" className="grid gap-4 xl:grid-cols-2">
        {coreModules.map((item) => (
          <article key={item.href} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Center {item.order} / 中心 {item.order}</div>
                <h2 className="mt-1 text-xl font-black leading-6 text-slate-950">{item.title}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">{item.zh}</p>
              </div>
              <span className="shrink-0 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100">{item.badge}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={item.href} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-blue-700">
                Open Module / 进入模块
              </Link>
              {item.children.slice(0, 4).map((child) => (
                <Link key={child.href} href={child.href} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-activeBlue">
                  {child.title} / {child.zh}
                </Link>
              ))}
            </div>

            {item.children.length > 4 ? (
              <div className="mt-3 text-xs font-bold text-slate-400">+ {item.children.length - 4} more submenu items available from the left sidebar and module shortcut bar. / 其余二级栏目可从左侧菜单和模块顶部快捷栏进入。</div>
            ) : null}
          </article>
        ))}
      </section>

      <MenuAnchorSections route="/admin" />
    </AdminShell>
  );
}
