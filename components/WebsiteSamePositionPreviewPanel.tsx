'use client';

import { Badge } from './Badge';

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

function PreviewVisual({ src, alt, type }: { src: string; alt: string; type: string }) {
  if (!src) {
    return <div className="flex min-h-44 items-center justify-center rounded-2xl bg-slate-100 text-center text-sm font-black text-slate-500 ring-1 ring-slate-200">Visual / GIF preview placeholder<br />等待图片或 GIF 输出</div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
      <img src={src} alt={alt || 'Website visual preview'} className="h-52 w-full object-cover" />
      <div className="px-3 py-2 text-xs font-bold text-slate-500">{type.toUpperCase()} · {alt || 'No alt text yet'}</div>
    </div>
  );
}

export function WebsiteSamePositionPreviewPanel(props: Props) {
  const content = parseContent(props.contentJsonText);
  const src = imageRef(props.visualOutputUrl, props.visualOutputStoragePath);
  const title = value(content, ['title', 'headline', 'h1', 'heading'], 'NANOFIX Website Content Preview');
  const subtitle = value(content, ['subtitle', 'description', 'body', 'helper'], 'Preview how this CMS block may look in the same website position before publishing.');
  const cta = value(content, ['cta', 'button', 'button_text'], 'Get a Free Quote');
  const cards = Array.isArray(content.cards) ? content.cards as Content[] : Array.isArray(content.items) ? content.items as Content[] : [];

  if (props.contentType === 'hero') {
    return (
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="blue">Same-position preview</Badge><Badge tone="amber">Hero</Badge><Badge tone="green">{props.visualAssetType}</Badge>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white">
          {src ? <img src={src} alt={props.visualAltText || title} className="absolute inset-0 h-full w-full object-cover opacity-70" /> : null}
          <div className="relative z-10 min-h-72 bg-gradient-to-r from-slate-950/80 to-slate-900/20 p-8">
            <div className="max-w-xl">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">{props.routePath} · {props.blockKey}</div>
              <h2 className="mt-4 text-4xl font-black leading-tight">{title}</h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-100">{subtitle}</p>
              <button type="button" className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm">{cta}</button>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{props.providerLabel} · {props.providerNote}</div>
      </section>
    );
  }

  if (props.contentType === 'card_grid') {
    return (
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
        <div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone="blue">Same-position preview</Badge><Badge tone="cyan">Card Grid</Badge><Badge tone="green">{props.visualAssetType}</Badge></div>
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">{subtitle}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(cards.length ? cards.slice(0, 3) : [{ title: 'Leak Detection' }, { title: 'No-Hacking Repair' }, { title: 'Warranty Tracking' }]).map((card, index) => (
            <div key={index} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <PreviewVisual src={index === 0 ? src : ''} alt={props.visualAltText} type={props.visualAssetType} />
              <div className="mt-3 text-sm font-black text-slate-950">{value(card, ['title', 'headline'], `Website Card ${index + 1}`)}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">{value(card, ['body', 'description'], 'Preview card copy and visual fit.')}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (props.contentType === 'cta') {
    return (
      <section className="rounded-3xl bg-orange-50 p-5 shadow-soft ring-1 ring-orange-100">
        <div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone="blue">Same-position preview</Badge><Badge tone="amber">CTA</Badge></div>
        <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-center">
          <div><h2 className="text-3xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm font-bold leading-7 text-slate-600">{subtitle}</p><button type="button" className="mt-4 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white">{cta}</button></div>
          <PreviewVisual src={src} alt={props.visualAltText} type={props.visualAssetType} />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
      <div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone="blue">Same-position preview</Badge><Badge tone="gray">{props.contentType}</Badge><Badge tone="green">{props.visualAssetType}</Badge></div>
      <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
        <PreviewVisual src={src} alt={props.visualAltText} type={props.visualAssetType} />
        <div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{props.routePath} · {props.blockKey}</div><h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{subtitle}</p></div>
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{props.providerLabel} · {props.providerNote}</div>
    </section>
  );
}
