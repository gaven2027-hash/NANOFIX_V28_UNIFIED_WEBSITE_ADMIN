'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { menu } from '@/data/adminNavigation';

function getOrderLabel(title: string) {
  const matched = menu.find((item) => item.title === title || item.zh === title);
  if (matched) return matched.order;
  const portalMap: Record<string, string> = {
    'Customer Portal': 'P1',
    'Customer Portal / 客户会员中心': 'P1',
    'Engineer Portal': 'P2',
    'Engineer Portal / 工程师工作台': 'P2'
  };
  return portalMap[title] ?? '•';
}

function formatTitleWithOrder(_orderLabel: string, title: string) {
  return title;
}

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const orderLabel = useMemo(() => getOrderLabel(title), [title]);
  const orderedTitle = useMemo(() => formatTitleWithOrder(orderLabel, title), [orderLabel, title]);

  useEffect(() => {
    const parent = headerRef.current?.parentElement;
    if (!parent || !headerRef.current) return;
    Array.from(parent.children).forEach((child) => {
      if (child === headerRef.current) return;
      const element = child as HTMLElement;
      element.style.display = collapsed ? 'none' : '';
    });
  }, [collapsed]);

  return (
    <div
      ref={headerRef}
      className="relative mb-4 overflow-hidden rounded-2xl bg-[#0b84c6] px-4 py-3 shadow-[0_12px_28px_rgba(7,95,153,0.18)] ring-1 ring-sky-900/10"
    >
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase leading-3 tracking-[0.16em] text-white/75">{eyebrow}</div>
          <h2 className="mt-1 min-w-0 text-xl font-black leading-6 tracking-tight text-white drop-shadow-sm">
            {orderLabel && orderLabel !== '•' ? <span className="mr-2 text-white/80">{orderLabel}.</span> : null}
            <span>{orderedTitle}</span>
          </h2>
          <p className="mt-1 block max-w-full overflow-hidden whitespace-nowrap text-[9.5px] font-semibold leading-3 tracking-[-0.01em] text-white/78">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition hover:bg-white/25"
        >
          {collapsed ? 'Expand / 展开 ▾' : 'Collapse / 收起 ▴'}
        </button>
      </div>
    </div>
  );
}
