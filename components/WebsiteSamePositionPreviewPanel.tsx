'use client';

import { useMemo, useState } from 'react';
import { Badge } from './Badge';
import { WebsiteRealIframePreviewPanel } from './WebsiteRealIframePreviewPanel';

type Props = {
  routePath: string;
  blockKey: string;
  contentType: string;
  contentJsonText: string;
  visualAssetType: string;
  visualOutputUrl: string;
  visualOutputStoragePath: string;
  visualAltText: string;
  providerLabel: string;
  providerNote: string;
};

type Content = Record<string, unknown>;
type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const deviceFrames: Record<DeviceMode, { label: string; labelZh: string; widthClass: string; chrome: string; imageHeight: string; title: string; subtitle: string; padding: string }> = {
  desktop: { label: 'Desktop', labelZh: '电脑端', widthClass: 'max-w-full', chrome: '1440px website width simulation', imageHeight: 'h-52', title: 'text-4xl', subtitle: 'text-sm', padding: 'p-8' },
  tablet: { label: 'Tablet', labelZh: '平板端', widthClass: 'max-w-3xl', chrome: '768px tablet simulation', imageHeight: 'h-44', title: 'text-3xl', subtitle: 'text-sm', padding: 'p-6' },
  mobile: { label: 'Mobile', labelZh: '手机端', widthClass: 'max-w-[390px]', chrome: '390px mobile simulation', imageHeight: 'h-36', title: 'text-2xl', subtitle: 'text-xs', padding: 'p-4' }
};

