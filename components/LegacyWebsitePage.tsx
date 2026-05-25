import Script from "next/script";
import {
  buildStructuredData,
  getRouteDefinition,
  routeDefinitions
} from "@/lib/nanofix/seo";
import {
  legacyBodyHtml,
  legacyBodyEnHtml,
  legacyBodyZhHtml,
  legacyInlineCss,
  legacySchemas,
  legacyScripts
} from "@/lib/legacy-content";
import { getCmsPageContract } from "@/lib/nanofix/cms";
import { renderLegacyRouteBody } from "@/lib/nanofix/legacy-renderer";

export type LegacyLocale = "en" | "zh";

const mobileCarouselArrowCss = `
.nanofix-mobile-carousel-shell {
  position: relative;
  isolation: isolate;
}
.nanofix-mobile-carousel-target {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
.nanofix-mobile-carousel-arrow {
  display: none;
}
@media (max-width: 767px) {
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-arrow {
    position: absolute;
    top: 50%;
    z-index: 45;
    width: 38px;
    height: 38px;
    border-radius: 9999px;
    border: 1px solid rgba(255, 95, 0, 0.38);
    background: rgba(255, 255, 255, 0.96);
    color: #FF5F00;
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transform: translateY(-50%);
    transition: background .18s ease, color .18s ease, transform .18s ease, opacity .18s ease;
    backdrop-filter: blur(10px);
  }
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-arrow:active,
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-arrow:focus-visible {
    background: #FF5F00;
    color: #fff;
    transform: translateY(-50%) scale(1.06);
    outline: none;
  }
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-arrow-left { left: 8px; }
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-arrow-right { right: 8px; }
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-arrow i { font-size: 14px; line-height: 1; }
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-edge-left,
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-edge-right {
    pointer-events: none;
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 38;
    width: 54px;
    opacity: .82;
  }
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-edge-left {
    left: 0;
    background: linear-gradient(90deg, rgba(255,255,255,.92), rgba(255,255,255,0));
  }
  .nanofix-mobile-carousel-shell .nanofix-mobile-carousel-edge-right {
    right: 0;
    background: linear-gradient(270deg, rgba(255,255,255,.92), rgba(255,255,255,0));
  }
}
@media (min-width: 768px) {
  .nanofix-mobile-carousel-arrow,
  .nanofix-mobile-carousel-edge-left,
  .nanofix-mobile-carousel-edge-right {
    display: none !important;
  }
}
`;

