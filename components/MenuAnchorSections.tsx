import { menu, type MenuChild } from '@/data/adminNavigation';

function anchorFromHref(href: string) {
  return href.includes('#') ? href.split('#')[1] : href.replace(/^\//, '').replace(/\//g, '-');
}

function normalizeAnchor(anchor: string) {
  return anchor.replace(/^#/, '').trim();
}

function anchorsForItem(item: MenuChild) {
  return Array.from(
    new Set([
      anchorFromHref(item.href),
      ...(item.legacyFrom || []).map(normalizeAnchor)
    ].filter(Boolean))
  );
}

export function MenuAnchorSections({ route }: { route: string }) {
  const items = menu.find((item) => item.href === route)?.children || [];

  if (!items.length) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-admin-anchor-fallback-route={route}
      className="pointer-events-none h-0 overflow-hidden"
    >
      {items.flatMap((item) => {
        const primaryAnchor = anchorFromHref(item.href);
        return anchorsForItem(item).map((anchor) => (
          <span
            key={`${item.href}:${anchor}`}
            id={anchor}
            data-admin-anchor-fallback={anchor}
            data-admin-anchor-primary={primaryAnchor}
            className="block scroll-mt-40"
          />
        ));
      })}
    </div>
  );
}
