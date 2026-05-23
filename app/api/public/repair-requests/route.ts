import { handlePublicRepairRequest } from "@/lib/public-repair-request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handlePublicRepairRequest(request);
}
