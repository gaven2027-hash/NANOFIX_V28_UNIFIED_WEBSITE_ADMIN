import Link from 'next/link';
import { menu } from '@/data/adminNavigation';

export function MenuAnchorSections({ route }: { route: string }) {
  const sections = menu
    .filter((item) => item.href.split('#')[0] === route)
    .flatMap((item) => item.children.map((child, index) => ({
      id: child.href.split('#')[1],
      href: child.href,
      title: child.title,
      zh: child.zh,
      parentOrder: item.order,
      parentTitle: item.title,
      childOrder: `${item.order}.${index + 1}`
    })))
    .filter((section) => section.id);

  if (!sections.length) return null;

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-40 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <span className="grid h-9 min-w-9 place-items-center rounded-xl bg-activeBlue px-2 text-xs font-black text-white shadow-sm">{section.childOrder}</span>
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">{section.parentOrder}. {section.parentTitle}</div>
              <h3 className="mt-1 text-lg font-black text-slate-950">{section.childOrder} {section.title}</h3>
            </div>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">{section.zh}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This submenu block is a real deep-link target for the module page. Production data should replace this placeholder through the matching Supabase module table, API or CMS mapping. / 此二级栏目区块是当前模块页的真实深度链接目标，后续由对应 Supabase 模块表、API 或 CMS 字段替换真实内容。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={section.href} className="rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-100">Open section / 打开栏目</Link>
            <Link href={route} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Back to module / 返回模块</Link>
          </div>
        </section>
      ))}
    </div>
  );
}
