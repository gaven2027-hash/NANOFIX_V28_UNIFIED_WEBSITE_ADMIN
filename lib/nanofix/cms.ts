import { getRouteDefinition, routeDefinitions } from "./seo";

export type CmsEditableBlock = {
  key: string;
  label: string;
  type: "text" | "rich_text" | "image" | "cta" | "faq" | "form" | "schema";
  selector: string;
  storageTable: string;
  notes: string;
};

export type CmsPageContract = {
  routePath: string;
  routeHash: string;
  pageTitle: string;
  blocks: CmsEditableBlock[];
};

const globalBlocks: CmsEditableBlock[] = [
  {
    key: "navigation.header",
    label: "Header navigation labels, CTA and social links / 顶部导航、CTA 与社媒链接",
    type: "rich_text",
    selector: "header",
    storageTable: "website_navigation_blocks",
    notes: "Admin Website Management can update menu labels, CTA wording and social URLs without changing the fixed menu order."
  },
  {
    key: "footer.company",
    label: "Footer company, contact and trust content / 底部联系与信任内容",
    type: "rich_text",
    selector: "footer",
    storageTable: "website_footer_blocks",
    notes: "Footer copy, contact details and social links are editable; public QR blocks remain disabled on the website."
  }
];

const homeBlocks: CmsEditableBlock[] = [
  {
    key: "home.hero",
    label: "Homepage hero copy and first image / 首页首屏文案与第一张大图",
    type: "image",
    selector: "#home .home-hero-frame",
    storageTable: "website_home_sections",
    notes: "Hero image remains fixed-structure but image asset, headline, subheadline and CTA labels can be mapped to CMS fields."
  },
  {
    key: "home.metric.cards",
    label: "Four animated metric blocks under hero / 首页大图下方 4 个动画方块",
    type: "rich_text",
    selector: "#home .metric-card",
    storageTable: "website_home_sections",
    notes: "Each card should expose number/title/icon/tone/order fields in Website Management."
  },
  {
    key: "home.highlight.carousels",
    label: "Homepage service carousel cards / 首页服务轮播卡片",
    type: "rich_text",
    selector: ".home-carousel-section",
    storageTable: "website_home_carousels",
    notes: "Card title, excerpt, image, linked route and display order are CMS fields while preserving the carousel animation."
  }
];

const serviceBlocks: CmsEditableBlock[] = [
  {
    key: "service.hero",
    label: "Service page hero / 服务页头图与标题",
    type: "image",
    selector: ".service-hero-visual",
    storageTable: "website_service_pages",
    notes: "The hero visual structure stays fixed; CMS controls hero image, kicker, H1/H2, summary and CTA wording."
  },
  {
    key: "service.second_level_menu",
    label: "Second-level menu / 左侧二级栏目菜单",
    type: "rich_text",
    selector: ".service-sidebar",
    storageTable: "website_service_navigation",
    notes: "CMS can edit labels and icons but not remove confirmed primary/secondary menu routes without a schema migration."
  },
  {
    key: "service.detail_cards",
    label: "Service detail cards / 二级栏目正文卡片",
    type: "rich_text",
    selector: ".service-detail-card",
    storageTable: "website_service_blocks",
    notes: "Each card maps to title, intro, image, bullet list, FAQ, CTA and schema fields."
  },
  {
    key: "service.schema",
    label: "Route metadata and structured data / 路由 SEO/AEO 结构化数据",
    type: "schema",
    selector: "metadata/schema",
    storageTable: "website_seo_routes",
    notes: "Each route owns title, description, canonical, OG image, FAQPage, BreadcrumbList and Service schema fields."
  }
];

const quoteBlocks: CmsEditableBlock[] = [
  {
    key: "quote.form",
    label: "Public repair request form / 公开报修表单",
    type: "form",
    selector: "#quote-page-form,#nanofix-lead-form",
    storageTable: "website_forms",
    notes: "Field labels, placeholders and options can be edited; validation, upload compression and API security remain server-controlled."
  },
  {
    key: "quote.contact",
    label: "Contact information and map / 联系信息与地图",
    type: "rich_text",
    selector: "#quote-company-info,#quote-google-map,#contact-map",
    storageTable: "website_contact_blocks",
    notes: "Contact cards and map embed are editable from Settings, with domain and brand consistency checks."
  }
];

export function getCmsPageContract(routePath = "/"): CmsPageContract {
  const route = getRouteDefinition(routePath);
  const blocks = [...globalBlocks];
  if ((route.path || "/") === "/") blocks.push(...homeBlocks);
  if ((route.path || "").startsWith("/free-quote") || route.hash === "get-free-quote-page") {
    blocks.push(...serviceBlocks, ...quoteBlocks);
  } else if ((route.path || "/") !== "/") {
    blocks.push(...serviceBlocks);
  }

  return {
    routePath: route.path || "/",
    routeHash: route.hash,
    pageTitle: route.title,
    blocks
  };
}

export const cmsRouteContracts = routeDefinitions.map((route) => getCmsPageContract(route.path || "/"));

export type PublishedCmsOverride = {
  block_key: string;
  route_path: string;
  locale: "en" | "zh" | "default";
  content_type: string;
  content_json: Record<string, unknown>;
  published_version?: number;
};

export async function readPublishedCmsBlocks(routePath = "/", locale: "en" | "zh" = "en") {
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase-server");
    const supabase = createSupabaseAdminClient();
    if (!supabase) return [] as PublishedCmsOverride[];
    const { data, error } = await supabase
      .from("website_content_blocks")
      .select("block_key,route_path,locale,content_type,content_json,published_version")
      .eq("route_path", routePath)
      .in("locale", [locale, "default"])
      .eq("status", "published")
      .order("updated_at", { ascending: false });
    if (error) return [] as PublishedCmsOverride[];
    return (data ?? []) as PublishedCmsOverride[];
  } catch {
    return [] as PublishedCmsOverride[];
  }
}

export function buildCmsOverrideScript(contract: CmsPageContract, overrides: PublishedCmsOverride[]) {
  if (!overrides.length) return "";
  const selectorByKey = Object.fromEntries(contract.blocks.map((block) => [block.key, block.selector]));
  return `
(function(){
  const selectorByKey = ${JSON.stringify(selectorByKey)};
  const overrides = ${JSON.stringify(overrides)};
  function setImage(el, value) {
    if (!value || typeof value !== 'object') return;
    if (value.src) el.setAttribute('src', String(value.src));
    if (value.alt) el.setAttribute('alt', String(value.alt));
    if (value.backgroundImage) el.style.backgroundImage = 'url(' + String(value.backgroundImage) + ')';
  }
  overrides.forEach(function(block){
    const selector = selectorByKey[block.block_key];
    if (!selector) return;
    const value = block.content_json || {};
    document.querySelectorAll(selector).forEach(function(el){
      try {
        if (typeof value.html === 'string') el.innerHTML = value.html;
        else if (typeof value.text === 'string') el.textContent = value.text;
        if (typeof value.href === 'string') el.setAttribute('href', value.href);
        if (typeof value.ctaText === 'string') {
          const button = el.querySelector('a,button') || el;
          button.textContent = value.ctaText;
        }
        setImage(el.tagName === 'IMG' ? el : (el.querySelector('img') || el), value);
      } catch (error) {
        console.warn('NANOFIX CMS override skipped', block.block_key, error);
      }
    });
  });
})();
`;
}
