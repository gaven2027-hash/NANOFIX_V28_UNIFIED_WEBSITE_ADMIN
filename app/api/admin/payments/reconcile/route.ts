import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { fail, ok, validationError } from "@/lib/nanofix/api";
import { requireAdmin } from "@/lib/nanofix/auth";

export const dynamic = "force-dynamic";

const PaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  gateway: z.string().trim().min(2).max(80).default("manual"),
  transaction_id: z.string().trim().min(3).max(160)
});

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, "write:finance");
  if (response) return response;
  const parsed = PaymentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error);
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail("Supabase is required for payment reconciliation", 503);
  const { data, error } = await supabase.rpc("record_payment_and_reconcile", {
    p_invoice_id: parsed.data.invoice_id,
    p_amount: parsed.data.amount,
    p_gateway: parsed.data.gateway,
    p_transaction_id: parsed.data.transaction_id,
    p_actor_id: context?.actorId === "env-token-admin" ? null : context?.actorId ?? null,
    p_actor_role: context?.role ?? "finance_admin"
  });
  if (error) return fail("Payment reconciliation failed", 409, error.message);
  return ok({ storage: "supabase_rpc", reconciliation: data });
}
