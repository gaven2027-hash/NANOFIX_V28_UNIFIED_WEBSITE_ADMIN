export function normalizeLegacyAnchor(anchor: string) {
  const cleaned = anchor.replace(/^#/, "");
  const aliases: Record<string, string> = {
    "inter-floor-leak-diagnosis": "inter-floor-ceiling-leak-detection",
    "concealed-pipe-detection": "concealed-water-pipe-leak-detection",
    "concealed-water-leak-detection": "concealed-water-pipe-leak-detection",
    "thermal-imaging-scan": "thermal-imaging-leak-scan",
    "drone-facade-inspection": "drone-facade-leak-inspection",
    "why-choose-nanofix": "why-choose-nanofix-guide",
    "leakage-diagnosis-guide": "water-leak-diagnosis-tips",
    "no-hacking-repair-guide": "no-hacking-repair-solutions",
    "waterproofing-material-guide": "waterproofing-materials-tech",
    "warranty-maintenance-guide": "post-repair-warranty-care",
    "knowledge-base-faq": "waterproofing-faqs",
    "latest-insights-guides": "projects-industry-insights",
    "contact-info-location": "quote-company-info"
  };
  return aliases[cleaned] || cleaned;
}

const parentSectionIds = new Set([
  "leak-detection",
  "no-hacking-repair",
  "waterproofing-works",
  "track-record-warranty",
  "get-free-quote-page"
]);

const quoteAnchorToCard: Record<string, string> = {
  "whatsapp-photo-consult": "quote-submit-request",
  "book-site-inspection": "quote-submit-request",
  "track-my-repair-progress": "quote-page-customer-login-block",
  "quote-company-info": "quote-company-info"
};

function findOpeningTagStart(html: string, id: string) {
  const idIndex = html.search(new RegExp(`\\bid=["']${id}["']`));
  if (idIndex < 0) return -1;
  return html.lastIndexOf("<", idIndex);
}

function findBalancedTagEnd(html: string, tag: string, openStart: number) {
  const scanner = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
  scanner.lastIndex = openStart;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = scanner.exec(html))) {
    const token = match[0].toLowerCase();
    if (token.startsWith(`</${tag}`)) {
      depth -= 1;
      if (depth === 0) return scanner.lastIndex;
    } else if (!token.endsWith("/>")) {
      depth += 1;
    }
  }

  return -1;
}

function findElementById(html: string, id: string, tag: "section" | "article" | "footer" | "div") {
  const start = findOpeningTagStart(html, id);
  if (start < 0) return null;
  const openEnd = html.indexOf(">", start);
  if (openEnd < 0) return null;
  const openTag = html.slice(start, openEnd + 1).toLowerCase();
  if (!openTag.startsWith(`<${tag}`)) return null;
  const end = findBalancedTagEnd(html, tag, start);
  if (end < 0) return null;
  return { start, end, html: html.slice(start, end), openTag, id };
}

function findServiceSectionContaining(html: string, targetId: string) {
  const normalized = normalizeLegacyAnchor(targetId);
  const targetOpenStart = findOpeningTagStart(html, normalized);
  if (targetOpenStart < 0) return null;

  const scanner = /<section\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  const candidates: Array<{ start: number; end: number; id: string; openTag: string }> = [];

  while ((match = scanner.exec(html))) {
    const start = match.index;
    const end = findBalancedTagEnd(html, "section", start);
    if (end > targetOpenStart) {
      const openTag = match[0].toLowerCase();
      candidates.push({ start, end, id: match[1], openTag });
    }
  }

  const servicePage = [...candidates]
    .reverse()
    .find((section) => section.start <= targetOpenStart && section.end >= targetOpenStart && section.openTag.includes("service-page"));
  if (servicePage) return { ...servicePage, html: html.slice(servicePage.start, servicePage.end) };

  const directSection = findElementById(html, normalized, "section");
  return directSection ? { ...directSection, id: normalized } : null;
}

