import type { Metadata } from "next";

export type NanofixRouteDefinition = {
  path: string;
  hash: string;
  title: string;
  description: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
  serviceName?: string;
  breadcrumbs: string[];
  faqs?: { question: string; answer: string }[];
};

export const siteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nanofixsg.com";

export const defaultSeo = {
  title: "Waterproofing Singapore | PU Injection & No-Hacking Repair | NANOFIX",
  description:
    "Top-rated waterproofing contractor in Singapore for leak detection, PU injection, no-hacking repair and waterproofing works for HDB, condo and commercial properties.",
  image: "/assets/images/home_sg_brand_hero.webp"
};

export const routeDefinitions: NanofixRouteDefinition[] = [
  {
    path: "",
    hash: "home",
    title: defaultSeo.title,
    description: defaultSeo.description,
    priority: 1,
    changeFrequency: "daily",
    breadcrumbs: ["Home"],
    faqs: [
      {
        question: "Does NANOFIX provide no-hacking waterproofing repair in Singapore?",
        answer:
          "Yes. NANOFIX provides no-hacking repair, PU injection, clear penetrating treatment and waterproofing diagnosis for residential and commercial properties in Singapore."
      },
      {
        question: "Can I submit a repair request without creating an account?",
        answer:
          "Yes. Customers can submit a public repair request first. Registration and customer portal access are separate and can be linked later by the admin team."
      }
    ]
  },
  {
    path: "/leak-detection",
    hash: "leak-detection",
    title: "Leak Detection Singapore | Thermal, Drone & Concealed Pipe Diagnosis | NANOFIX",
    description:
      "Professional leak detection in Singapore using thermal imaging, drone facade inspection, inter-floor leak diagnosis and concealed pipe detection.",
    priority: 0.9,
    changeFrequency: "weekly",
    serviceName: "Leak Detection Singapore",
    breadcrumbs: ["Home", "Leak Detection"]
  },
  {
    path: "/leak-detection/thermal-imaging-scan",
    hash: "thermal-imaging-leak-scan",
    title: "Thermal Imaging Leak Detection Singapore | NANOFIX",
    description:
      "Find hidden ceiling, wall and pipe leaks with thermal imaging leak detection for HDB, condo and commercial properties in Singapore.",
    priority: 0.86,
    changeFrequency: "weekly",
    serviceName: "Thermal Imaging Leak Detection",
    breadcrumbs: ["Home", "Leak Detection", "Thermal Imaging Scan"],
    faqs: [
      {
        question: "What is thermal imaging leak detection?",
        answer:
          "Thermal imaging helps identify abnormal moisture and temperature patterns behind ceilings, walls and tiles before deciding whether hacking or targeted repair is needed."
      },
      {
        question: "Is thermal imaging suitable for HDB and condo leak checks?",
        answer:
          "Yes. It is useful for many HDB, condo and commercial leak diagnosis cases when combined with site inspection and moisture checks."
      }
    ]
  },
  {
    path: "/leak-detection/drone-facade-inspection",
    hash: "drone-facade-leak-inspection",
    title: "Drone Facade Leak Inspection Singapore | NANOFIX",
    description:
      "Drone-supported facade leak inspection for high walls, external cracks, roof edges and commercial building waterproofing checks in Singapore.",
    priority: 0.84,
    changeFrequency: "weekly",
    serviceName: "Drone Facade Leak Inspection",
    breadcrumbs: ["Home", "Leak Detection", "Drone Facade Inspection"]
  },
  {
    path: "/leak-detection/inter-floor-leak-diagnosis",
    hash: "inter-floor-ceiling-leak-detection",
    title: "Inter-Floor Ceiling Leak Diagnosis Singapore | NANOFIX",
    description:
      "Diagnose inter-floor ceiling leaks between upper and lower units with structured inspection and waterproofing repair planning in Singapore.",
    priority: 0.84,
    changeFrequency: "weekly",
    serviceName: "Inter-Floor Leak Diagnosis",
    breadcrumbs: ["Home", "Leak Detection", "Inter-Floor Leak Diagnosis"]
  },
  {
    path: "/leak-detection/concealed-pipe-detection",
    hash: "concealed-water-pipe-leak-detection",
    title: "Concealed Pipe Leak Detection Singapore | NANOFIX",
    description:
      "Locate concealed pipe and hidden water leaks before repair decisions using structured leak diagnosis methods for Singapore properties.",
    priority: 0.84,
    changeFrequency: "weekly",
    serviceName: "Concealed Pipe Leak Detection",
    breadcrumbs: ["Home", "Leak Detection", "Concealed Pipe Detection"]
  },
  {
    path: "/no-hacking-repair",
    hash: "no-hacking-repair",
    title: "No-Hacking Leak Repair Singapore | NANOFIX",
    description:
      "No-hacking waterproofing repair options in Singapore including toilet leak repair, PU injection, clear penetrating treatment and epoxy tile grouting.",
    priority: 0.9,
    changeFrequency: "weekly",
    serviceName: "No-Hacking Leak Repair",
    breadcrumbs: ["Home", "No-Hacking Repair"]
  },
  {
    path: "/no-hacking-repair/toilet-no-hacking-repair",
    hash: "toilet-no-hacking-repair",
    title: "Toilet No-Hacking Repair Singapore | NANOFIX",
    description:
      "Repair toilet leaks in Singapore with no-hacking waterproofing options, targeted diagnosis and clear repair recommendations.",
    priority: 0.86,
    changeFrequency: "weekly",
    serviceName: "Toilet No-Hacking Repair",
    breadcrumbs: ["Home", "No-Hacking Repair", "Toilet No-Hacking Repair"],
    faqs: [
      {
        question: "Can a toilet leak be repaired without hacking tiles?",
        answer:
          "Many toilet leak cases can be repaired using no-hacking methods after proper diagnosis, although severe substrate damage may still require a different repair plan."
      },
      {
        question: "Will NANOFIX inspect the leak before recommending repair?",
        answer:
          "Yes. The recommended method should follow inspection findings, property type, leak source and surface condition."
      }
    ]
  },
  {
    path: "/no-hacking-repair/high-pressure-pu-injection",
    hash: "high-pressure-pu-injection",
    title: "High-Pressure PU Injection Singapore | NANOFIX",
    description:
      "High-pressure PU injection for targeted crack, ceiling and concrete leak repair in Singapore residential and commercial properties.",
    priority: 0.85,
    changeFrequency: "weekly",
    serviceName: "High-Pressure PU Injection",
    breadcrumbs: ["Home", "No-Hacking Repair", "High-Pressure PU Injection"]
  },
  {
    path: "/no-hacking-repair/clear-penetrating-treatment",
    hash: "clear-penetrating-treatment",
    title: "Clear Penetrating Waterproofing Treatment Singapore | NANOFIX",
    description:
      "Clear penetrating waterproofing treatment for selected surface leak repairs where visual appearance needs to be preserved.",
    priority: 0.82,
    changeFrequency: "weekly",
    serviceName: "Clear Penetrating Treatment",
    breadcrumbs: ["Home", "No-Hacking Repair", "Clear Penetrating Treatment"]
  },
  {
    path: "/no-hacking-repair/epoxy-tile-grouting",
    hash: "epoxy-tile-grouting",
    title: "Epoxy Tile Grouting Singapore | NANOFIX",
    description:
      "Epoxy tile grouting and wet-area sealing support for selected bathroom, balcony and tiled-area waterproofing repairs in Singapore.",
    priority: 0.82,
    changeFrequency: "weekly",
    serviceName: "Epoxy Tile Grouting",
    breadcrumbs: ["Home", "No-Hacking Repair", "Epoxy Tile Grouting"]
  },
  {
    path: "/waterproofing-works",
    hash: "waterproofing-works",
    title: "Waterproofing Works Singapore | Roof, Wall & Balcony | NANOFIX",
    description:
      "Waterproofing works for commercial, industrial, roof, metal roof, external wall, balcony and planter box areas in Singapore.",
    priority: 0.9,
    changeFrequency: "weekly",
    serviceName: "Waterproofing Works",
    breadcrumbs: ["Home", "Waterproofing Works"]
  },
  {
    path: "/waterproofing-works/commercial-industrial",
    hash: "commercial-industrial",
    title: "Commercial & Industrial Waterproofing Singapore | NANOFIX",
    description:
      "Commercial and industrial waterproofing works in Singapore with structured site inspection, repair planning and documentation.",
    priority: 0.84,
    changeFrequency: "weekly",
    serviceName: "Commercial & Industrial Waterproofing",
    breadcrumbs: ["Home", "Waterproofing Works", "Commercial & Industrial"]
  },
  {
    path: "/waterproofing-works/rc-roof-metal-roof",
    hash: "rc-roof-metal-roof",
    title: "RC Roof & Metal Roof Waterproofing Singapore | NANOFIX",
    description:
      "RC roof and metal roof waterproofing repair for Singapore properties, including leak diagnosis, coating and targeted waterproofing works.",
    priority: 0.85,
    changeFrequency: "weekly",
    serviceName: "RC Roof & Metal Roof Waterproofing",
    breadcrumbs: ["Home", "Waterproofing Works", "RC Roof & Metal Roof"]
  },
  {
    path: "/waterproofing-works/external-wall-coating",
    hash: "external-wall-coating",
    title: "External Wall Waterproofing Coating Singapore | NANOFIX",
    description:
      "External wall waterproofing coating and facade leak repair support for Singapore residential and commercial buildings.",
    priority: 0.82,
    changeFrequency: "weekly",
    serviceName: "External Wall Coating",
    breadcrumbs: ["Home", "Waterproofing Works", "External Wall Coating"]
  },
  {
    path: "/waterproofing-works/balcony-planter-box",
    hash: "balcony-planter-box",
    title: "Balcony & Planter Box Waterproofing Singapore | NANOFIX",
    description:
      "Balcony and planter box waterproofing diagnosis and repair options for Singapore homes, condos and commercial properties.",
    priority: 0.82,
    changeFrequency: "weekly",
    serviceName: "Balcony & Planter Box Waterproofing",
    breadcrumbs: ["Home", "Waterproofing Works", "Balcony & Planter Box"]
  },
  {
    path: "/track-record-warranty",
    hash: "track-record-warranty",
    title: "Track Record & Warranty | NANOFIX Singapore",
    description:
      "Review NANOFIX project experience, warranty terms, residential and commercial portfolio information and customer testimonials.",
    priority: 0.8,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Track Record & Warranty"]
  },
  {
    path: "/track-record-warranty/residential-projects",
    hash: "residential-projects",
    title: "Residential Waterproofing Projects Singapore | NANOFIX",
    description:
      "Residential waterproofing and leak repair project examples for HDB and condo properties in Singapore.",
    priority: 0.78,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Track Record & Warranty", "Residential Projects"]
  },
  {
    path: "/track-record-warranty/commercial-portfolio",
    hash: "commercial-portfolio",
    title: "Commercial Waterproofing Portfolio Singapore | NANOFIX",
    description:
      "Commercial waterproofing portfolio information for Singapore buildings, businesses and industrial properties.",
    priority: 0.78,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Track Record & Warranty", "Commercial Portfolio"]
  },
  {
    path: "/track-record-warranty/service-warranty-terms",
    hash: "service-warranty-terms",
    title: "Waterproofing Service Warranty Terms Singapore | NANOFIX",
    description:
      "Understand NANOFIX waterproofing service warranty terms, repair documentation and customer repair tracking rules in Singapore.",
    priority: 0.8,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Track Record & Warranty", "Service Warranty Terms"]
  },
  {
    path: "/track-record-warranty/client-testimonials",
    hash: "client-testimonials",
    title: "Client Testimonials | NANOFIX Singapore Waterproofing",
    description:
      "Customer testimonials and service experience highlights for NANOFIX waterproofing, leak detection and no-hacking repair in Singapore.",
    priority: 0.76,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Track Record & Warranty", "Client Testimonials"]
  },
  {
    path: "/guide",
    hash: "guide",
    title: "Waterproofing Guide Singapore | Leak Repair FAQs | NANOFIX",
    description:
      "Singapore waterproofing guide covering leak diagnosis, no-hacking repair options, materials, maintenance and common customer questions.",
    priority: 0.82,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Guide"]
  },
  {
    path: "/guide/water-leak-diagnosis-tips",
    hash: "water-leak-diagnosis-tips",
    title: "Water Leak Diagnosis Tips Singapore | NANOFIX Guide",
    description:
      "Learn how to identify common ceiling, wall, toilet and pipe leak warning signs before requesting waterproofing inspection in Singapore.",
    priority: 0.74,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Guide", "Water Leak Diagnosis Tips"]
  },
  {
    path: "/guide/no-hacking-repair-solutions",
    hash: "no-hacking-repair-solutions",
    title: "No-Hacking Repair Solutions Singapore | NANOFIX Guide",
    description:
      "Guide to no-hacking leak repair options in Singapore, including when surface treatments, grouting or injection methods may be suitable.",
    priority: 0.74,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Guide", "No-Hacking Repair Solutions"]
  },
  {
    path: "/guide/waterproofing-materials-tech",
    hash: "waterproofing-materials-tech",
    title: "Waterproofing Materials & Technology Singapore | NANOFIX Guide",
    description:
      "Understand common waterproofing materials and repair technologies used for wet areas, roofs, walls and concealed leak problems.",
    priority: 0.72,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Guide", "Waterproofing Materials & Technology"]
  },
  {
    path: "/guide/post-repair-warranty-care",
    hash: "post-repair-warranty-care",
    title: "Post-Repair Warranty Care Singapore | NANOFIX Guide",
    description:
      "Maintenance and care tips after waterproofing repair, including warranty documentation, surface protection and customer follow-up.",
    priority: 0.72,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Guide", "Post-Repair Warranty Care"]
  },
  {
    path: "/guide/waterproofing-faqs",
    hash: "waterproofing-faqs",
    title: "Waterproofing FAQs Singapore | NANOFIX",
    description:
      "Frequently asked questions about leak detection, PU injection, no-hacking repair, waterproofing warranty and repair tracking in Singapore.",
    priority: 0.74,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Guide", "Waterproofing FAQs"]
  },
  {
    path: "/guide/projects-industry-insights",
    hash: "projects-industry-insights",
    title: "Waterproofing Project & Industry Insights Singapore | NANOFIX",
    description:
      "Project and industry insights for Singapore waterproofing, leak repair, building maintenance and customer repair management.",
    priority: 0.7,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Guide", "Projects & Industry Insights"]
  },
  {
    path: "/free-quote",
    hash: "get-free-quote-page",
    title: "Get a Free Leak Inspection Quote Singapore | NANOFIX",
    description:
      "Submit photos and request a free leak inspection quote from NANOFIX Singapore. WhatsApp photo consult, site inspection and contact information included.",
    priority: 0.95,
    changeFrequency: "daily",
    breadcrumbs: ["Home", "Get a Free Quote"]
  },
  {
    path: "/free-leak-inspection-quote",
    hash: "get-free-quote-page",
    title: "Get a Free Leak Inspection Quote Singapore | NANOFIX",
    description:
      "Submit photos and request a free leak inspection quote from NANOFIX Singapore. WhatsApp photo consult, site inspection and contact information included.",
    priority: 0.65,
    changeFrequency: "monthly",
    breadcrumbs: ["Home", "Get a Free Quote"]
  },
  {
    path: "/free-quote/whatsapp-photo-consult",
    hash: "whatsapp-photo-consult",
    title: "WhatsApp Photo Consult for Leak Repair Singapore | NANOFIX",
    description:
      "Send leak photos to NANOFIX for a quick WhatsApp photo consult before arranging waterproofing inspection or repair quotation.",
    priority: 0.84,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Get a Free Quote", "WhatsApp Photo Consult"]
  },
  {
    path: "/free-quote/book-site-inspection",
    hash: "book-site-inspection",
    title: "Book Site Inspection for Leak Repair Singapore | NANOFIX",
    description:
      "Book a site inspection for leak detection, waterproofing repair and no-hacking repair quotation with NANOFIX Singapore.",
    priority: 0.86,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Get a Free Quote", "Book Site Inspection"]
  },
  {
    path: "/free-quote/track-my-repair-progress",
    hash: "track-my-repair-progress",
    title: "Track My Repair Progress | NANOFIX Customer Portal",
    description:
      "Track repair progress, quotation, invoice, warranty and service records through the NANOFIX customer portal after account verification.",
    priority: 0.76,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Get a Free Quote", "Track My Repair Progress"]
  },
  {
    path: "/free-quote/contact-info-location",
    hash: "quote-company-info",
    title: "NANOFIX Contact Info & Location Singapore",
    description:
      "Contact NANOFIX Singapore by WhatsApp, phone, email or location map for leak inspection, waterproofing works and no-hacking repair enquiries.",
    priority: 0.82,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Get a Free Quote", "Contact Info & Location"]
  },
  {
    path: "/member-sign-up-login",
    hash: "client-portal-repair-tracking",
    title: "NANOFIX Customer Portal Login & Repair Tracking",
    description:
      "Customer portal access for NANOFIX repair tracking, quotation, invoice, payment, warranty and service history after account verification.",
    priority: 0.72,
    changeFrequency: "weekly",
    breadcrumbs: ["Home", "Customer Portal"]
  }
];

