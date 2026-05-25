'use client';

import { useMemo, useState } from 'react';
import { Badge } from './Badge';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

type Props = {
  routePath: string;
  blockKey: string;
  locale?: string;
};

const devices: Record<DeviceMode, { label: string; labelZh: string; widthClass: string; heightClass: string; note: string }> = {
  desktop: { label: 'Desktop', labelZh: '电脑端', widthClass: 'w-full', heightClass: 'h-[680px]', note: 'Real website preview at full admin width' },
  tablet: { label: 'Tablet', labelZh: '平板端', widthClass: 'w-[768px] max-w-full', heightClass: 'h-[680px]', note: '768px tablet iframe preview' },
  mobile: { label: 'Mobile', labelZh: '手机端', widthClass: 'w-[390px] max-w-full', heightClass: 'h-[720px]', note: '390px mobile iframe preview' }
};

function normaliseRoute(routePath: string) {
  const value = (routePath || '/').trim();
  return value.startsWith('/') ? value : `/${value}`;
}

export function WebsiteRealIframePreviewPanel({ routePath, blockKey, locale = 'en' }: Props) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const frame = devices[device];
  const src = useMemo(() => {
    const params = new URLSearchParams({ route_path: normaliseRoute(routePath), block_key: blockKey || 'main', locale: locale || 'en', mode: 'published_preview' });
    return `/preview/website?${params.toString()}`;
  }, [routePath, blockKey, locale]);

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge tone="blue">Real iframe preview</Badge><Badge tone="green">真实官网预览</Badge><Badge tone="amber">Noindex</Badge></div>
          <p className="mt-2 text-xs font-bold text-slate-500">Shows the real Next.js website route in an iframe. Draft injection will be added later; this foundation verifies layout, navigation, carousel, sticky CTA and mobile behaviour against the real page shell. / 使用 iframe 查看真实 Next.js 官网页面；后续再接草稿注入。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(devices) as DeviceMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => setDevice(mode)} className={`rounded-xl px-3 py-2 text-xs font-black transition ${device === mode ? 'bg-activeBlue text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {devices[mode].label} / {devices[mode].labelZh}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{frame.note} · {normaliseRoute(routePath)}#{blockKey || 'main'}</div>
      <div className="overflow-auto rounded-3xl bg-slate-100 p-3 ring-1 ring-slate-200">
        <div className={`mx-auto overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-300 ${frame.widthClass}`}>
          <iframe title={`NANOFIX real website preview ${normaliseRoute(routePath)} ${blockKey || 'main'}`} src={src} className={`w-full border-0 ${frame.heightClass}`} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500"><span>Preview URL:</span><code className="rounded bg-slate-100 px-2 py-1 text-slate-700">{src}</code></div>
    </section>
  );
}
