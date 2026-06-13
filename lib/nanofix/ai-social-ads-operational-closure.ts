import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import type { AdminContext } from "@/lib/nanofix/auth";

export type ClosureInsertResult = {
  table: string;
  ok: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
};

export type ClosurePersistenceResult = {
  ok: boolean;
  skipped: boolean;
  bridge_ready: boolean;
  warnings: string[];
  inserts: ClosureInsertResult[];
  ids: Record<string, unknown>;
};

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type BaseActor = {
  actor_id: string | null;
  actor_role: string;
  actor_email?: string;
};

export function actorForClosure(context: AdminContext | null | undefined): BaseActor {
  return {
    actor_id: context?.actorId || null,
    actor_role: context?.role || "system",
    actor_email: context?.email
  };
}

export function normaliseProvider(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "unknown";
}

export function summariseProtectedFields(values: Record<string, unknown> | undefined) {
  const source = values || {};
  const fields = Object.keys(source).sort();
  const digestInput = fields.map((key) => `${key}:${String(source[key] ?? "").length}`).join("|");
  return {
    provided_fields: fields,
    field_digest: createHash("sha256").update(digestInput || "empty").digest("hex"),
    storage_policy: "protected field values are not persisted by this V28.9 closure helper"
  };
}

export async function safeInsert(
  supabase: SupabaseAdminClient,
  table: string,
  record: Record<string, unknown>,
  selectColumns = "created_at"
): Promise<ClosureInsertResult> {
  try {
    const result = await supabase.from(table).insert(record).select(selectColumns).single();
    if (result.error) return { table, ok: false, data: null, error: result.error.message };
    return { table, ok: true, data: (result.data as Record<string, unknown> | null) || null, error: null };
  } catch (error) {
    return { table, ok: false, data: null, error: error instanceof Error ? error.message : "Unknown insert error" };
  }
}

function buildResult(inserts: ClosureInsertResult[], requiredTables: string[]): ClosurePersistenceResult {
  const requiredOk = inserts.filter((item) => requiredTables.includes(item.table)).every((item) => item.ok);
  const warnings = inserts.filter((item) => !item.ok).map((item) => `${item.table}: ${item.error || "insert failed"}`);
  const ids: Record<string, unknown> = {};
  for (const item of inserts) {
    if (!item.data) continue;
    for (const [key, value] of Object.entries(item.data)) ids[`${item.table}.${key}`] = value;
  }
  return { ok: requiredOk, skipped: false, bridge_ready: requiredOk, warnings, inserts, ids };
}

function notConfigured(): ClosurePersistenceResult {
  return { ok: false, skipped: true, bridge_ready: false, warnings: ["Supabase is not configured"], inserts: [], ids: {} };
}

