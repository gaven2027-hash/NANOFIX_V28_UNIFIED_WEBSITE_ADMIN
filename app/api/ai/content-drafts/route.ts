import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/nanofix/auth";
import { actorForClosure, persistAiContentDraft } from "@/lib/nanofix/ai-social-ads-operational-closure";

export const dynamic = "force-dynamic";

const AiContentDraftSchema = z.object({
  module: z.string().trim().min(1).max(80).default("website_cms"),
  channel: z.string().trim().min(1).max(80).default("website"),
  title: z.string().trim().min(1).max(160),
  prompt: z.string().trim().min(1).max(4000),
  draft_body: z.string().trim().min(1).max(12000),
  target_url: z.string().trim().max(300).optional().or(z.literal(""))
});

export async function POST(request: NextRequest) {
  const guard = requireAdmin(request, "write:ai");
  if (guard.response) return guard.response;

  const parsed = AiContentDraftSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid AI content draft payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await persistAiContentDraft({
    module: parsed.data.module,
    channel: parsed.data.channel,
    title: parsed.data.title,
    prompt: parsed.data.prompt,
    draftBody: parsed.data.draft_body,
    targetUrl: parsed.data.target_url || undefined,
    actor: actorForClosure(guard.context)
  });

  return NextResponse.json({
    ok: result.ok,
    bridge_ready: result.bridge_ready,
    skipped: result.skipped,
    warnings: result.warnings,
    ids: result.ids,
    next_step: result.ok ? "Review draft in Website Publish Approval before any public publishing." : "Check Supabase optional table columns and audit log persistence."
  }, { status: result.ok ? 200 : 503 });
}
