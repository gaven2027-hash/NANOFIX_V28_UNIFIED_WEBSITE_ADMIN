import { ok } from "@/lib/nanofix/api";
import { systemModules, SYSTEM_FOUNDATION_VERSION } from "@/lib/nanofix/module-contracts";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({
    version: SYSTEM_FOUNDATION_VERSION,
    total_modules: systemModules.length,
    modules: systemModules
  });
}