function createMobileCarouselArrowBridge() {
  return `
(function(){
  const mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
  function isMobile(){ return !mobileQuery || mobileQuery.matches; }
  function isBadContainer(el){
    if (!el || !el.closest) return true;
    if (el.closest('header, nav, footer, form, .dropdown-menu')) return true;
    return false;
  }
  function canScroll(el){
    if (!el || isBadContainer(el)) return false;
    const style = window.getComputedStyle(el);
    const overflowX = style.overflowX || '';
    const scrollableStyle = overflowX === 'auto' || overflowX === 'scroll' || el.className.toString().includes('overflow-x-auto') || el.className.toString().includes('snap-x');
    return scrollableStyle && el.scrollWidth > el.clientWidth + 36 && el.children.length > 1;
  }
  function findScrollTarget(root){
    if (canScroll(root)) return root;
    const candidates = root.querySelectorAll('.overflow-x-auto, .snap-x, [class*="carousel"], [data-carousel], [data-slider]');
    for (const candidate of candidates) {
      if (canScroll(candidate)) return candidate;
    }
    return null;
  }
  function addArrow(shell, target, direction){
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nanofix-mobile-carousel-arrow nanofix-mobile-carousel-arrow-' + (direction < 0 ? 'left' : 'right');
    button.setAttribute('aria-label', direction < 0 ? 'Scroll carousel left' : 'Scroll carousel right');
    button.setAttribute('data-mobile-carousel-arrow', direction < 0 ? 'left' : 'right');
    button.innerHTML = direction < 0 ? '<i class="fa fa-chevron-left" aria-hidden="true"></i>' : '<i class="fa fa-chevron-right" aria-hidden="true"></i>';
    button.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();
      const distance = Math.max(260, Math.round(target.clientWidth * 0.82));
      target.scrollBy({ left: direction * distance, behavior: 'smooth' });
    });
    shell.appendChild(button);
  }
  function enhanceOne(root){
    const target = findScrollTarget(root);
    if (!target || target.dataset.mobileCarouselArrows === 'true') return;
    const shell = target.parentElement && !isBadContainer(target.parentElement) ? target.parentElement : target;
    shell.classList.add('nanofix-mobile-carousel-shell');
    target.classList.add('nanofix-mobile-carousel-target');
    target.dataset.mobileCarouselArrows = 'true';
    if (!shell.querySelector(':scope > .nanofix-mobile-carousel-edge-left')) {
      const leftEdge = document.createElement('span');
      leftEdge.className = 'nanofix-mobile-carousel-edge-left';
      leftEdge.setAttribute('aria-hidden', 'true');
      shell.appendChild(leftEdge);
    }
    if (!shell.querySelector(':scope > .nanofix-mobile-carousel-edge-right')) {
      const rightEdge = document.createElement('span');
      rightEdge.className = 'nanofix-mobile-carousel-edge-right';
      rightEdge.setAttribute('aria-hidden', 'true');
      shell.appendChild(rightEdge);
    }
    if (!shell.querySelector(':scope > .nanofix-mobile-carousel-arrow-left')) addArrow(shell, target, -1);
    if (!shell.querySelector(':scope > .nanofix-mobile-carousel-arrow-right')) addArrow(shell, target, 1);
  }
  function enhanceMobileCarousels(){
    if (!isMobile()) return;
    const roots = document.querySelectorAll('section, [data-home-only="true"], main');
    roots.forEach(enhanceOne);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceMobileCarousels, { once: true });
  } else {
    enhanceMobileCarousels();
  }
  window.addEventListener('resize', function(){ window.clearTimeout(window.nanofixMobileCarouselTimer); window.nanofixMobileCarouselTimer = window.setTimeout(enhanceMobileCarousels, 160); }, { passive: true });
  if (mobileQuery && mobileQuery.addEventListener) mobileQuery.addEventListener('change', enhanceMobileCarousels);
})();
`;
}

