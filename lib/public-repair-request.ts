import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { checkRateLimit, clientIpFromRequest } from "@/lib/nanofix/security";

const PublicRepairRequestSchema = z.object({
  customer_name: z.string().trim().min(1).max(120).optional(),
  customerName: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(6).max(40),
  email: z.string().email().optional().or(z.literal("")),
  postal_code: z.string().trim().max(12).optional().or(z.literal("")),
  postalCode: z.string().trim().max(12).optional().or(z.literal("")),
  address_text: z.string().trim().max(400).optional().or(z.literal("")),
  fullAddress: z.string().trim().max(400).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  property_type: z.string().trim().max(80).optional().or(z.literal("")),
  propertyType: z.string().trim().max(80).optional().or(z.literal("")),
  issue_type: z.string().trim().max(160).optional().or(z.literal("")),
  leakageType: z.string().trim().max(160).optional().or(z.literal("")),
  serviceType: z.string().trim().max(160).optional().or(z.literal("")),
  service: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().max(3000).optional().or(z.literal("")),
  issueDescription: z.string().trim().max(3000).optional().or(z.literal("")),
  source_form: z.string().trim().max(120).optional().or(z.literal("")),
  source: z.string().trim().max(120).optional().or(z.literal("")),
  pdpa_consent: z.coerce.boolean().optional().default(true),
  consent: z.coerce.boolean().optional(),
  website_honeypot: z.string().max(0).optional().or(z.literal("")),
  company_website: z.string().trim().max(200).optional().or(z.literal("")),
  form_started_at: z.string().trim().max(32).optional().or(z.literal("")),
  cf_turnstile_response: z.string().trim().max(2048).optional().or(z.literal(""))
});

type ParsedRepairRequest = z.infer<typeof PublicRepairRequestSchema>;

type PreparedUpload = {
  buffer: Buffer;
  storageName: string;
  originalName: string;
  mimeType: string;
  size: number;
};

