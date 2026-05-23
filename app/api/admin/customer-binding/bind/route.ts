import { z } from "zod";
import { auditLog, createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

const BindSchema = z.object({
  customer_id: z.string().uuid(),
  record_type: z.enum(["service_requests", "leads"]),
  record_id: z.string().uuid(),
  reason: z.string().trim().min(3).max(500)
});

const primaryKeyByRecordType = {
  service_requests: "service_request_id",
  leads: "lead_id"
} as const;

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, "write:customers");
  if (response) return response;

  const payload = await request.json();
  const parsed = BindSchema.safeParse(payload);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is not configured for customer binding writes", 503);

  const { error } = await supabase
    .from(parsed.data.record_type)
    .update({
      customer_id: parsed.data.customer_id,
      binding_status: "linked",
      updated_at: new Date().toISOString()
    })
    .eq(primaryKeyByRecordType[parsed.data.record_type], parsed.data.record_id);

  if (error) {
    return fail("Binding update failed", 500);
  }

  await auditLog({
    ...context,
    action: "customer_binding.linked",
    target_table: parsed.data.record_type,
    target_id: parsed.data.record_id,
    metadata: { customer_id: parsed.data.customer_id, reason: parsed.data.reason }
  });

  return ok({ status: "linked" });
}
