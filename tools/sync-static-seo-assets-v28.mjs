import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const seoSource = fs.readFileSync(path.join(root, "lib", "nanofix", "seo.ts"), "utf8");
const siteMatch = seoSource.match(/process\.env\.NEXT_PUBLIC_SITE_URL \|\| "([^"]+)"/);
const site = siteMatch?.[1] || "https://www.nanofixsg.com";

const blocks = [...seoSource.matchAll(/\{\s*path:\s*"([^"]*)"[\s\S]*?priority:\s*([0-9.]+),\s*changeFrequency:\s*"([^"]+)"/g)].map((match) => ({
  path: match[1] || "",
  priority: Number(match[2]),
  changeFrequency: match[3]
}));

const seen = new Set();
const urls = [];
function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function localizedPath(pathname, locale) {
  const clean = pathname === "" || pathname === "/" ? "" : pathname;
  if (locale === "en") return `/en${clean}` || "/en";
  if (locale === "zh") return `/zh${clean}` || "/zh";
  return clean || "/";
}
function addUrl(pathname, changeFrequency, priority, basePath = pathname) {
  const normalized = pathname === "" ? "/" : pathname;
  if (seen.has(normalized)) return;
  seen.add(normalized);
  urls.push({ loc: `${site}${normalized}`, changeFrequency, priority, basePath });
}

for (const route of blocks) {
  const cleanPath = route.path || "";
  addUrl(cleanPath || "/", route.changeFrequency, route.priority, cleanPath);
  addUrl(`/en${cleanPath}`, route.changeFrequency, Math.max(route.priority - 0.02, 0.5), cleanPath);
  addUrl(`/zh${cleanPath}`, route.changeFrequency, Math.max(route.priority - 0.02, 0.5), cleanPath);
}

function alternateLinks(basePath) {
  return [
    { hreflang: "x-default", href: `${site}${localizedPath(basePath, "default")}` },
    { hreflang: "en-SG", href: `${site}${localizedPath(basePath, "en")}` },
    { hreflang: "zh-SG", href: `${site}${localizedPath(basePath, "zh")}` }
  ]
    .map((item) => `    <xhtml:link rel="alternate" hreflang="${item.hreflang}" href="${xmlEscape(item.href)}" />`)
    .join("\n");
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls
  .map((url) => `  <url>\n    <loc>${xmlEscape(url.loc)}</loc>\n${alternateLinks(url.basePath)}\n    <changefreq>${url.changeFrequency}</changefreq>\n    <priority>${url.priority.toFixed(2)}</priority>\n  </url>`)
  .join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(root, "public", "sitemap.xml"), xml, "utf8");
fs.writeFileSync(
  path.join(root, "public", "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nSitemap: ${site}/sitemap.xml\n`,
  "utf8"
);
console.log(`NANOFIX V28 static SEO assets synced: ${urls.length} URLs.`);
