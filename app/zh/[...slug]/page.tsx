import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyWebsitePage } from "@/components/LegacyWebsitePage";
import {
  buildPageMetadata,
  getRouteDefinition,
  hasRouteDefinition,
  routeDefinitions,
} from "@/lib/nanofix/seo";

export const dynamic = "force-static";
export const revalidate = 86400;

type SlugPageProps = {
  params: Promise<{ slug?: string[] }>;
};

function pathFromSlug(slug?: string[]) {
  return `/${(slug || []).join("/")}`.replace(/\/$/, "") || "/";
}

export function generateStaticParams() {
  return routeDefinitions
    .filter((route) => route.path && route.path !== "/")
    .map((route) => ({ slug: route.path.replace(/^\//, "").split("/") }));
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const routePath = pathFromSlug(resolvedParams.slug);
  if (!hasRouteDefinition(routePath)) notFound();
  return buildPageMetadata(getRouteDefinition(routePath), "zh");
}

export default async function ChineseSlugPage({ params }: SlugPageProps) {
  const resolvedParams = await params;
  const routePath = pathFromSlug(resolvedParams.slug);
  if (!hasRouteDefinition(routePath)) notFound();
  return <LegacyWebsitePage routePath={routePath} locale="zh" homeHref="/zh" />;
}
