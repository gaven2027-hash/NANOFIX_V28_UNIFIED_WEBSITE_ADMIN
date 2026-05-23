import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fail = [];
const warn = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function assert(cond, message) { if (!cond) fail.push(message); }
function caution(cond, message) { if (!cond) warn.push(message); }


const versionedFileNames = [];
function scanVersionedNames(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const rel = path.join(dir, entry.name);
    if (/[Vv]28(?:[._-](?:1[0-9]|[2-9]))/.test(entry.name)) versionedFileNames.push(rel);
    if (entry.isDirectory()) scanVersionedNames(rel);
  }
}
scanVersionedNames(".");
assert(versionedFileNames.length === 0, `File names must use V28 only, no sub-version suffixes: ${versionedFileNames.join(", ")}`);

const required = [
  "package.json", "next.config.mjs", "vercel.json", "middleware.ts", ".github/workflows/ci.yml",
  "app/layout.tsx", "app/page.tsx", "app/[...slug]/page.tsx", "app/en/page.tsx", "app/zh/page.tsx",
  "app/api/public-repair-request/route.ts", "app/api/health/route.ts", "lib/public-repair-request.ts",
  "lib/nanofix/seo.ts", "lib/nanofix/cms.ts", "lib/nanofix/legacy-renderer.ts",
  "supabase/migrations/20260521_central_admin_backend.sql", "public/sitemap.xml", "public/robots.txt"
];
required.forEach((file) => assert(exists(file), `Missing required file: ${file}`));

const pkg = JSON.parse(read("package.json"));
assert(pkg.dependencies?.next === "15.5.18", "Next.js dependency should remain pinned to 15.5.18 for reproducible Vercel builds.");
assert(
  pkg.scripts?.build === "bash tools/safe-next-build.sh" || pkg.scripts?.build === "next build --experimental-build-mode=compile",
  "Default npm run build should use either the safe Next build wrapper or the verified compile mode for this Legacy visual-lock package."
);
assert(exists("tools/safe-next-build.sh"), "Safe Next build wrapper must exist for Vercel/GitHub build stability.");
assert(pkg.scripts?.["test:e2e:smoke"]?.includes("e2e-smoke"), "E2E smoke test script must be available for CI route/link checks.");
assert(exists("tools/e2e-smoke.mjs"), "Missing E2E smoke test runner: tools/e2e-smoke.mjs");
assert(pkg.scripts?.verify?.includes("verify-v28"), "verify script should point to V28 verifier.");
assert(pkg.scripts?.["validate:package"]?.includes("validate-unified-package"), "Package validation script must be available for CI.");



const publicRouteFiles = ["app/page.tsx", "app/[...slug]/page.tsx", "app/en/page.tsx", "app/en/[...slug]/page.tsx", "app/zh/page.tsx", "app/zh/[...slug]/page.tsx"];
for (const file of publicRouteFiles) {
  const source = read(file);
  assert(source.includes('export const dynamic = "force-static"'), `${file} should use force-static / ISR for public SEO pages.`);
  assert(source.includes('export const revalidate = 86400'), `${file} should expose a stable daily ISR revalidate value.`);
}

const globalCss = read("app/globals.css");
assert(!/}\s*}\s*@media \(max-width: 640px\)/.test(globalCss), "app/globals.css must not contain stray closing braces before mobile media rules.");
assert(globalCss.includes("V28 mobile parity hardening"), "Global mobile parity hardening CSS must remain present.");

const legacyRenderer = read("components/LegacyWebsitePage.tsx");
assert(legacyRenderer.includes("forceHomeLinksToRoot"), "Next route renderer must force Home links back to the locale root on non-home pages.");
assert(legacyRenderer.includes('data-home-root-link="true"'), "Forced Home links must be marked for audit/debugging.");

const css = read("lib/legacy/inline.css");
const body = read("lib/legacy/body.html");
const bodyEn = read("lib/legacy/body.en.html");
const bodyZh = read("lib/legacy/body.zh.html");
assert(!/nanofix-footer-logo-wrap\s+nanofix-logo-aura/.test(body + bodyEn + bodyZh), "Footer logo must not use nanofix-logo-aura.");
assert(/\.nanofix-header-logo-aura::before[\s\S]*width:\s*132%/.test(css), "Header logo rays must be shortened to 132% width.");
assert(/\.nanofix-footer-logo-wrap::before,[\s\S]*content:\s*none !important/.test(css), "Footer logo pseudo animation lock must be present.");
assert(css.includes("NANOFIX V28 mobile visual lock"), "Mobile visual lock CSS must be present in legacy inline styles.");
assert(css.includes("#nanofix-lead-form .grid"), "Mobile form single-column safeguard must be present.");
assert(css.includes(".home-carousel-card { width: 85vw"), "Mobile carousel width safeguard must be present.");


const sitemap = read("public/sitemap.xml");
["/", "/en", "/zh", "/leak-detection", "/free-quote/book-site-inspection"].forEach((route) => {
  assert(sitemap.includes(`https://www.nanofixsg.com${route === "/" ? "/" : route}`), `Sitemap missing ${route}`);
});
assert((sitemap.match(/<url>/g) || []).length >= 100, "Sitemap should include default/en/zh SEO route coverage.");
assert(sitemap.includes("xmlns:xhtml"), "Sitemap should include xhtml namespace for hreflang alternates.");
assert(sitemap.includes('hreflang="en-SG"') && sitemap.includes('hreflang="zh-SG"'), "Sitemap should include en-SG and zh-SG hreflang alternates.");