function createLeadApiBridge(memberPortalUrl: string, locale: LegacyLocale) {
  const pathAliases = Object.fromEntries(
    routeDefinitions
      .filter((route) => route.hash)
      .map((route) => [route.path || "/", route.hash])
  );

  return `
(function(){
  const pathAliases = ${JSON.stringify(pathAliases)};
  const imageCompression = {
    maxWidth: Number(${JSON.stringify(process.env.NEXT_PUBLIC_UPLOAD_IMAGE_MAX_WIDTH || "1800")}),
    quality: Number(${JSON.stringify(process.env.NEXT_PUBLIC_UPLOAD_IMAGE_QUALITY || "0.78")}),
    minBytes: Number(${JSON.stringify(process.env.NEXT_PUBLIC_UPLOAD_IMAGE_MIN_COMPRESS_BYTES || "524288")})
  };
  document.documentElement.lang = ${JSON.stringify(locale)} === 'zh' ? 'zh-SG' : 'en-SG';
  async function compressImageFile(file) {
    if (!file || !file.type || !/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
    if (file.size < imageCompression.minBytes) return file;
    if (!window.createImageBitmap || !HTMLCanvasElement.prototype.toBlob) return file;
    let bitmap = null;
    try {
      bitmap = await createImageBitmap(file);
      const scale = Math.min(1, imageCompression.maxWidth / Math.max(bitmap.width, bitmap.height));
      if (scale >= 1 && file.type === 'image/webp') return file;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const outputType = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
      const blob = await new Promise(function(resolve) {
        canvas.toBlob(resolve, outputType, imageCompression.quality);
      });
      if (!blob || blob.size >= file.size) return file;
      const nextName = file.name.replace(/\\.[^.]+$/, '') + (outputType === 'image/webp' ? '.webp' : '.jpg');
      return new File([blob], nextName, { type: outputType, lastModified: Date.now() });
    } catch (error) {
      return file;
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }
  async function normalizeLeadFormData(form) {
    const source = new FormData(form);
    const formData = new FormData();
    for (const [key, value] of source.entries()) {
      if (value instanceof File && value.size > 0) {
        formData.append(key, await compressImageFile(value));
      } else {
        formData.append(key, value);
      }
    }
    if (!formData.has('source_form')) {
      formData.append('source_form', form.id === 'quote-page-form' ? 'website_quote_page_repair_request' : 'website_home_repair_request');
    }
    if (!formData.has('pdpa_consent')) {
      formData.append('pdpa_consent', 'true');
    }
    formData.append('client_upload_compression', 'image_canvas_auto_if_supported');
    return formData;
  }
  function stampFormStartTimes() {
    document.querySelectorAll('[data-form-started-at="true"]').forEach(function(input){
      if (!input.value) input.value = String(Date.now());
    });
  }
  function loadMap(container) {
    if (!container || container.dataset.mapLoaded === 'true') return;
    const src = container.getAttribute('data-map-src');
    if (!src) return;
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.setAttribute('title', 'NANOFIX Google Map - Hong Leong Building Singapore');
    iframe.style.cssText = 'border:0;width:100%;height:100%;min-height:inherit;display:block;';
    container.replaceChildren(iframe);
    container.dataset.mapLoaded = 'true';
  }
  document.querySelectorAll('[data-lazy-map="true"]').forEach(function(map){
    ['mouseenter','touchstart','focus','click'].forEach(function(eventName){
      map.addEventListener(eventName, function(){ loadMap(map); }, { once: true, passive: true });
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting && entry.intersectionRatio > 0.65) {
            setTimeout(function(){ loadMap(map); }, 1200);
            observer.disconnect();
          }
        });
      }, { threshold: [0.65] });
      observer.observe(map);
    }
  });
  document.querySelectorAll('[data-member-portal-link="true"]').forEach(function(link) {
    link.setAttribute('href', ${JSON.stringify(memberPortalUrl)});
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  });
  function applyStaticLanguage(lang) {
    const nextLang = lang === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = nextLang === 'zh' ? 'zh-SG' : 'en-SG';
    if (document.body) document.body.classList.toggle('lang-zh', nextLang === 'zh');
    document.querySelectorAll('[data-en]').forEach(function(el) {
      const value = el.getAttribute('data-' + nextLang);
      if (value) el.innerHTML = value;
    });
    document.querySelectorAll('[data-placeholder-en]').forEach(function(el) {
      const value = el.getAttribute('data-placeholder-' + nextLang);
      if (value) el.setAttribute('placeholder', value);
    });
    const en = document.getElementById('btn-en');
    const zh = document.getElementById('btn-zh');
    if (en) en.classList.toggle('text-orange-500', nextLang === 'en');
    if (zh) zh.classList.toggle('text-orange-500', nextLang === 'zh');
  }
  window.nanofixSetLanguage = applyStaticLanguage;
  const routeHash = pathAliases[window.location.pathname.replace(/\/$/, '') || '/'];
  if (routeHash && !window.location.hash) {
    window.location.hash = routeHash;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', stampFormStartTimes, { once: true });
  } else {
    stampFormStartTimes();
  }
  document.addEventListener('click', function(e) {
    const langButton = e.target.closest && e.target.closest('[data-lang-toggle]');
    if (langButton) {
      e.preventDefault();
      applyStaticLanguage(langButton.getAttribute('data-lang-toggle'));
      if (typeof window.switchLanguage === 'function') {
        window.switchLanguage(langButton.getAttribute('data-lang-toggle'));
      }
    }
    const carouselButton = e.target.closest && e.target.closest('[data-carousel-target]');
    if (carouselButton && typeof window.scrollCarousel === 'function') {
      window.scrollCarousel(
        carouselButton.getAttribute('data-carousel-target'),
        Number(carouselButton.getAttribute('data-carousel-direction') || 1)
      );
    }
  });
  document.addEventListener('submit', async function(e) {
    if (!e.target || !['nanofix-lead-form', 'quote-page-form'].includes(e.target.id)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById('submitBtn');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> SUBMITTING...';
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
    }
    try {
      const response = await fetch('/api/public-repair-request', {
        method: 'POST',
        body: await normalizeLeadFormData(form)
      });
      const result = await response.json().catch(function(){ return {}; });
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || 'Submission failed');
      }
      if (typeof gtag === 'function') {
        gtag('event', 'conversion', {'send_to': 'AW-17953055869/yYZoCMya6f8bEP3I1_BC'});
      }
      const msgZH = '提交成功。NANOFIX 团队会尽快查看，并通过 WhatsApp 联系您安排免费检测与报价。';
      const msgEN = 'Thank you. Your repair request has been received. Our NANOFIX team will review it shortly and contact you about the free inspection and quote.';
      alert(document.documentElement.lang.toLowerCase().startsWith('zh') ? msgZH : msgEN);
      form.reset();
    } catch (error) {
      alert(document.documentElement.lang.toLowerCase().startsWith('zh') ? '提交暂时失败，请通过 WhatsApp 联系我们。' : 'Submission failed. Please contact us by WhatsApp.');
    } finally {
      if (submitBtn) {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
      }
    }
  }, true);
})();
`;
}

