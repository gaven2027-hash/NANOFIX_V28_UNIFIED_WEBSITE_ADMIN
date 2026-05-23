import { z } from "zod";
import { auditLog, createSupabaseAdminClient, insertIfConfigured } from "@/lib/supabase-server";
import { fail, ok, readJsonOrForm, validationError } from "@/lib/nanofix/api";
import { checkRateLimit } from "@/lib/nanofix/security";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().min(6).max(40),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  otp_verification_token: z.string().trim().min(12).max(200).optional(),
  otp_verified: z.coerce.boolean().optional().default(false),
  repair_request: z
    .object({
      issue_description: z.string().trim().min(5).max(3000),
      leak_location: z.string().trim().max(160).optional().or(z.literal("")),
      address: z.string().trim().max(400).optional().or(z.literal("")),
      preferred_time: z.string().trim().max(120).optional().or(z.literal(""))
    })
    .optional()
});

async function verifyOtpToken(token: string | undefined, contact: { email?: string; phone: string }) {
  if (process.env.NANOFIX_ALLOW_INSECURE_OTP_PREVIEW === "true") return true;
  if (!token) return false;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("otp_verifications")
    .select("otp_id, email, phone, status, expires_at, verified_at")
    .eq("verification_token", token)
    .eq("status", "verified")
    .maybeSingle();

  if (error || !data) return false;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return false;

  const emailMatches = contact.email && data.email && String(data.email).toLowerCase() === contact.email.toLowerCase();
  const phoneMatches = data.phone && String(data.phone).replace(/\s+/g, "") === contact.phone.replace(/\s+/g, "");
  return Boolean(emailMatches || phoneMatches);
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: "customer-register",
    max: Number(process.env.NANOFIX_REGISTER_RATE_LIMIT_MAX || 6),
    windowMs: Number(process.env.NANOFIX_REGISTER_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)
  });
  if (rateLimit.limited) {
    return fail("Too many registration attempts. Please try again later.", 429, {
      retry_after_seconds: rateLimit.retryAfterSeconds
    });
  }

  const payload = await readJsonOrForm(request);
  const parsed = RegisterSchema.safeParse(payload);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const otpIsValid = await verifyOtpToken(parsed.data.otp_verification_token, {
    email: parsed.data.email || undefined,
    phone: parsed.data.phone
  });

  if (!otpIsValid) {
    return fail("Email or mobile/WhatsApp OTP verification is required", 403);
  }

  const now = new Date().toISOString();
  const customer = {
    name: parsed.data.name,
    email: parsed.data.email || null,
    phone: parsed.data.phone,
    whatsapp: parsed.data.whatsapp || parsed.data.phone,
    status: "active",
    account_status: "active",
    created_at: now,
    updated_at: now
  };

  const insertedCustomer = await insertIfConfigured("customers", customer);
  if (insertedCustomer.skipped) {
    return fail("Customer registration storage is not configured", 503);
  }
  if (insertedCustomer.error) {
    return fail("Customer registration failed", 500, insertedCustomer.error.message);
  }

  let serviceRequestId: string | null = null;
  if (parsed.data.repair_request) {
    const insertedRequest = await insertIfConfigured("service_requests", {
      customer_id: typeof insertedCustomer.data?.customer_id === 'string' ? insertedCustomer.data.customer_id : null,
      source_platform: "customer_registration",
      binding_status: "linked",
      priority: "P2",
      status: "pending_review",
      contact_name: parsed.data.name,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp || parsed.data.phone,
      email: parsed.data.email || null,
      issue_type: parsed.data.repair_request.leak_location || "Repair request",
      address_text: parsed.data.repair_request.address || null,
      leak_location: parsed.data.repair_request.leak_location || null,
      issue_description: parsed.data.repair_request.issue_description,
      property_address: parsed.data.repair_request.address || null,
      preferred_time_text: parsed.data.repair_request.preferred_time || null,
      created_at: now,
      updated_at: now
    });

    if (insertedRequest.error) {
      return fail("Registration succeeded but repair request creation failed", 500, insertedRequest.error.message);
    }
    serviceRequestId = typeof insertedRequest.data?.service_request_id === 'string' ? insertedRequest.data.service_request_id : null;
  }

  await auditLog({
    actor_role: "customer",
    action: "customer.registered",
    target_table: "customers",
    target_id: typeof insertedCustomer.data?.customer_id === 'string' ? insertedCustomer.data.customer_id : null,
    metadata: { created_service_request: Boolean(serviceRequestId), otp_verified_server_side: true }
  });

  return ok({
    customer_id: typeof insertedCustomer.data?.customer_id === 'string' ? insertedCustomer.data.customer_id : null,
    service_request_id: serviceRequestId,
    rule: serviceRequestId
      ? "Registration + repair created a linked Service Request only. Formal Job requires admin review."
      : "Registration only created customer identity/profile. No business record was created.",
    storage: "supabase"
  });
}
