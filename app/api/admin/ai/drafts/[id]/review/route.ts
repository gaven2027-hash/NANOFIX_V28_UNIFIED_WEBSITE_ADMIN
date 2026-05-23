import { z } from "zod";
import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject", "request_changes"]),
  edited_output: z.string().trim().max(8000).optional(),
  reason: z.string().trim().min(3).max(1000)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { context, response } = requireAdmin(request, "write:ai");
  if (response) return response;

  const parsed = ReviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const status =
    parsed.data.action === "approve"
      ? "approved"
      : parsed.data.action === "reject"
        ? "rejected"
        : "changes_requested";

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("ai_drafts")
      .update({
        human_review_status: status,
        output_text: parsed.data.edited_output ?? undefined,
        reviewed_by: context?.actorId ?? null,
        reviewed_at: new Date().toISOString()
      })
      .eq("draft_id", resolvedParams.id);

    if (error) {
      return fail("AI draft review update failed", 500);
    }
  }

  await auditLog({
    ...context,
    action: `ai_draft.${status}`,
    target_table: "ai_drafts",
    target_id: resolvedParams.id,
    metadata: { reason: parsed.data.reason }
  });

  return ok({
    status,
    rule: "Approval records review only. Sending or publishing must call a separate module-specific action."
  });
}
