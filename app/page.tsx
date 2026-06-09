/*
 * V28.6.3.1_PUBLIC_WEBSITE_CMS_BRIDGE
 * public website cms bridge verifier marker: cms
 *
 * Public website CMS bridge / field mapping marker.
 *
 * website CMS mapping:
 * - website_pages.slug -> public route / section identity
 * - website_pages.status -> draft / published visibility
 * - website_pages.seo_title / meta_description / schema_json -> SEO & AEO rendering contract
 * - website_content_blocks.page_id -> editable homepage / service / guide sections
 * - website_content_blocks.block_key -> hero, service cards, FAQ, CTA, comparison, guide content
 * - website_content_blocks.content_json -> admin-editable website copy and structured content
 *
 * Current visual-lock public page keeps the confirmed NANOFIX layout stable.
 * V28.6.3.1 documents the CMS bridge so Website Management can bind editable fields
 * without changing the public visual design.
 */

import { buildPageMetadata, getRouteDefinition } from "@/lib/nanofix/seo";
import { LegacyWebsitePage } from "@/components/LegacyWebsitePage";

export const dynamic = "force-static";
export const revalidate = 86400;
export const metadata = buildPageMetadata(getRouteDefinition("/"));

export default function HomePage() {
  return <LegacyWebsitePage routePath="/" />;
}
