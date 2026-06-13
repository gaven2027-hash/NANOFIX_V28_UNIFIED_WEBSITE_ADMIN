import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/nanofix/auth";
import { actorForClosure, persistLeadServiceRequestBridge } from "@/lib/nanofix/ai-social-ads-operational-closure";

export const dynamic = "force-dynamic";

const SocialMessageConvertSchema = z.object({
  platform: z.string().trim().min(1).max(80).default("social"),
  contact_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  postal_code: z.string().trim().max(12).optional().or(z.literal("")),
  issue_type: z.string().trim().min(1).max(120).default("Social media repair enquiry"),
  message: z.string().trim().min(1).max(4000),
  priority: z.enum(["P0", "P1", "P2"]).optional(),
  source_message_id: z.string().trim().max(120).optional().or(z.literal(""))
});

export async function POST(request: NextRequest) {
  const guard = requireAdmin(request, "write:customers");
  if (guard.response) return guard.response;

  const parsed = SocialMessageConvertSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid social conversion payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const result = await persistLeadServiceRequestBridge({
    sourcePlatform: `social_${data.platform}`,
    contactName: data.contact_name,
    phone: data.phone,
    email: data.email || undefined,
    address: data.address || undefined,
    postalCode: data.postal_code || undefined,
    issueType: data.issue_type,
    message: data.message,
    priority: data.priority,
    actor: actorForClosure(guard.context),
    attribution: { source_message_id: data.source_message_id || null, platform: data.platform, conversion_path: "social_message_to_lead_service_request" }
  });

  return NextResponse.json({
    ok: result.ok,
    bridge_ready: result.bridge_ready,
    skipped: result.skipped,
    warnings: result.warnings,
    ids: result.ids,
    next_step: result.ok ? "Open Service Operations to qualify and assign the generated service request." : "Check unified_intake / leads / service_requests persistence."
  }, { status: result.ok ? 200 : 503 });
}
