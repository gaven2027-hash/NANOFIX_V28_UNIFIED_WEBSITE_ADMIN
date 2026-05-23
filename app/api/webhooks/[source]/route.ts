import { auditLog, insertIfConfigured } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/nanofix/api";
import { verifyWebhookSignature } from "@/lib/nanofix/security";

export const dynamic = "force-dynamic";

function webhookSecretForSource(source: string) {
  const normalized = source.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return process.env[`NANOFIX_WEBHOOK_SECRET_${normalized}`] || process.env.NANOFIX_WEBHOOK_SECRET;
}

export async function POST(request: Request, { params }: { params: Promise<{ source: string }> }) {
  const resolvedParams = await params;
  const rawBody = await request.text();
  const secret = webhookSecretForSource(resolvedParams.source);
  const signature =
    request.headers.get("x-nanofix-signature") ||
    request.headers.get("x-hub-signature-256") ||
    request.headers.get("x-signature");

  if (secret) {
    const verified = verifyWebhookSignature(rawBody, request, secret);
    if (!verified) return fail("Invalid webhook signature", 401);
  } else if (process.env.NODE_ENV === "production") {
    return fail("Webhook secret is not configured", 503);
  }

  const eventId =
    request.headers.get("x-event-id") ||
    request.headers.get("x-request-id") ||
    `${resolvedParams.source}-${Date.now()}`;

  const inserted = await insertIfConfigured("inbound_events", {
    source: resolvedParams.source,
    external_event_id: eventId,
    signature_present: Boolean(signature),
    payload_raw: rawBody,
    payload: (() => {
      try {
        return JSON.parse(rawBody);
      } catch {
        return null;
      }
    })(),
    status: "accepted",
    received_at: new Date().toISOString()
  });

  if (inserted.skipped) return fail("Supabase is not configured for webhook storage", 503);

  if (inserted.error) {
    const duplicate = String(inserted.error.message || "").toLowerCase().includes("duplicate");
    if (duplicate) {
      return ok({
        accepted: true,
        duplicate: true,
        rule: "Duplicate webhook event ignored by source + external_event_id idempotency."
      });
    }
    return fail("Webhook event storage failed", 500, inserted.error.message);
  }

  await auditLog({
    actor_role: "system",
    action: "webhook.accepted",
    target_table: "inbound_events",
    target_id: inserted.data?.inbound_event_id ?? null,
    metadata: { source: resolvedParams.source, event_id: eventId, signature_verified: Boolean(secret) }
  });

  return ok({
    accepted: true,
    inbound_event_id: inserted.data?.inbound_event_id ?? null,
    rule: "Inbound event accepted for async processing. Downstream failures must use retry queue and DLQ.",
    storage: "supabase"
  });
}