export async function persistAccountBridge(input: {
  kind: "social" | "ads";
  provider: string;
  action: "connect" | "test" | "sync";
  accountName: string;
  accountId?: string;
  customerId?: string;
  protectedFields?: Record<string, unknown>;
  actor: BaseActor;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return notConfigured();

  const now = new Date().toISOString();
  const provider = normaliseProvider(input.provider);
  const metadata = {
    closure: "v28.9-ai-social-ads-operational-closure",
    kind: input.kind,
    provider,
    action: input.action,
    account_name: input.accountName,
    account_id: input.accountId || null,
    customer_id: input.customerId || null,
    protected_field_summary: summariseProtectedFields(input.protectedFields),
    next_step: input.action === "connect" ? "test_connection_then_sync" : input.action === "test" ? "sync_when_test_passes" : "review_synced_records"
  };

  const inserts: ClosureInsertResult[] = [];
  inserts.push(await safeInsert(supabase, "audit_logs", {
    actor_id: input.actor.actor_id,
    actor_role: input.actor.actor_role,
    action: `${input.kind}_${input.action}_bridge`,
    object_type: `${input.kind}_account_bridge`,
    object_id: null,
    after_data: metadata,
    created_at: now
  }));
  inserts.push(await safeInsert(supabase, "notification_outbox", {
    channel: "internal",
    recipient: "operations",
    subject: `${input.kind.toUpperCase()} ${provider} ${input.action} bridge`,
    body: `${input.accountName} ${input.action} was recorded for ${provider}. Protected values were not persisted by this closure route.`,
    status: input.action === "sync" ? "queued" : "draft",
    payload: metadata,
    created_at: now
  }));

  return buildResult(inserts, ["audit_logs"]);
}

export async function persistAiContentDraft(input: {
  module: string;
  channel: string;
  title: string;
  prompt: string;
  draftBody: string;
  targetUrl?: string;
  actor: BaseActor;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return notConfigured();

  const now = new Date().toISOString();
  const payload = {
    closure: "v28.9-ai-social-ads-operational-closure",
    module: input.module,
    channel: input.channel,
    title: input.title,
    target_url: input.targetUrl || null,
    approval_gate: "pending_human_review_before_public_publish",
    actor_role: input.actor.actor_role
  };

  const inserts: ClosureInsertResult[] = [];
  inserts.push(await safeInsert(supabase, "content_drafts", {
    source_module: input.module,
    channel: input.channel,
    title: input.title,
    status: "pending_review",
    draft_body: input.draftBody,
    payload,
    created_at: now
  }));
  inserts.push(await safeInsert(supabase, "ai_logs", {
    module: input.module,
    action: "content_draft_created",
    prompt: input.prompt,
    response: input.draftBody,
    metadata: payload,
    created_at: now
  }));
  inserts.push(await safeInsert(supabase, "audit_logs", {
    actor_id: input.actor.actor_id,
    actor_role: input.actor.actor_role,
    action: "ai_content_draft_create_pending_review",
    object_type: "content_draft",
    object_id: null,
    after_data: payload,
    created_at: now
  }));

  return buildResult(inserts, ["audit_logs"]);
}

export async function persistLeadServiceRequestBridge(input: {
  sourcePlatform: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
  postalCode?: string;
  issueType: string;
  message: string;
  priority?: string;
  actor: BaseActor;
  attribution?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return notConfigured();

  const now = new Date().toISOString();
  const priority = input.priority || (/urgent|leak|ceiling|burst|flood/i.test(`${input.issueType} ${input.message}`) ? "P0" : "P1");
  const extractedData = {
    name: input.contactName,
    phone: input.phone,
    email: input.email || null,
    address: input.address || null,
    postal_code: input.postalCode || null,
    issue_type: input.issueType,
    source_platform: input.sourcePlatform,
    attribution: input.attribution || null
  };

  const inserts: ClosureInsertResult[] = [];
  const intake = await safeInsert(supabase, "unified_intake", {
    source_platform: input.sourcePlatform,
    raw_message: input.message,
    extracted_data: extractedData,
    priority,
    urgency_score: priority === "P0" ? 95 : 72,
    created_at: now
  }, "intake_id,created_at");
  inserts.push(intake);

  const lead = await safeInsert(supabase, "leads", {
    intake_id: intake.data?.intake_id || null,
    name: input.contactName,
    phone: input.phone,
    email: input.email || null,
    address: input.address || null,
    source_platform: input.sourcePlatform,
    binding_status: "pending",
    priority,
    urgency_score: priority === "P0" ? 95 : 72,
    status: "new",
    ai_extracted_data: extractedData,
    created_at: now
  }, "lead_id,created_at");
  inserts.push(lead);

  const serviceRequest = await safeInsert(supabase, "service_requests", {
    intake_id: intake.data?.intake_id || null,
    lead_id: lead.data?.lead_id || null,
    customer_id: null,
    contact_name: input.contactName,
    phone: input.phone,
    email: input.email || null,
    issue_type: input.issueType,
    address_text: input.address || null,
    postal_code: input.postalCode || null,
    binding_status: "pending",
    priority,
    status: "pending_review",
    source_platform: input.sourcePlatform,
    created_at: now
  }, "service_request_id,created_at");
  inserts.push(serviceRequest);

  inserts.push(await safeInsert(supabase, "internal_inbox_messages", {
    source_platform: input.sourcePlatform,
    sender_name: input.contactName,
    sender_contact: input.phone,
    message_body: input.message,
    status: "converted_to_service_request",
    ai_summary: input.issueType,
    payload: extractedData,
    created_at: now
  }));

  inserts.push(await safeInsert(supabase, "audit_logs", {
    actor_id: input.actor.actor_id,
    actor_role: input.actor.actor_role,
    action: "social_or_ad_lead_to_service_request",
    object_type: "service_request",
    object_id: typeof serviceRequest.data?.service_request_id === "string" ? serviceRequest.data.service_request_id : null,
    after_data: {
      intake_id: intake.data?.intake_id || null,
      lead_id: lead.data?.lead_id || null,
      service_request_id: serviceRequest.data?.service_request_id || null,
      source_platform: input.sourcePlatform,
      attribution: input.attribution || null
    },
    created_at: now
  }));

  return buildResult(inserts, ["unified_intake", "leads", "service_requests"]);
}