function bodyForLocale(locale: LegacyLocale) {
  if (locale === "zh") return legacyBodyZhHtml || legacyBodyHtml;
  return legacyBodyEnHtml || legacyBodyHtml;
}

function forceHomeLinksToRoot(html: string, routePath: string, homeHref: string) {
  const cleanRoute = routePath.replace(/\/$/, "") || "/";
  const cleanHome = homeHref.replace(/\/$/, "") || "/";
  if (cleanRoute === "/" || cleanRoute === cleanHome) return html;
  return html.replace(/href=["']#home["']/g, `href="${homeHref}" data-home-root-link="true"`);
}

export function LegacyWebsitePage({
  routePath = "/",
  locale = "en",
  homeHref = "/"
}: {
  routePath?: string;
  locale?: LegacyLocale;
  homeHref?: string;
}) {
  const route = getRouteDefinition(routePath);
  const schemas = [...legacySchemas, ...buildStructuredData(route, locale)];
  const memberPortalUrl = process.env.NEXT_PUBLIC_MEMBER_PORTAL_URL || "https://www.nanofixsg.com/member-sign-up-login";
  const cmsContract = getCmsPageContract(route.path || "/");
  const cmsRuntimeScript = `
(function(){
  const routePath = ${JSON.stringify(route.path || "/")};
  const locale = ${JSON.stringify(locale)};
  const selectorByKey = ${JSON.stringify(Object.fromEntries(cmsContract.blocks.map((block) => [block.key, block.selector])))};
  function applyBlock(block) {
    const selector = selectorByKey[block.block_key];
    if (!selector) return;
    const value = block.content_json || {};
    document.querySelectorAll(selector).forEach(function(el){
      try {
        if (typeof value.html === 'string') el.innerHTML = value.html;
        else if (typeof value.text === 'string') el.textContent = value.text;
        if (typeof value.href === 'string') el.setAttribute('href', value.href);
        const imageTarget = el.tagName === 'IMG' ? el : (el.querySelector('img') || el);
        if (value.src) imageTarget.setAttribute('src', String(value.src));
        if (value.alt) imageTarget.setAttribute('alt', String(value.alt));
        if (value.backgroundImage) imageTarget.style.backgroundImage = 'url(' + String(value.backgroundImage) + ')';
      } catch (error) { console.warn('NANOFIX CMS override skipped', block.block_key, error); }
    });
  }
  fetch('/api/cms/blocks?route_path=' + encodeURIComponent(routePath) + '&locale=' + encodeURIComponent(locale), { cache: 'no-store' })
    .then(function(response){ return response.ok ? response.json() : null; })
    .then(function(result){ if (result && Array.isArray(result.blocks)) result.blocks.forEach(applyBlock); })
    .catch(function(){});
})();
`;
  const html = forceHomeLinksToRoot(
    renderLegacyRouteBody(bodyForLocale(locale), route.path || "/", route.hash),
    route.path || "/",
    homeHref
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${legacyInlineCss}\n${mobileCarouselArrowCss}` }} />
      {schemas.map((schema, index) => (
        <script
          id={`nanofix-schema-${index}`}
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <main
        className="nanofix-route-safe"
        data-cms-route={cmsContract.routePath}
        data-cms-route-hash={cmsContract.routeHash}
        data-cms-editable-blocks={cmsContract.blocks.map((block) => block.key).join(",")}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Script
        id="nanofix-cms-published-overrides"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: cmsRuntimeScript }}
      />
      <Script
        id="nanofix-mobile-carousel-arrow-bridge"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: createMobileCarouselArrowBridge() }}
      />
      <Script
        id="nanofix-lead-api-bridge"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: createLeadApiBridge(memberPortalUrl, locale) }}
      />
      {legacyScripts.map((script, index) => (
        <Script
          id={`nanofix-legacy-script-${index}`}
          key={index}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: script }}
        />
      ))}
    </>
  );
}
