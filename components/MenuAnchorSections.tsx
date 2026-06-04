import { menu } from '@/data/adminNavigation';

const DIAGNOSTIC_ROUTES = new Set(['/system-settings']);

function anchorFromHref(href: string) {
  return href.includes('#') ? href.split('#')[1] : href.replace(/^\//, '').replace(/\//g, '-');
}

export function MenuAnchorSections({ route }: { route: string }) {
  const items = menu.find((item) => item.href === route)?.children || [];

  if (!items.length || DIAGNOSTIC_ROUTES.has(route)) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-admin-anchor-fallback-route={route}
      className="pointer-events-none h-0 overflow-hidden"
    >
      {items.map((item) => {
        const anchor = anchorFromHref(item.href);
        return (
          <span
            key={item.href}
            id={anchor}
            data-admin-anchor-fallback={anchor}
            className="block scroll-mt-40"
          />
        );
      })}
    </div>
  );
}
