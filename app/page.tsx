import { buildPageMetadata, getRouteDefinition } from "@/lib/nanofix/seo";
import { LegacyWebsitePage } from "@/components/LegacyWebsitePage";

export const dynamic = "force-static";
export const revalidate = 86400;
export const metadata = buildPageMetadata(getRouteDefinition("/"));

export default function HomePage() {
  return <LegacyWebsitePage routePath="/" />;
}
