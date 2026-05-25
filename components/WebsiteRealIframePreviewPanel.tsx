'use client';

import { useMemo, useState } from 'react';
import { Badge } from './Badge';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

type Props = {
  routePath: string;
  blockKey: string;
  locale?: string;
  contentJsonText?: string;
  visualOutputUrl?: string;
  visualOutputStoragePath?: string;
  visualAssetType?: string;
  visualAltText?: string;
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

function parseContent(text?: string) {
  try {
    const parsed = JSON.parse(text || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function encodeDraftPayload(payload: Record<string, unknown>) {
  try {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return '';
  }
}

export function WebsiteRealIframePreviewPanel({ routePath, blockKey, locale = 'en', contentJsonText = '{}', visualOutputUrl = '', visualOutputStoragePath = '', visualAssetType = 'image', visualAltText = '' }: Props) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const frame = devices[device];
  const draftToken = useMemo(() => encodeDraftPayload({
    route_path: normaliseRoute(routePath),
    block_key: blockKey || 'main',
    locale: locale || 'en',
    content_json: parseContent(contentJsonText),
    visual_output_url: visualOutputUrl,
    visual_output_storage_path: visualOutputStoragePath,
    visual_asset_type: visualAssetType,
    visual_alt_text: visualAltText,
    injected_at: new Date().toISOString()
  }), [routePath, blockKey, locale, contentJsonText, visualOutputUrl, visualOutputStoragePath, visualAssetType, visualAltText]);
  const src = useMemo(() => {
    const params = new URLSearchParams({ route_path: normaliseRoute(routePath), block_key: blockKey || 'main', locale: locale || 'en', mode: 'draft_injection_preview' });
    if (draftToken) params.set('draft', draftToken);
    return `/preview/website?${params.toString()}`;
  }, [routePath, blockKey, locale, draftToken]);

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge tone="blue">Real iframe preview</Badge><Badge tone="green">真实官网预览</Badge><Badge tone="amber">Draft Injection</Badge><Badge tone="red">Noindex</Badge></div>
          <p className="mt-2 text-xs font-bold text-slate-500">Shows the real Next.js website route with the current unpublished CMS block injected through a preview token. / 使用 preview token 将当前未发布 CMS 区块注入真实官网页面。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(devices) as DeviceMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => setDevice(mode)} className={`rounded-xl px-3 py-2 text-xs font-black transition ${device === mode ? 'bg-activeBlue text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {devices[mode].label} / {devices[mode].labelZh}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{frame.note} · {normaliseRoute(routePath)}#{blockKey || 'main'} · draft token injected</div>
      <div className="overflow-auto rounded-3xl bg-slate-100 p-3 ring-1 ring-slate-200">
        <div className={`mx-auto overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-300 ${frame.widthClass}`}>
          <iframe title={`NANOFIX real website draft preview ${normaliseRoute(routePath)} ${blockKey || 'main'}`} src={src} className={`w-full border-0 ${frame.heightClass}`} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500"><span>Preview URL:</span><code className="max-w-full overflow-hidden rounded bg-slate-100 px-2 py-1 text-slate-700">{src.slice(0, 180)}{src.length > 180 ? '...' : ''}</code></div>
    </section>
  );
}
