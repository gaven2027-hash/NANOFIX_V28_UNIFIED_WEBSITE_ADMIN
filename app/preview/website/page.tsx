import type { Metadata } from 'next';
import Script from 'next/script';
import { LegacyWebsitePage, type LegacyLocale } from '@/components/LegacyWebsitePage';
import { decodePreviewDraft } from '@/lib/nanofix/previewDraft';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Website Preview',
  description: 'Noindex internal preview for NANOFIX Website Management.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

function cleanRoute(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const route = (raw || '/').trim();
  const safe = route.startsWith('/') ? route : `/${route}`;
  return safe.replace(/[^a-zA-Z0-9/_#?&=.-]/g, '').slice(0, 240) || '/';
}

function cleanLocale(value: string | string[] | undefined): LegacyLocale {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'zh' ? 'zh' : 'en';
}

function firstText(value: unknown, keys: string[], fallback = '') {
  if (!value || typeof value !== 'object') return fallback;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const item = record[key];
    if (typeof item === 'string' && item.trim()) return item.trim();
  }
  return fallback;
}

function createDraftInjectionScript(draft: ReturnType<typeof decodePreviewDraft>) {
  if (!draft) return '';
  const content = draft.content_json && typeof draft.content_json === 'object' ? draft.content_json as Record<string, unknown> : {};
  const title = firstText(content, ['title', 'headline', 'h1', 'heading']);
  const subtitle = firstText(content, ['subtitle', 'description', 'body', 'helper']);
  const cta = firstText(content, ['cta', 'button', 'button_text']);
  const image = draft.visual_output_url || draft.visual_output_storage_path || firstText(content, ['src', 'image', 'image_url', 'backgroundImage']);
  const alt = draft.visual_alt_text || firstText(content, ['alt', 'alt_text']);
  return `
(function(){
  const draft = ${JSON.stringify({ ...draft, content_json: content, title, subtitle, cta, image, alt })};
  function text(el, value){ if (el && value) el.textContent = value; }
  function html(el, value){ if (el && value) el.innerHTML = value; }
  function imageApply(el, src, alt){
    if (!el || !src) return;
    const target = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (target) {
      target.setAttribute('src', src);
      if (alt) target.setAttribute('alt', alt);
    } else {
      el.style.backgroundImage = 'url(' + src + ')';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    }
  }
  function bySelectors(selectors){
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }
  function applyGeneric(){
    const key = String(draft.block_key || 'main');
    const keySelector = '[data-cms-block-key="' + key + '"], [data-block-key="' + key + '"], #' + CSS.escape(key) + ', .' + CSS.escape(key);
    const block = document.querySelector(keySelector) || document.querySelector('main section') || document.querySelector('main');
    if (!block) return;
    const titleTarget = bySelectors([keySelector + ' h1', keySelector + ' h2', 'main h1', 'main h2']);
    const subtitleTarget = bySelectors([keySelector + ' p', 'main p']);
    const ctaTarget = bySelectors([keySelector + ' a', keySelector + ' button', 'main a[href*="quote"], main button']);
    text(titleTarget, draft.title);
    text(subtitleTarget, draft.subtitle);
    if (ctaTarget && draft.cta) ctaTarget.textContent = draft.cta;
    imageApply(block, draft.image, draft.alt);
  }
  function badge(){
    const el = document.createElement('div');
    el.textContent = 'NANOFIX Draft Preview · 未发布草稿预览';
    el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;background:#FF5F00;color:white;padding:8px 12px;border-radius:999px;font:700 12px system-ui;box-shadow:0 12px 30px rgba(0,0,0,.2)';
    document.body.appendChild(el);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ applyGeneric(); badge(); }, { once: true });
  } else {
    applyGeneric(); badge();
  }
})();
`;
}

export default function WebsitePreviewPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const routePath = cleanRoute(searchParams?.route_path);
  const locale = cleanLocale(searchParams?.locale);
  const blockKey = Array.isArray(searchParams?.block_key) ? searchParams?.block_key[0] : searchParams?.block_key || 'main';
  const draftToken = Array.isArray(searchParams?.draft) ? searchParams?.draft[0] : searchParams?.draft;
  const draft = decodePreviewDraft(draftToken);
  const injectionScript = createDraftInjectionScript(draft);

  return (
    <>
      <meta name="robots" content="noindex,nofollow,noarchive,noimageindex" />
      <div data-preview-route="website" data-preview-block-key={blockKey} data-preview-mode={draft ? 'draft_injection_preview' : 'published_preview'}>
        <LegacyWebsitePage routePath={routePath} locale={locale} homeHref="/" />
      </div>
      {injectionScript ? <Script id="nanofix-draft-preview-injection" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: injectionScript }} /> : null}
    </>
  );
}
