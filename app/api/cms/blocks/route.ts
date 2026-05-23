import { fail, ok } from "@/lib/nanofix/api";
import { getCmsPageContract, readPublishedCmsBlocks } from "@/lib/nanofix/cms";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const routePath = url.searchParams.get("route_path") || "/";
  const locale = url.searchParams.get("locale") === "zh" ? "zh" : "en";
  if (!routePath.startsWith("/")) return fail("Invalid route_path", 400);
  const [contract, blocks] = [getCmsPageContract(routePath), await readPublishedCmsBlocks(routePath, locale)];
  return ok({ contract, blocks, status: "published_only" });
}