export const routeByPath = new Map(routeDefinitions.map((route) => [route.path || "/", route]));

export const routeByHash = new Map(routeDefinitions.map((route) => [route.hash, route]));

export function normalizePathname(pathname = "/") {
  const path = pathname.replace(/\/$/, "") || "/";
  return path;
}

export function hasRouteDefinition(pathname = "/") {
  return routeByPath.has(normalizePathname(pathname));
}

export function getRouteDefinition(pathname = "/") {
  return routeByPath.get(normalizePathname(pathname)) || routeByPath.get("/")!;
}

export function routePathToSlugParams(path = "") {
  return normalizePathname(path)
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean);
}

export function getRouteHash(pathname = "/") {
  return getRouteDefinition(pathname).hash;
}

export type NanofixLocale = "default" | "en" | "zh";

function localizedPath(path = "", locale: NanofixLocale = "default") {
  const cleanPath = path || "";
  if (locale === "en") return `/en${cleanPath}` || "/en";
  if (locale === "zh") return `/zh${cleanPath}` || "/zh";
  return cleanPath || "/";
}

function languageAlternate(path = "", locale: "en" | "zh") {
  const cleanPath = path || "";
  return locale === "en" ? `/en${cleanPath}` || "/en" : `/zh${cleanPath}` || "/zh";
}