function findArticleRanges(html: string) {
  const scanner = /<article\b[^>]*>/gi;
  const articles: Array<{ start: number; end: number; id: string; html: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = scanner.exec(html))) {
    const openTag = match[0];
    if (!/service-detail-card/.test(openTag)) continue;
    const idMatch = openTag.match(/\bid=["']([^"']+)["']/);
    if (!idMatch) continue;
    const start = match.index;
    const end = findBalancedTagEnd(html, "article", start);
    if (end > start) articles.push({ start, end, id: idMatch[1], html: html.slice(start, end) });
  }

  return articles;
}

function keepOnlyTargetCard(sectionHtml: string, routeHash: string) {
  const normalizedHash = normalizeLegacyAnchor(routeHash);
  if (parentSectionIds.has(normalizedHash)) return sectionHtml;

  const targetCardId = quoteAnchorToCard[normalizedHash] || normalizedHash;
  const directArticle = findElementById(sectionHtml, targetCardId, "article");
  const directSection = findElementById(sectionHtml, targetCardId, "section");
  const directDiv = findElementById(sectionHtml, targetCardId, "div");
  const targetExists = Boolean(directArticle || directSection || directDiv || sectionHtml.includes(`id="${normalizedHash}"`));
  if (!targetExists) return sectionHtml;

  const articles = findArticleRanges(sectionHtml);
  const articleIds = new Set(articles.map((article) => article.id));
  if (articleIds.has(targetCardId)) {
    return removeRanges(sectionHtml, articles.filter((article) => article.id !== targetCardId));
  }

  if (normalizedHash === "quote-company-info") {
    const quoteForm = findElementById(sectionHtml, "quote-submit-request", "section");
    return quoteForm ? sectionHtml.replace(quoteForm.html, "") : sectionHtml;
  }

  if (["whatsapp-photo-consult", "book-site-inspection", "track-my-repair-progress"].includes(normalizedHash)) {
    const contactInfo = findElementById(sectionHtml, "quote-company-info", "section");
    return contactInfo ? sectionHtml.replace(contactInfo.html, "") : sectionHtml;
  }

  return sectionHtml;
}

function removeRanges(html: string, ranges: Array<{ start: number; end: number }>) {
  return ranges
    .sort((a, b) => b.start - a.start)
    .reduce((output, range) => `${output.slice(0, range.start)}${output.slice(range.end)}`, html);
}

function extractPrefix(html: string) {
  const firstSection = html.search(/<section\b[^>]*\bid=["']home["'][^>]*>/i);
  return firstSection >= 0 ? html.slice(0, firstSection) : "";
}

function extractFooter(html: string) {
  const footerStart = html.search(/<footer\b/i);
  return footerStart >= 0 ? html.slice(footerStart) : "";
}

function extractContactMap(html: string) {
  const contact = findElementById(html, "contact-map", "section");
  return contact?.html || "";
}

function annotateRoute(html: string, routePath: string, routeHash: string) {
  const normalizedHash = normalizeLegacyAnchor(routeHash);
  return html.replace(
    /<section\b([^>]*\bid=["'][^"']+["'][^>]*)>/i,
    `<section$1 data-rendered-route="${routePath}" data-rendered-anchor="${normalizedHash}">`
  );
}

export function renderLegacyRouteBody(html: string, routePath: string, routeHash: string) {
  if (routePath === "/" || routePath === "" || routeHash === "home") return html;

  const normalizedHash = normalizeLegacyAnchor(routeHash);
  const section = findServiceSectionContaining(html, normalizedHash);
  if (!section) return html;

  const prefix = extractPrefix(html);
  const focusedSection = annotateRoute(keepOnlyTargetCard(section.html, normalizedHash), routePath, normalizedHash);
  const footer = extractFooter(html);
  const includeContactMap = normalizedHash === "get-free-quote-page" || normalizedHash.startsWith("quote-");
  const contactMap = includeContactMap ? extractContactMap(html) : "";

  return [prefix, focusedSection, contactMap, footer].filter(Boolean).join("\n");
}