function isJpeg(buffer: Buffer) {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer: Buffer) {
  return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function isGif(buffer: Buffer) {
  return buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a";
}

function isWebp(buffer: Buffer) {
  return buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

function isPdf(buffer: Buffer) {
  return buffer.length > 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function isMp4Like(buffer: Buffer) {
  if (buffer.length < 12) return false;
  const box = buffer.subarray(4, 8).toString("ascii");
  if (box !== "ftyp") return false;
  const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
  return ["isom", "iso2", "mp41", "mp42", "avc1", "m4v ", "qt  ", "heic", "heix", "hevc"].includes(brand);
}

function detectMime(buffer: Buffer): { mimeType: string; extension: string; kind: "image" | "video" | "document" } | null {
  if (isJpeg(buffer)) return { mimeType: "image/jpeg", extension: "jpg", kind: "image" };
  if (isPng(buffer)) return { mimeType: "image/png", extension: "png", kind: "image" };
  if (isGif(buffer)) return { mimeType: "image/gif", extension: "gif", kind: "image" };
  if (isWebp(buffer)) return { mimeType: "image/webp", extension: "webp", kind: "image" };
  if (isMp4Like(buffer)) return { mimeType: "video/mp4", extension: "mp4", kind: "video" };
  if (isPdf(buffer)) return { mimeType: "application/pdf", extension: "pdf", kind: "document" };
  return null;
}


async function checkSupabaseRateLimit(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  request: Request,
  options: { namespace: string; max: number; windowMs: number }
) {
  const now = Date.now();
  const windowStartMs = Math.floor(now / options.windowMs) * options.windowMs;
  const windowStart = new Date(windowStartMs).toISOString();
  const resetAt = windowStartMs + options.windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  const fingerprintHash = createHash("sha256")
    .update([options.namespace, clientIpFromRequest(request), request.headers.get("user-agent") || "unknown"].join("|"))
    .digest("hex");

  const { data: existing, error: readError } = await supabase
    .from("form_rate_limits")
    .select("rate_limit_id, request_count, blocked_until")
    .eq("fingerprint_hash", fingerprintHash)
    .eq("form_name", options.namespace)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (readError) {
    return { limited: false, storage: "memory_fallback", retryAfterSeconds: 0 };
  }

  if (existing?.blocked_until && new Date(existing.blocked_until).getTime() > now) {
    return { limited: true, storage: "supabase", retryAfterSeconds };
  }

  if (existing?.rate_limit_id) {
    const nextCount = Number(existing.request_count || 0) + 1;
    await supabase
      .from("form_rate_limits")
      .update({
        request_count: nextCount,
        blocked_until: nextCount > options.max ? new Date(resetAt).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("rate_limit_id", existing.rate_limit_id);

    return { limited: nextCount > options.max, storage: "supabase", retryAfterSeconds };
  }

  await supabase.from("form_rate_limits").insert({
    fingerprint_hash: fingerprintHash,
    form_name: options.namespace,
    window_start: windowStart,
    request_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  return { limited: false, storage: "supabase", retryAfterSeconds: 0 };
}

async function prepareUploads(files: File[]) {
  const maxFiles = Number(process.env.NANOFIX_PUBLIC_FORM_MAX_FILES || 6);
  const maxImageBytes = Number(process.env.NANOFIX_PUBLIC_FORM_MAX_IMAGE_BYTES || 15 * 1024 * 1024);
  const maxVideoBytes = Number(process.env.NANOFIX_PUBLIC_FORM_MAX_VIDEO_BYTES || 80 * 1024 * 1024);
  const maxDocumentBytes = Number(process.env.NANOFIX_PUBLIC_FORM_MAX_DOCUMENT_BYTES || 10 * 1024 * 1024);

  if (files.length > maxFiles) {
    throw new Error(`Maximum ${maxFiles} media files are allowed per request.`);
  }

  const prepared: PreparedUpload[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectMime(buffer);
    if (!detected) {
      throw new Error("Unsupported or unsafe upload file type. Only real image, video or PDF files are accepted.");
    }

    const maxBytes =
      detected.kind === "image" ? maxImageBytes : detected.kind === "video" ? maxVideoBytes : maxDocumentBytes;
    if (buffer.length > maxBytes) {
      throw new Error(`${file.name || "Upload"} exceeds the allowed ${Math.round(maxBytes / 1024 / 1024)}MB limit.`);
    }

    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 20);
    prepared.push({
      buffer,
      storageName: `${Date.now()}-${randomUUID()}-${hash}.${detected.extension}`,
      originalName: file.name || `upload.${detected.extension}`,
      mimeType: detected.mimeType,
      size: buffer.length
    });
  }
  return prepared;
}

async function readPublicRepairRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return { payload: await request.json(), files: [] as File[] };
  }

  const form = await request.formData();
  const payload: Record<string, unknown> = {};
  const files: File[] = [];
  for (const [key, value] of form.entries()) {
    if (value instanceof File) {
      if (value.size > 0) files.push(value);
    } else {
      payload[key] = value;
    }
  }
  return { payload, files };
}

function sanitizeForAudit(value: string | null | undefined) {
  if (!value) return null;
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function normalizeRepairRequest(data: ParsedRepairRequest, request: Request) {
  const now = new Date().toISOString();
  const customerName = data.customer_name || data.customerName || data.name || "";
  const issueType =
    data.issue_type || data.leakageType || data.serviceType || data.service || "Free Leak Inspection & Quote";

  return {
    customer_name: customerName,
    phone: data.phone,
    email: data.email || null,
    postal_code: data.postal_code || data.postalCode || null,
    address_text: data.address_text || data.fullAddress || data.address || null,
    property_type: data.property_type || data.propertyType || null,
    issue_type: issueType,
    message: data.message || data.issueDescription || null,
    source_form: data.source_form || data.source || "website_public_repair_request",
    pdpa_consent: data.pdpa_consent ?? data.consent ?? true,
    binding_status: "pending",
    business_semantic: "Free Leak Inspection & Quote",
    user_agent: request.headers.get("user-agent"),
    created_at: now,
    updated_at: now
  };
}

async function insertOutbox(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  payload: Record<string, unknown>,
  status: "queued" | "sent" | "failed",
  lastError?: string
) {
  if (!supabase) return;
  await supabase.from("integration_outbox").insert({
    event_type: "website.public_repair_request",
    destination: "central_admin_repair_intake",
    payload,
    status,
    attempts: status === "failed" ? 1 : 0,
    last_error: lastError ?? null,
    next_run_at: status === "failed" ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

async function forwardToAdmin(payload: Record<string, unknown>) {
  if (process.env.ADMIN_WEBHOOK_ENABLED === "false") return { skipped: true };
  const url = process.env.ADMIN_REPAIR_REQUEST_URL;
  if (!url) return { skipped: true };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET
        ? { "x-webhook-secret": process.env.ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET }
        : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`Admin webhook failed with ${response.status}`);
  return { skipped: false };
}

function publicFormRequiresStorage() {
  return true;
}

function isLikelyBot(data: ParsedRepairRequest) {
  if (data.company_website && data.company_website.trim().length > 0) return true;
  if (data.website_honeypot && data.website_honeypot.trim().length > 0) return true;
  const startedAt = Number(data.form_started_at || 0);
  return Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < 800;
}

async function verifyTurnstile(token: string | undefined, request: Request) {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) form.append("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

export async function handlePublicRepairRequest(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: "public-repair-request",
    max: Number(process.env.NANOFIX_PUBLIC_FORM_RATE_LIMIT_MAX || 8),
    windowMs: Number(process.env.NANOFIX_PUBLIC_FORM_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)
  });

  if (rateLimit.limited) {
    return fail("Too many submissions. Please try again later or contact us by WhatsApp.", 429, {
      retry_after_seconds: rateLimit.retryAfterSeconds
    });
  }

  const { payload, files } = await readPublicRepairRequest(request);
  const parsed = PublicRepairRequestSchema.safeParse(payload);
  if (!parsed.success) return validationError(parsed.error);

  if (isLikelyBot(parsed.data)) {
    return fail("Spam protection rejected this submission", 403);
  }

  const turnstileOk = await verifyTurnstile(parsed.data.cf_turnstile_response, request);
  if (!turnstileOk) return fail("Bot verification failed", 403);

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const persistentRateLimit = await checkSupabaseRateLimit(supabase, request, {
      namespace: "public-repair-request",
      max: Number(process.env.NANOFIX_PUBLIC_FORM_RATE_LIMIT_MAX || 8),
      windowMs: Number(process.env.NANOFIX_PUBLIC_FORM_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)
    });
    if (persistentRateLimit.limited) {
      return fail("Too many submissions. Please try again later or contact us by WhatsApp.", 429, {
        retry_after_seconds: persistentRateLimit.retryAfterSeconds,
        rate_limit_storage: persistentRateLimit.storage
      });
    }
  }

  let preparedUploads: PreparedUpload[] = [];
  try {
    preparedUploads = await prepareUploads(files);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Upload validation failed", 400);
  }

  const publicPayload = normalizeRepairRequest(parsed.data, request);
  if (!supabase && publicFormRequiresStorage()) {
    return fail(
      "Repair request storage is not configured. Please contact NANOFIX by WhatsApp while we restore online submissions.",
      503
    );
  }

  let intakeId: string | null = null;
  let leadId: string | null = null;
  let serviceRequestId: string | null = null;

  if (supabase) {
    const { data: intake, error: intakeError } = await supabase
      .from("unified_intake")
      .insert({
        source_platform: "website_quick_repair",
        source: "website",
        source_form: publicPayload.source_form,
        raw_message: publicPayload.message,
        extracted_data: publicPayload,
        customer_name: publicPayload.customer_name,
        phone: publicPayload.phone,
        email: publicPayload.email,
        postal_code: publicPayload.postal_code,
        address_text: publicPayload.address_text,
        property_type: publicPayload.property_type,
        issue_type: publicPayload.issue_type,
        message: publicPayload.message,
        pdpa_consent: publicPayload.pdpa_consent,
        binding_status: "pending",
        status: "new",
        created_at: publicPayload.created_at
      })
      .select("intake_id")
      .single();

    if (intakeError) return fail("Repair intake storage failed", 500, intakeError.message);
    intakeId = intake?.intake_id ?? null;

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        intake_id: intakeId,
        source_platform: "website_quick_repair",
        name: publicPayload.customer_name,
        phone: publicPayload.phone,
        email: publicPayload.email,
        address_text: publicPayload.address_text,
        issue_type: publicPayload.issue_type,
        message: publicPayload.message,
        status: "new",
        binding_status: "pending",
        created_at: publicPayload.created_at,
        updated_at: publicPayload.updated_at
      })
      .select("lead_id")
      .single();

    if (leadError) return fail("Lead storage failed", 500, leadError.message);
    leadId = lead?.lead_id ?? null;

    const { data: serviceRequest, error: serviceRequestError } = await supabase
      .from("service_requests")
      .insert({
        intake_id: intakeId,
        lead_id: leadId,
        customer_id: null,
        source_platform: "website_quick_repair",
        binding_status: "pending",
        priority: "P2",
        status: "pending_review",
        contact_name: publicPayload.customer_name,
        phone: publicPayload.phone,
        whatsapp: publicPayload.phone,
        email: publicPayload.email,
        issue_type: publicPayload.issue_type,
        address_text: publicPayload.address_text,
        postal_code: publicPayload.postal_code,
        leak_location: publicPayload.issue_type,
        issue_description: publicPayload.message,
        property_type: publicPayload.property_type,
        property_address: publicPayload.address_text,
        consent: publicPayload.pdpa_consent,
        user_agent: publicPayload.user_agent,
        created_at: publicPayload.created_at,
        updated_at: publicPayload.updated_at
      })
      .select("service_request_id")
      .single();

    if (serviceRequestError) return fail("Service request creation failed", 500, serviceRequestError.message);
    serviceRequestId = serviceRequest?.service_request_id ?? null;

    await supabase.from("audit_logs").insert({
      actor_role: "public",
      action: "public_repair_request.created",
      object_type: "unified_intake",
      object_id: intakeId,
      after_data: {
        phone: sanitizeForAudit(String(publicPayload.phone)),
        email: sanitizeForAudit(String(publicPayload.email ?? "")),
        issue_type: publicPayload.issue_type,
        source_form: publicPayload.source_form,
        file_count: preparedUploads.length,
        service_request_id: serviceRequestId
      },
      created_at: new Date().toISOString()
    });

    for (const file of preparedUploads) {
      const storagePath = `${intakeId ?? "unbound"}/${file.storageName}`;
      const { error: uploadError } = await supabase.storage
        .from("lead-attachments")
        .upload(storagePath, file.buffer, {
          contentType: file.mimeType,
          cacheControl: "31536000",
          upsert: false
        });

      if (!uploadError) {
        await supabase.from("lead_attachments").insert({
          lead_id: leadId,
          intake_id: intakeId,
          storage_bucket: "lead-attachments",
          storage_path: storagePath,
          file_name: file.originalName.replace(/[^a-zA-Z0-9._ -]/g, "_"),
          file_type: file.mimeType,
          file_size_bytes: file.size,
          created_at: new Date().toISOString()
        });
      }
    }
  }

  const outboxPayload = { ...publicPayload, intake_id: intakeId, lead_id: leadId, service_request_id: serviceRequestId };
  let forwarding: "skipped" | "sent" | "queued_for_retry" = "skipped";
  try {
    const forwarded = await forwardToAdmin(outboxPayload);
    forwarding = forwarded.skipped ? "skipped" : "sent";
    await insertOutbox(supabase, outboxPayload, forwarded.skipped ? "queued" : "sent");
  } catch (error) {
    forwarding = "queued_for_retry";
    await insertOutbox(supabase, outboxPayload, "failed", error instanceof Error ? error.message : "unknown");
  }

  return ok({
    intake_id: intakeId,
    lead_id: leadId,
    service_request_id: serviceRequestId,
    binding_status: "pending",
    business_semantic: "Free Leak Inspection & Quote",
    storage: "supabase",
    forwarding
  });
}