export function buildPageMetadata(route: NanofixRouteDefinition, locale: NanofixLocale = "default"): Metadata {
  const canonicalPath = localizedPath(route.path, locale);
  return {
    metadataBase: new URL(siteBaseUrl),
    title: route.title,
    description: route.description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "en-SG": languageAlternate(route.path, "en"),
        "zh-SG": languageAlternate(route.path, "zh"),
        "x-default": route.path || "/"
      }
    },
    openGraph: {
      type: "website",
      url: canonicalPath,
      siteName: "NANOFIX",
      title: route.title,
      description: route.description,
      images: [defaultSeo.image]
    },
    twitter: {
      card: "summary_large_image",
      title: route.title,
      description: route.description,
      images: [defaultSeo.image]
    },
    robots: {
      index: true,
      follow: true
    }
  };
}

function absoluteUrl(path = "", locale: NanofixLocale = "default") {
  return `${siteBaseUrl}${localizedPath(path, locale)}`;
}

export function buildStructuredData(route: NanofixRouteDefinition, locale: NanofixLocale = "default") {
  const pageUrl = absoluteUrl(route.path, locale);
  const breadcrumbItems = route.breadcrumbs.map((name, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name,
    item: index === 0 ? absoluteUrl("", locale) : pageUrl
  }));

  const baseSchemas: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `${siteBaseUrl}/#localbusiness`,
      name: "NANOFIX",
      url: siteBaseUrl,
      image: absoluteUrl(defaultSeo.image),
      telephone: "+65 8038 7877",
      areaServed: "Singapore",
      address: {
        "@type": "PostalAddress",
        addressCountry: "SG",
        addressLocality: "Singapore"
      },
      sameAs: [
        "https://linktr.ee/nanofixsg"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems
    }
  ];

  if (route.serviceName) {
    baseSchemas.push({
      "@context": "https://schema.org",
      "@type": "Service",
      name: route.serviceName,
      serviceType: route.serviceName,
      provider: { "@id": `${siteBaseUrl}/#localbusiness` },
      areaServed: "Singapore",
      url: pageUrl,
      description: route.description
    });
  }

  if (route.faqs?.length) {
    baseSchemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: route.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer
        }
      }))
    });
  }

  return baseSchemas;
}
