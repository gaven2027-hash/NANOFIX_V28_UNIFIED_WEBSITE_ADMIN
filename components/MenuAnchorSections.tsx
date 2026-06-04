'use client';

import { useEffect, useMemo, useState } from 'react';
import { menu } from '@/data/adminNavigation';
import { AdminSubmoduleWorkspace } from './AdminSubmoduleWorkspace';

const DIAGNOSTIC_ROUTES = new Set(['/system-settings']);

function anchorFromHref(href: string) {
  return href.includes('#') ? href.split('#')[1] : href.replace(/^\//, '').replace(/\//g, '-');
}

export function MenuAnchorSections({ route }: { route: string }) {
  const items = useMemo(() => menu.find((item) => item.href === route)?.children || [], [route]);
  const [missingAnchors, setMissingAnchors] = useState<string[]>([]);

  useEffect(() => {
    if (DIAGNOSTIC_ROUTES.has(route)) {
      setMissingAnchors([]);
      return;
    }

    const anchors = items.map((item) => anchorFromHref(item.href));
    setMissingAnchors(anchors.filter((anchor) => !document.getElementById(anchor)));
  }, [items, route]);

  useEffect(() => {
    if (!missingAnchors.length) return;

    const hash = window.location.hash.replace('#', '');
    if (!hash || !missingAnchors.includes(hash)) return;

    window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [missingAnchors]);

  if (DIAGNOSTIC_ROUTES.has(route)) {
    return <AdminSubmoduleWorkspace route={route} />;
  }

  if (!missingAnchors.length) {
    return null;
  }

  return (
    <div aria-hidden="true" className="pointer-events-none h-0 overflow-hidden">
      {missingAnchors.map((anchor) => (
        <span key={anchor} id={anchor} className="block scroll-mt-40" />
      ))}
    </div>
  );
}
