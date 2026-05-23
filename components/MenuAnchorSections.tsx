import { menu } from '@/data/adminData';

export function MenuAnchorSections({ route }: { route: string }) {
  const sections = menu
    .filter((item) => item.href.split('#')[0] === route)
    .flatMap((item) => item.children.map((child, index) => ({
      id: child.href.split('#')[1],
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
        <section key={section.id} id={section.id} className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <span className="grid h-9 min-w-9 place-items-center rounded-xl bg-activeBlue px-2 text-xs font-black text-white shadow-sm">{section.childOrder}</span>
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">{section.parentOrder}. {section.parentTitle}</div>
              <h3 className="mt-1 text-lg font-black text-slate-950">{section.childOrder} {section.title}</h3>
            </div>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">{section.zh}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This block preserves the left submenu deep-link target for the Next.js page. Production data should replace this placeholder through the matching Supabase module table or CMS mapping. / 此区块确保左侧二级菜单在正式 Next.js 页面中有对应锚点，后续由对应数据库或 CMS 字段替换真实内容。
          </p>
        </section>
      ))}
    </div>
  );
}
