import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "final-packages");
const previewRoot = path.join(outputRoot, "NANOFIX_V28_CG_GP_SUPER_STABLE_PREVIEW_PACKAGE");
const SITE_ORIGIN = "https://www.nanofixsg.com";
const legacyRoot = path.join(projectRoot, "lib", "legacy");

const seoRoutes = [
  "/leak-detection",
  "/leak-detection/thermal-imaging-scan",
  "/leak-detection/drone-facade-inspection",
  "/leak-detection/inter-floor-leak-diagnosis",
  "/leak-detection/concealed-pipe-detection",
  "/no-hacking-repair",
  "/no-hacking-repair/toilet-no-hacking-repair",
  "/no-hacking-repair/high-pressure-pu-injection",
  "/no-hacking-repair/clear-penetrating-treatment",
  "/no-hacking-repair/epoxy-tile-grouting",
  "/waterproofing-works",
  "/waterproofing-works/commercial-industrial",
  "/waterproofing-works/rc-roof-metal-roof",
  "/waterproofing-works/external-wall-coating",
  "/waterproofing-works/balcony-planter-box",
  "/track-record-warranty",
  "/track-record-warranty/residential-projects",
  "/track-record-warranty/commercial-portfolio",
  "/track-record-warranty/service-warranty-terms",
  "/track-record-warranty/client-testimonials",
  "/guide",
  "/guide/water-leak-diagnosis-tips",
  "/guide/no-hacking-repair-solutions",
  "/guide/waterproofing-materials-tech",
  "/guide/post-repair-warranty-care",
  "/guide/waterproofing-faqs",
  "/guide/projects-industry-insights",
  "/free-quote",
  "/free-quote/whatsapp-photo-consult",
  "/free-quote/book-site-inspection",
  "/free-quote/track-my-repair-progress",
  "/free-quote/contact-info-location",
  "/free-leak-inspection-quote",
  "/member-sign-up-login"
];

const adminRoutes = [
  "/admin",
  "/dashboard",
  "/service-operations",
  "/website-management",
  "/social-media",
  "/ai-intelligence",
  "/customer-center",
  "/system-settings",
  "/customer-portal",
  "/engineer-portal",
  "/login"
];