function parseContent(text: string): Content {
  try {
    const parsed = JSON.parse(text || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Content : { items: parsed };
  } catch {
    return {};
  }
}

function value(content: Content, keys: string[], fallback = '') {
  for (const key of keys) {
    const current = content[key];
    if (typeof current === 'string' && current.trim()) return current.trim();
  }
  return fallback;
}

function imageRef(url: string, path: string) {
  return url || path || '';
}

function PreviewVisual({ src, alt, type, frame }: { src: string; alt: string; type: string; frame: typeof deviceFrames[DeviceMode] }) {
  if (!src) {
    return <div className={`flex ${frame.imageHeight} min-h-32 items-center justify-center rounded-2xl bg-slate-100 text-center text-sm font-black text-slate-500 ring-1 ring-slate-200`}>Visual / GIF preview placeholder<br />等待图片或 GIF 输出</div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
      <img src={src} alt={alt || 'Website visual preview'} className={`${frame.imageHeight} w-full object-cover`} />
      <div className="px-3 py-2 text-xs font-bold text-slate-500">{type.toUpperCase()} · {alt || 'No alt text yet'}</div>
    </div>
  );
}

function DeviceSwitcher({ device, setDevice }: { device: DeviceMode; setDevice: (device: DeviceMode) => void }) {
  const modes: DeviceMode[] = ['desktop', 'tablet', 'mobile'];
  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((mode) => (
        <button key={mode} type="button" onClick={() => setDevice(mode)} className={`rounded-xl px-3 py-2 text-xs font-black transition ${device === mode ? 'bg-activeBlue text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          {deviceFrames[mode].label} / {deviceFrames[mode].labelZh}
        </button>
      ))}
    </div>
  );
}

export function WebsiteSamePositionPreviewPanel(props: Props) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const content = useMemo(() => parseContent(props.contentJsonText), [props.contentJsonText]);
  const frame = deviceFrames[device];
  const src = imageRef(props.visualOutputUrl, props.visualOutputStoragePath);
  const title = value(content, ['title', 'headline', 'h1', 'heading'], 'NANOFIX Website Content Preview');
  const subtitle = value(content, ['subtitle', 'description', 'body', 'helper'], 'Preview how this CMS block may look in the same website position before publishing.');
  const cta = value(content, ['cta', 'button', 'button_text'], 'Get a Free Quote');
  const cards = Array.isArray(content.cards) ? content.cards as Content[] : Array.isArray(content.items) ? content.items as Content[] : [];
  const cardGridClass = device === 'desktop' ? 'md:grid-cols-3' : device === 'tablet' ? 'md:grid-cols-2' : 'grid-cols-1';
  const twoColClass = device === 'desktop' ? 'md:grid-cols-[220px_1fr]' : 'grid-cols-1';
  const ctaGridClass = device === 'desktop' ? 'md:grid-cols-[1fr_220px]' : 'grid-cols-1';

  const shell = (children: React.ReactNode) => (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">Same-position preview</Badge>
            <Badge tone="cyan">{frame.labelZh}</Badge>
            <Badge tone="green">{props.visualAssetType}</Badge>
          </div>
          <DeviceSwitcher device={device} setDevice={setDevice} />
        </div>
        <div className="mb-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
          {frame.chrome} · {props.routePath}#{props.blockKey} · Preview before publish / 发布前预览
        </div>
        <div className={`mx-auto transition-all duration-300 ${frame.widthClass}`}>{children}</div>
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{props.providerLabel} · {props.providerNote}</div>
      </section>
      <WebsiteRealIframePreviewPanel routePath={props.routePath} blockKey={props.blockKey} />
    </div>
  );

  if (props.contentType === 'hero') {
    return shell(
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white">
        {src ? <img src={src} alt={props.visualAltText || title} className="absolute inset-0 h-full w-full object-cover opacity-70" /> : null}
        <div className={`relative z-10 min-h-72 bg-gradient-to-r from-slate-950/80 to-slate-900/20 ${frame.padding}`}>
          <div className="max-w-xl">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">{props.routePath} · {props.blockKey}</div>
            <h2 className={`mt-4 font-black leading-tight ${frame.title}`}>{title}</h2>
            <p className={`mt-4 font-semibold leading-7 text-slate-100 ${frame.subtitle}`}>{subtitle}</p>
            <button type="button" className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm">{cta}</button>
          </div>
        </div>
      </div>
    );
  }

  if (props.contentType === 'card_grid') {
    return shell(
      <div>
        <h2 className={`${device === 'mobile' ? 'text-xl' : 'text-2xl'} font-black text-slate-950`}>{title}</h2>
        <p className={`mt-2 font-semibold text-slate-600 ${frame.subtitle}`}>{subtitle}</p>
        <div className={`mt-4 grid gap-3 ${cardGridClass}`}>
          {(cards.length ? cards.slice(0, 3) : [{ title: 'Leak Detection' }, { title: 'No-Hacking Repair' }, { title: 'Warranty Tracking' }]).map((card, index) => (
            <div key={index} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <PreviewVisual src={index === 0 ? src : ''} alt={props.visualAltText} type={props.visualAssetType} frame={frame} />
              <div className="mt-3 text-sm font-black text-slate-950">{value(card, ['title', 'headline'], `Website Card ${index + 1}`)}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">{value(card, ['body', 'description'], 'Preview card copy and visual fit.')}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (props.contentType === 'cta') {
    return shell(
      <div className="rounded-3xl bg-orange-50 p-5 ring-1 ring-orange-100">
        <div className={`grid gap-4 ${ctaGridClass} md:items-center`}>
          <div><h2 className={`${device === 'mobile' ? 'text-2xl' : 'text-3xl'} font-black text-slate-950`}>{title}</h2><p className={`mt-2 font-bold leading-7 text-slate-600 ${frame.subtitle}`}>{subtitle}</p><button type="button" className="mt-4 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white">{cta}</button></div>
          <PreviewVisual src={src} alt={props.visualAltText} type={props.visualAssetType} frame={frame} />
        </div>
      </div>
    );
  }

  return shell(
    <div className={`grid gap-4 ${twoColClass} md:items-center`}>
      <PreviewVisual src={src} alt={props.visualAltText} type={props.visualAssetType} frame={frame} />
      <div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{props.routePath} · {props.blockKey}</div><h2 className={`mt-2 font-black text-slate-950 ${device === 'mobile' ? 'text-xl' : 'text-2xl'}`}>{title}</h2><p className={`mt-2 font-semibold leading-7 text-slate-600 ${frame.subtitle}`}>{subtitle}</p></div>
    </div>
  );
}
