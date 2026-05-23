import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

const ServiceRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  postalCode: z.string().trim().max(12).optional().or(z.literal("")),
  issueType: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  sourcePlatform: z.string().trim().max(80).optional().default("website_quick_repair"),
  registrationMode: z.enum(["quick_repair", "registration", "registration_with_repair"]).default("quick_repair")
});

function estimatePriority(issue: string) {
  const normalized = issue.toLowerCase();
  if (/(urgent|leak|ceiling|burst|flood|complaint|warranty)/i.test(normalized)) return "P0";
  if (/(same day|inspection|quote|bathroom|toilet|seepage)/i.test(normalized)) return "P1";
  return "P2";
}

export async function POST(request: Request) {
  const { response } = requireAdmin(request, "write:operations");
  if (response) return response;

  const contentType = request.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());

  const parsed = ServiceRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid service request payload" }, { status: 400 });
  }

  const data = parsed.data;
  const issueText = [data.issueType, data.message].filter(Boolean).join(" ");
  const priority = estimatePriority(issueText);
  const now = new Date().toISOString();

  const intake = {
    source_platform: data.sourcePlatform,
    raw_message: data.message || null,
    extracted_data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      postal_code: data.postalCode || null,
      issue_type: data.issueType || null,
      registration_mode: data.registrationMode
    },
    priority,
    urgency_score: priority === "P0" ? 95 : priority === "P1" ? 72 : 40,
    created_at: now
  };

  const serviceRequest = {
    customer_id: null,
    issue_type: data.issueType || "Repair request",
    address_text: data.address || null,
    postal_code: data.postalCode || null,
    binding_status: data.registrationMode === "registration_with_repair" ? "linked" : "pending",
    priority,
    status: "pending_review",
    source_platform: data.sourcePlatform,
    created_at: now
  };

  const lead = {
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    address: data.address || null,
    source_platform: data.sourcePlatform,
    binding_status: serviceRequest.binding_status,
    priority,
    urgency_score: intake.urgency_score,
    status: "new",
    ai_extracted_data: intake.extracted_data,
    created_at: now
  };

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { data: intakeRow, error: intakeError } = await supabase
      .from("unified_intake")
      .insert(intake)
      .select("intake_id")
      .single();

    if (intakeError) {
      return NextResponse.json({ ok: false, error: "Intake creation failed" }, { status: 500 });
    }

    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .insert({ ...lead, intake_id: intakeRow?.intake_id || null })
      .select("lead_id")
      .single();

    if (leadError) {
      return NextResponse.json({ ok: false, error: "Lead creation failed" }, { status: 500 });
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("service_requests")
      .insert({
        ...serviceRequest,
        intake_id: intakeRow?.intake_id || null,
        lead_id: leadRow?.lead_id || null
      })
      .select("service_request_id")
      .single();

    if (requestError) {
      return NextResponse.json({ ok: false, error: "Service request creation failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      source: "supabase",
      intakeId: intakeRow?.intake_id,
      leadId: leadRow?.lead_id,
      serviceRequestId: requestRow?.service_request_id,
      priority
    });
  }

  return NextResponse.json({
    ok: false,
    error: "Supabase is not configured. Public repair requests must be stored in unified_intake, leads and service_requests."
  }, { status: 503 });
}