const apiRoutes = [
  "/api/health",
  "/api/ready",
  "/api/public-repair-request",
  "/api/customer/register",
  "/api/portal/repair-tracking",
  "/api/service-requests",
  "/api/admin/search",
  "/api/admin/global-search",
  "/api/admin/customer-binding/pending",
  "/api/admin/customer-binding/bind",
  "/api/admin/customer-binding-suggestions",
  "/api/admin/module-health",
  "/api/admin/entity-events",
  "/api/admin/backups/schedules",
  "/api/admin/backups/jobs",
  "/api/admin/backup-schedules",
  "/api/admin/ai/drafts",
  "/api/admin/cms/blocks",
  "/api/admin/payments/reconcile",
  "/api/admin/social/messages",
  "/api/admin/warranties/issue",
  "/api/cms/blocks",
  "/api/system/health",
  "/api/system/module-health-worker",
  "/api/system/modules",
  "/api/webhooks/[source]"
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const item of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, item.name);
    const to = path.join(dest, item.name);
    if (item.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function copyIfExists(from, to) {
  if (fs.existsSync(from)) fs.copyFileSync(from, to);
}

function copyPreviewIcon(fileName) {
  copyIfExists(path.join(projectRoot, "public", fileName), path.join(previewRoot, fileName));
}

function read(file) {
  return fs.readFileSync(path.join(legacyRoot, file), "utf8");
}

function toStaticBody(body, prefix) {
  return body
    .replaceAll('src="/assets/images/', `src="${prefix}assets/images/`)
    .replaceAll("src='/assets/images/", `src='${prefix}assets/images/`)
    .replaceAll('href="/assets/images/', `href="${prefix}assets/images/`)
    .replaceAll("url('/assets/images/", `url('${prefix}assets/images/`)
    .replaceAll('url("/assets/images/', `url("${prefix}assets/images/`)
    .replaceAll("url(/assets/images/", `url(${prefix}assets/images/`);
}

function toStaticCss(css) {
  return css
    .replaceAll("url('/assets/images/", "url('../assets/images/")
    .replaceAll('url("/assets/images/', 'url("../assets/images/')
    .replaceAll("url(/assets/images/", "url(../assets/images/");
}

function htmlFor(prefix = "", canonicalPath = "/") {
  const normalizedPath = canonicalPath === "/" ? "/" : canonicalPath.replace(/\/$/, "");
  const canonicalUrl = `${SITE_ORIGIN}${normalizedPath}`;
  const schemas = JSON.parse(read("schemas.json"));
  const schemaTags = schemas
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NANOFIX Singapore | Waterproofing & Leak Repair Preview</title>
  <meta name="description" content="NANOFIX Singapore waterproofing, leak detection, no-hacking repair, free inspection and quote preview." />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="NANOFIX Singapore Waterproofing & Leak Repair" />
  <meta property="og:description" content="Free inspection. Clear diagnosis. Transparent quote." />
  <meta property="og:type" content="website" />
  <link rel="icon" href="${prefix}favicon.ico" sizes="any" />
  <link rel="icon" href="${prefix}icon.png" type="image/png" />
  <link rel="apple-touch-icon" href="${prefix}apple-touch-icon.png" />
  <link rel="preload" as="image" href="${prefix}assets/images/team_on_site_premium.webp" fetchpriority="high" />
  <link rel="stylesheet" href="${prefix}vendor/nanofix-icons.css" />
  <link rel="stylesheet" href="${prefix}static/nanofix-tailwind.css" />
  <link rel="stylesheet" href="${prefix}static/preview.css" />
  ${schemaTags}
</head>
<body>
${toStaticBody(read("body.html"), prefix)}
<script src="${prefix}static/preview-patch.js"></script>
<script src="${prefix}static/nanofix-client.js"></script>
</body>
</html>
`;
}

function adminPreviewHtml(prefix = "") {
  const routeRows = adminRoutes
    .map((route) => `<a href="${prefix}${route.replace(/^\//, "")}/">${route}</a>`)
    .join("");
  const apiRows = apiRoutes
    .map((route) => `<tr><td><code>${route}</code></td><td>${route.startsWith("/api/admin") ? "Admin token / middleware" : "Public or system guarded"}</td><td>Connected in V28 package</td></tr>`)
    .join("");
  const seoRows = seoRoutes
    .map((route) => `<li><a href="${prefix}${route.replace(/^\//, "")}/">${route}</a></li>`)
    .join("");

  const editableRows = [
    {
      label: "Dashboard notice / 仪表盘公告",
      en: "P0 leakage and negative-review items require immediate human review before any external reply.",
      zh: "P0 漏水与负面评论事项必须先由人工审核，之后才可对外回复。"
    },
    {
      label: "Website homepage hero / 网站首页首屏文案",
      en: "Singapore waterproofing, leak detection and no-hacking repair with free inspection and clear quotation.",
      zh: "新加坡防水、漏水检测与免敲砖维修，提供免费勘查与清晰报价。"
    },
    {
      label: "AI reply template / AI 回复模板",
      en: "Thank you for contacting NANOFIX. We will review your photos, confirm urgency and arrange the next inspection step.",
      zh: "感谢您联系 NANOFIX。我们会查看您的照片、确认紧急程度，并安排下一步勘查。"
    }
  ]
    .map(
      (item) => `<article class="card editor-card"><h3>${item.label}</h3><label>English<textarea>${item.en}</textarea></label><label>中文<textarea>${item.zh}</textarea></label><button type="button">Save Draft / 保存草稿</button></article>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>NANOFIX V28 Admin Preview & Link Audit</title>
  <style>
    :root{font-family:Inter,Arial,sans-serif;color:#111827;background:#f3f4f6}
    body{margin:0}
    header{background:#111827;color:white;padding:24px 32px}
    .brand{display:flex;align-items:center;gap:16px}
    .brand img{width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 8px 18px rgba(0,0,0,.32))}
    main{max-width:1180px;margin:0 auto;padding:28px 20px 48px}
    h1{margin:0;font-size:28px}
    h2{font-size:18px;margin:0 0 14px}
    h3{margin:0 0 10px;font-size:15px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
    .card{background:white;border:1px solid #e5e7eb;border-radius:10px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.06)}
    .editor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
    .editor-card{display:grid;gap:10px}
    label{display:grid;gap:6px;font-size:13px;font-weight:800;color:#374151}
    textarea{min-height:96px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font:inherit;line-height:1.45}
    button{border:0;border-radius:8px;background:#2563eb;color:white;min-height:38px;font-weight:800;padding:0 12px}
    .ok{color:#047857;font-weight:800}
    .warn{color:#b45309;font-weight:800}
    a{color:#ea580c;text-decoration:none;font-weight:700}
    .links{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
    .links a{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px}
    table{width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden}
    th,td{text-align:left;padding:11px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}
    code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <img alt="NANOFIX logo" src="${prefix}assets/images/nanofix-logo-hd-transparent.png" />
      <div>
        <h1>NANOFIX V28 Website + Central Admin Preview / 网站 + 总管理后台预览</h1>
        <p>Static preview for route linkage, API map, SEO/AEO coverage and deployment handoff. / 用于路由衔接、API 地图、SEO/AEO 覆盖与部署交接的静态预览。</p>
      </div>
    </div>
  </header>
  <main>
    <section class="grid">
      <div class="card"><h2>Website / 网站</h2><p class="ok">Connected / 已连接</p><p><a href="${prefix}index.html">Open public website preview / 打开网站预览</a></p></div>
      <div class="card"><h2>Central Admin / 总管理后台</h2><p class="ok">Routes merged / 路由已合并</p><p>Admin base path / 后台路径: <code>/admin</code></p></div>
      <div class="card"><h2>Port Map / 端口地图</h2><p><code>3000</code> Next.js app, <code>4328</code> static preview.</p></div>
      <div class="card"><h2>Security / 安全</h2><p class="ok">Admin middleware + API token guard / 后台中间件 + API Token 保护</p><p>Preview is static only and does not expose secrets. / 预览为静态页面，不暴露密钥。</p></div>
    </section>
    <section class="card" style="margin-top:18px">
      <h2>Editable Bilingual Content / 可编辑中英双语内容</h2>
      <div class="editor-grid">${editableRows}</div>
    </section>
    <section class="card" style="margin-top:18px">
      <h2>Admin Route Preview / 后台路由预览</h2>
      <div class="links">${routeRows}</div>
    </section>
    <section class="card" style="margin-top:18px">
      <h2>SEO/AEO Route Coverage / SEO/AEO 路由覆盖</h2>
      <ul>${seoRows}</ul>
    </section>
    <section style="margin-top:18px">
      <h2>API Linkage Map / API 链路地图</h2>
      <table><thead><tr><th>Endpoint</th><th>Protection</th><th>Status</th></tr></thead><tbody>${apiRows}</tbody></table>
    </section>
  </main>
</body>
</html>`;
}

const previewPatch = `
(function(){
  const aliases = {
    '/leak-detection/thermal-imaging-scan/': 'thermal-imaging-leak-scan',
    '/leak-detection/drone-facade-inspection/': 'drone-facade-leak-inspection',
    '/leak-detection/inter-floor-leak-diagnosis/': 'inter-floor-ceiling-leak-detection',
    '/leak-detection/concealed-pipe-detection/': 'concealed-water-pipe-leak-detection',
    '/no-hacking-repair/toilet-no-hacking-repair/': 'toilet-no-hacking-repair',
    '/no-hacking-repair/high-pressure-pu-injection/': 'high-pressure-pu-injection',
    '/no-hacking-repair/clear-penetrating-treatment/': 'clear-penetrating-treatment',
    '/no-hacking-repair/epoxy-tile-grouting/': 'epoxy-tile-grouting',
    '/waterproofing-works/commercial-industrial/': 'commercial-industrial',
    '/waterproofing-works/rc-roof-metal-roof/': 'rc-roof-metal-roof',
    '/waterproofing-works/external-wall-coating/': 'external-wall-coating',
    '/waterproofing-works/balcony-planter-box/': 'balcony-planter-box',
    '/track-record-warranty/residential-projects/': 'residential-projects',
    '/track-record-warranty/commercial-portfolio/': 'commercial-portfolio',
    '/track-record-warranty/service-warranty-terms/': 'service-warranty-terms',
    '/track-record-warranty/client-testimonials/': 'client-testimonials',
    '/free-quote/': 'get-free-quote-page',
    '/free-quote/whatsapp-photo-consult/': 'whatsapp-photo-consult',
    '/free-quote/book-site-inspection/': 'book-site-inspection',
    '/free-quote/track-my-repair-progress/': 'track-my-repair-progress',
    '/free-quote/contact-info-location/': 'quote-company-info',
    '/free-leak-inspection-quote/': 'get-free-quote-page',
    '/member-sign-up-login/': 'client-portal-repair-tracking'
  };
  const path = window.location.pathname.replace(/\\\\/g, '/');
  Object.keys(aliases).forEach(function(route){
    if (path.endsWith(route) && !window.location.hash) window.location.hash = aliases[route];
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
  document.addEventListener('click', function(event){
    const homeLink = event.target.closest && event.target.closest('a[href="#home"]');
    if (!homeLink) return;
    const home = document.getElementById('home');
    if (!home) return;
    event.preventDefault();
    if (window.location.hash !== '#home') history.pushState(null, '', '#home');
    if (typeof window.switchLanguage === 'function') window.switchLanguage(document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    setTimeout(function(){ home.scrollIntoView({behavior:'smooth', block:'start'}); }, 100);
  }, true);
  document.addEventListener('click', function(event){
    const langButton = event.target.closest && event.target.closest('[data-lang-toggle]');
    if (!langButton) return;
    event.preventDefault();
    applyStaticLanguage(langButton.getAttribute('data-lang-toggle'));
    if (typeof window.switchLanguage === 'function') {
      window.switchLanguage(langButton.getAttribute('data-lang-toggle'));
    }
  }, true);
  document.addEventListener('submit', function(event){
    if (!event.target || !['nanofix-lead-form', 'quote-page-form'].includes(event.target.id)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    alert('Preview mode: repair request submitted successfully. Production will send this to /api/public-repair-request and Supabase.');
    event.target.reset();
  }, true);
})();
`;

fs.rmSync(previewRoot, { recursive: true, force: true });
ensureDir(previewRoot);
ensureDir(path.join(previewRoot, "static"));
ensureDir(path.join(previewRoot, "assets"));
ensureDir(path.join(previewRoot, "vendor"));
copyDir(path.join(projectRoot, "public", "assets", "images"), path.join(previewRoot, "assets", "images"));
copyDir(path.join(projectRoot, "public", "vendor"), path.join(previewRoot, "vendor"));
copyPreviewIcon("favicon.ico");
copyPreviewIcon("icon.png");
copyPreviewIcon("apple-touch-icon.png");
copyIfExists(path.join(projectRoot, "public", "static", "nanofix-tailwind.css"), path.join(previewRoot, "static", "nanofix-tailwind.css"));
fs.writeFileSync(path.join(previewRoot, "static", "preview.css"), toStaticCss(read("inline.css")), "utf8");
fs.writeFileSync(path.join(previewRoot, "static", "nanofix-client.js"), JSON.parse(read("scripts.json")).join("\n;\n"), "utf8");
fs.writeFileSync(path.join(previewRoot, "static", "preview-patch.js"), previewPatch, "utf8");
fs.writeFileSync(path.join(previewRoot, "index.html"), htmlFor("", "/"), "utf8");
fs.writeFileSync(path.join(previewRoot, "NANOFIX_V28_website_admin_unified_full_index_preview.html"), htmlFor("", "/"), "utf8");

ensureDir(path.join(previewRoot, "admin"));
fs.writeFileSync(path.join(previewRoot, "admin", "index.html"), adminPreviewHtml("../", "/admin"), "utf8");
for (const route of adminRoutes.slice(1)) {
  const dir = path.join(previewRoot, route);
  const depth = route.split("/").filter(Boolean).length;
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "index.html"), adminPreviewHtml("../".repeat(depth), route), "utf8");
}

ensureDir(path.join(previewRoot, "api-preview"));
fs.writeFileSync(
  path.join(previewRoot, "api-preview", "health.json"),
  JSON.stringify(
    {
      ok: true,
      package: "NANOFIX V28 CG + GP Super Stable Preview",
      public_routes: seoRoutes.length + 1,
      admin_routes: adminRoutes,
      api_routes: apiRoutes,
      ports: { next_app: 3000, static_preview: 4328 },
      security: ["admin middleware", "NANOFIX_ADMIN_API_TOKEN", "noindex admin", "CSP headers", "rate limit", "Turnstile optional"],
      seo_aeo: ["canonical URLs", "sitemap routes", "LocalBusiness schema", "FAQPage schema", "route metadata", "hreflang EN/ZH"]
    },
    null,
    2
  ),
  "utf8"
);

for (const locale of ["en", "zh"]) {
  const localeDir = path.join(previewRoot, locale);
  ensureDir(localeDir);
  fs.writeFileSync(path.join(localeDir, "index.html"), htmlFor("../", `/${locale}`), "utf8");
}

for (const route of seoRoutes) {
  const dir = path.join(previewRoot, route);
  const depth = route.split("/").filter(Boolean).length;
  const prefix = "../".repeat(depth);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "index.html"), htmlFor(prefix, route), "utf8");

  for (const locale of ["en", "zh"]) {
    const localeRoute = `/${locale}${route}`;
    const localeDir = path.join(previewRoot, localeRoute);
    const localeDepth = localeRoute.split("/").filter(Boolean).length;
    ensureDir(localeDir);
    fs.writeFileSync(path.join(localeDir, "index.html"), htmlFor("../".repeat(localeDepth), localeRoute), "utf8");
  }
}

console.log(previewRoot);