const robots = read("public/robots.txt");
assert(/Disallow: \/admin\//.test(robots), "robots.txt must disallow /admin/.");
assert(/Disallow: \/api\//.test(robots), "robots.txt must disallow /api/.");
assert(/Sitemap: https:\/\/www\.nanofixsg\.com\/sitemap\.xml/.test(robots), "robots.txt must reference canonical sitemap.");

const nextConfig = read("next.config.mjs");
["X-Content-Type-Options", "Strict-Transport-Security", "Content-Security-Policy", "X-Frame-Options"].forEach((header) => {
  assert(nextConfig.includes(header), `Security header missing: ${header}`);
});
assert(nextConfig.includes("https://challenges.cloudflare.com"), "CSP should allow Cloudflare Turnstile when enabled.");
assert(nextConfig.includes("https://*.supabase.co"), "CSP connect-src should allow Supabase project domain.");
assert(read("components/LegacyWebsitePage.tsx").includes("client_upload_compression"), "Lead forms should include client-side image upload compression marker without changing layout.");

const middleware = read("middleware.ts");
assert(
  middleware.includes("actorFromSupabaseSession") && middleware.includes("getSupabaseUserIdAndEmail") && middleware.includes("fetchProfileActor"),
  "Middleware must verify Supabase sessions and map them to server-side profiles before granting protected access."
);
assert(middleware.includes("NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED"), "Middleware must support controlled admin token fallback flag.");
assert(middleware.includes("X-Robots-Tag"), "Admin middleware must set noindex header.");

const env = read(".env.example");
["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false", "CLOUDFLARE_TURNSTILE_SECRET_KEY"].forEach((needle) => {
  assert(env.includes(needle), `.env.example missing ${needle}`);
});

const migration = fs.readdirSync(path.join(root, "supabase", "migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => fs.readFileSync(path.join(root, "supabase", "migrations", file), "utf8"))
  .join("\n");
[
  "enable row level security",
  "admin_profiles",
  "backup_schedules",
  "lead_attachments",
  "integration_outbox",
  "form_rate_limits",
  "seo_routes",
  "app_modules",
  "module_health_events",
  "latest_module_health",
  "entity_events",
  "customer_binding_suggestions",
  "global_search_documents",
  "otp_verifications"
].forEach((needle) => {
  assert(migration.includes(needle), `Supabase migrations missing ${needle}`);
});
["ai_admin", "finance_admin", "support_admin"].forEach((role) => {
  assert(migration.includes(role), `Supabase admin_profiles role enum missing ${role}`);
});


function collectAssetRefs(rel) {
  const source = read(rel);
  const matches = [...source.matchAll(/(?:src=|href=)["']([^"']+)["']|url\((["']?)([^)"']+)\2\)/g)];
  return matches
    .map((match) => match[1] || match[3])
    .filter((value) => value && (/^(?:\/)?assets\//.test(value) || value.includes("assets/images")));
}
const assetRefs = ["lib/legacy/body.html", "lib/legacy/body.en.html", "lib/legacy/body.zh.html", "lib/legacy/inline.css"]
  .flatMap((rel) => collectAssetRefs(rel).map((asset) => [rel, asset]));
const missingAssets = assetRefs.filter(([, asset]) => {
  const cleaned = asset.split("?")[0].replace(/^\//, "");
  return !exists(`public/${cleaned}`);
});
assert(missingAssets.length === 0, `Missing referenced image/static assets: ${missingAssets.map(([rel, asset]) => `${rel}:${asset}`).slice(0, 12).join(", ")}`);

const requiredHeroAssets = [
  "public/assets/images/get_free_quote_hero_fullbleed.webp",
  "public/assets/images/get_free_quote_hero.webp"
];
requiredHeroAssets.forEach((file) => assert(exists(file), `Missing repaired free quote hero asset: ${file}`));

const layout = read("app/layout.tsx");
assert(layout.includes('hrefLang="en-sg"') || layout.includes('hrefLang="en-SG"'), "Root layout should include en-SG alternate.");
assert(layout.includes('hrefLang="zh-sg"') || layout.includes('hrefLang="zh-SG"'), "Root layout should include zh-SG alternate.");

const seo = read("lib/nanofix/seo.ts");
assert(seo.includes("localizedPath"), "SEO metadata should be locale-aware.");
assert(seo.includes("buildStructuredData(route: NanofixRouteDefinition, locale"), "Structured data should support localized page URLs.");

caution(!nextConfig.includes("'unsafe-inline'"), "CSP still allows unsafe-inline due Legacy HTML. Acceptable for visual lock, but pure component version should remove it.");
caution(!body.includes("dangerouslySetInnerHTML"), "Legacy body is rendered through React innerHTML by design for visual lock; pure component rebuild can improve maintainability.");

if (fail.length) {
  console.error("NANOFIX V28 audit failed:");
  fail.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log("NANOFIX V28 audit passed.");
if (warn.length) {
  console.log("Warnings / future improvements:");
  warn.forEach((item) => console.log(`- ${item}`));
}
