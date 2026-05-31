import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.nanofixsg.com"),
  title: "Waterproofing Singapore | PU Injection & No-Hacking Repair | NANOFIX",
  description:
    "Top-rated waterproofing contractor in Singapore. Expert in PU injection, no-hacking leak repair, and nano grouting. BCA registered, 2+ years warranty, free inspection.",
  keywords: [
    "Waterproofing Singapore",
    "PU Injection Singapore",
    "No Hacking Waterproofing",
    "Water Leak Repair",
    "Toilet Leakage",
    "Ceiling Leak HDB",
    "Leak Detection Singapore"
  ],
  alternates: {
    canonical: "/",
    languages: {
      "en-SG": "/en",
      "zh-SG": "/zh",
      "x-default": "/"
    }
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "NANOFIX",
    title: "NANOFIX Singapore - Expert No-Hacking Waterproofing",
    description: "Stop water leaks in 2 hours without hacking. Specialized in PU Injection and Nano Technology.",
    images: ["/assets/images/home_sg_brand_hero.webp"]
  },
  robots: {
    index: true,
    follow: true
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nanofixsg.com";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "NANOFIX",
        url: siteUrl,
        logo: `${siteUrl}/icon.png`,
        image: `${siteUrl}/assets/images/home_sg_brand_hero.webp`,
        telephone: "+65 80387877",
        email: "info@nanofixsg.com",
        sameAs: [
          "https://www.facebook.com/profile.php?id=61583960398460",
          "https://www.instagram.com/nanofixsg",
          "https://www.tiktok.com/@nanofixsg",
          "https://www.youtube.com/@nanofixsg"
        ]
      },
      {
        "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
        "@id": `${siteUrl}/#localbusiness`,
        name: "NANOFIX Singapore",
        alternateName: "NANOFIX",
        url: siteUrl,
        logo: `${siteUrl}/icon.png`,
        image: `${siteUrl}/assets/images/home_sg_brand_hero.webp`,
        description:
          "Singapore leak detection, no-hacking leak repair and waterproofing specialist for HDB, condominium, commercial and industrial properties.",
        telephone: "+65 80387877",
        email: "info@nanofixsg.com",
        address: {
          "@type": "PostalAddress",
          addressCountry: "SG",
          addressLocality: "Singapore"
        },
        areaServed: {
          "@type": "Country",
          name: "Singapore"
        },
        priceRange: "$$",
        parentOrganization: {
          "@id": `${siteUrl}/#organization`
        }
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "NANOFIX",
        inLanguage: "en-SG",
        publisher: {
          "@id": `${siteUrl}/#organization`
        }
      },
      {
        "@type": "Service",
        "@id": `${siteUrl}/#leak-detection-service`,
        name: "Leak Detection and No-Hacking Waterproofing Repair in Singapore",
        serviceType: [
          "Leak Detection",
          "No-Hacking Leak Repair",
          "PU Injection",
          "Waterproofing Works",
          "Ceiling Leak Repair",
          "Toilet Leak Repair"
        ],
        provider: {
          "@id": `${siteUrl}/#localbusiness`
        },
        areaServed: {
          "@type": "Country",
          name: "Singapore"
        },
        audience: {
          "@type": "Audience",
          audienceType: "Homeowners, facility managers, commercial property owners and industrial property managers in Singapore"
        }
      }
    ]
  };

  return (
    <html lang="en-SG">
      <head>
        <link rel="preload" as="image" href="/assets/images/team_on_site_premium.webp" fetchPriority="high" />
        <link rel="preload" href="/vendor/nanofix-icons.css" as="style" />
        <link rel="stylesheet" href="/vendor/nanofix-icons.css" />
        <link rel="alternate" hrefLang="en-sg" href={`${siteUrl}/en`} />
        <link rel="alternate" hrefLang="zh-sg" href={`${siteUrl}/zh`} />
        <link rel="alternate" hrefLang="x-default" href={`${siteUrl}/`} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
