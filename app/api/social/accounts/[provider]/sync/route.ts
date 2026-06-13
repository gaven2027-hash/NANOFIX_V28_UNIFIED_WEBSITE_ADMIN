import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/nanofix/auth";
import { actorForClosure, normaliseProvider, persistAccountBridge } from "@/lib/nanofix/ai-social-ads-operational-closure";

export const dynamic = "force-dynamic";

const AccountBridgeSchema = z.object({
  account_name: z.string().trim().min(1).max(160),
  account_id: z.string().trim().max(160).optional().or(z.literal("")),
  customer_id: z.string().trim().max(160).optional().or(z.literal("")),
  credentials: z.record(z.unknown()).optional()
});

type RouteContext = { params: Promise<{ provider: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = requireAdmin(request, "social.update");
  if (guard.response) return guard.response;

  const { provider } = await context.params;
  const parsed = AccountBridgeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid social sync payload", details: parsed.error.flatten() }, { status: 400 });

  const result = await persistAccountBridge({
    kind: "social",
    provider: normaliseProvider(provider),
    action: "sync",
    accountName: parsed.data.account_name,
    accountId: parsed.data.account_id || undefined,
    customerId: parsed.data.customer_id || undefined,
    protectedFields: parsed.data.credentials,
    actor: actorForClosure(guard.context)
  });

  return NextResponse.json({ ok: result.ok, bridge_ready: result.bridge_ready, skipped: result.skipped, warnings: result.warnings, ids: result.ids, next_step: result.ok ? "Review synced inbox, drafts and leads before publishing or conversion." : "Check sync audit persistence." }, { status: result.ok ? 200 : 503 });
}
