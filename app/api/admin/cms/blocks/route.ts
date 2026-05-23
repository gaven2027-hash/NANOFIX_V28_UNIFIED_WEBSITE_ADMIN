import { z } from "zod";
import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { auditActor, requireAdmin } from "@/lib/nanofix/auth";
import { getCmsPageContract } from "@/lib/nanofix/cms";

export const dynamic = "force-dynamic";

const CmsBlockSchema = z.object({
  route_path: z.string().trim().min(1).max(200).default("/"),
  locale: z.enum(["en", "zh", "default"]).default("en"),
  block_key: z.string().trim().min(2).max(160),
  content_type: z.enum(["text", "rich_text", "image", "cta", "faq", "form", "schema"]).default("rich_text"),
  content_json: z.record(z.unknown()).default({}),
  status: z.enum(["draft", "pending_review", "published", "archived"]).default("draft"),
  publish: z.boolean().optional().default(false)
});

export async function GET(request: Request) {
  const { response } = requireAdmin(request, "read:content");
  if (response) return response;
  const url = new URL(request.url);
  const routePath = url.searchParams.get("route_path") || "/";
  const locale = url.searchParams.get("locale") || "en";
  const supabase = createSupabaseAdminClient();
  const contract = getCmsPageContract(routePath);
  if (!supabase) return ok({ storage: "not_configured", contract, blocks: [] });
  const { data, error } = await supabase
    .from("website_content_blocks")
    .select("block_id,route_path,locale,block_key,content_type,content_json,status,published_version,updated_at,published_at")
    .eq("route_path", routePath)
    .in("locale", [locale, "default"])
    .order("updated_at", { ascending: false });
  if (error) return fail("CMS block query failed", 500, error.message);
  return ok({ storage: "supabase", contract, blocks: data ?? [] });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, "write:content");
  if (response) return response;
  const parsed = CmsBlockSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is required for CMS writes", 503);
  const status = parsed.data.publish ? "published" : parsed.data.status;
  const now = new Date().toISOString();
  const record = {
    ...parsed.data,
    status,
    updated_by: context?.actorId ?? null,
    updated_at: now,
    published_at: status === "published" ? now : null
  };

  const { data, error } = await supabase
    .from("website_content_blocks")
    .upsert(record, { onConflict: "route_path,locale,block_key" })
    .select("block_id,route_path,locale,block_key,status,published_version")
    .single();
  if (error) return fail("CMS block write failed", 500, error.message);

  await auditLog({
    ...auditActor(context),
    action: status === "published" ? "website_cms.published" : "website_cms.saved",
    target_table: "website_content_blocks",
    target_id: data?.block_id ?? null,
    metadata: { route_path: parsed.data.route_path, block_key: parsed.data.block_key, locale: parsed.data.locale, status }
  });
  return ok({ storage: "supabase", block: data });
}
