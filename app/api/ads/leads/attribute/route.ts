import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/nanofix/auth";
import { actorForClosure, persistLeadServiceRequestBridge } from "@/lib/nanofix/ai-social-ads-operational-closure";

export const dynamic = "force-dynamic";

const PaidLeadAttributionSchema = z.object({
  provider: z.string().trim().min(1).max(80).default("google"),
  campaign_ref: z.string().trim().max(120).optional().or(z.literal("")),
  landing_page: z.string().trim().max(300).optional().or(z.literal("")),
  contact_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  postal_code: z.string().trim().max(12).optional().or(z.literal("")),
  issue_type: z.string().trim().min(1).max(120).default("Paid campaign repair enquiry"),
  message: z.string().trim().min(1).max(4000),
  priority: z.enum(["P0", "P1", "P2"]).optional()
});

export async function POST(request: NextRequest) {
  const guard = requireAdmin(request, "ad_approval.request");
  if (guard.response) return guard.response;

  const parsed = PaidLeadAttributionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid paid lead attribution payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const result = await persistLeadServiceRequestBridge({
    sourcePlatform: `paid_${data.provider}`,
    contactName: data.contact_name,
    phone: data.phone,
    email: data.email || undefined,
    address: data.address || undefined,
    postalCode: data.postal_code || undefined,
    issueType: data.issue_type,
    message: data.message,
    priority: data.priority,
    actor: actorForClosure(guard.context),
    attribution: {
      provider: data.provider,
      campaign_ref: data.campaign_ref || null,
      landing_page: data.landing_page || null,
      conversion_path: "paid_campaign_to_lead_service_request"
    }
  });

  return NextResponse.json({
    ok: result.ok,
    bridge_ready: result.bridge_ready,
    skipped: result.skipped,
    warnings: result.warnings,
    ids: result.ids,
    next_step: result.ok ? "Open Service Operations to qualify the paid lead and verify attribution." : "Check paid lead attribution persistence."
  }, { status: result.ok ? 200 : 503 });
}
