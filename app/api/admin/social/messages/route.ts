import { z } from "zod";
import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { auditActor, requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

const SocialSchema = z.object({
  channel: z.enum(["facebook", "instagram", "tiktok", "youtube_shorts", "xiaohongshu", "google_business_profile", "manual"]),
  body: z.string().trim().min(1).max(8000),
  status: z.enum(["draft", "pending_review", "approved", "scheduled", "published", "failed", "rejected"]).default("draft"),
  scheduled_at: z.string().datetime().optional(),
  platform_payload: z.record(z.unknown()).default({}),
  lead_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional()
});

export async function GET(request: Request) {
  const { response } = requireAdmin(request, "read:content");
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return ok({ storage: "not_configured", messages: [] });
  const { data, error } = await supabase
    .from("social_messages")
    .select("message_id,channel,direction,body,status,risk_level,scheduled_at,published_at,platform_payload,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return fail("Social messages query failed", 500, error.message);
  return ok({ storage: "supabase", messages: data ?? [] });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, "write:content");
  if (response) return response;
  const parsed = SocialSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error);
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is required for social workflow", 503);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("social_messages")
    .insert({
      ...parsed.data,
      direction: "outbound",
      published_at: parsed.data.status === "published" ? now : null,
      created_at: now,
      updated_at: now
    })
    .select("message_id,channel,status,scheduled_at,published_at")
    .single();
  if (error) return fail("Social workflow write failed", 500, error.message);
  await auditLog({
    ...auditActor(context),
    action: `social.${parsed.data.status}`,
    target_table: "social_messages",
    target_id: data?.message_id ?? null,
    metadata: parsed.data
  });
  return ok({ storage: "supabase", message: data, rule: "AI/social content is saved for human approval; automatic publishing must be explicitly approved." });
}
