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
      </head>
      <body>{children}</body>
    </html>
  );
}
