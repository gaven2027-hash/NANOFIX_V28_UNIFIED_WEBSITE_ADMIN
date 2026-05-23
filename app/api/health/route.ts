import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "nanofix-website",
    version: "v28.4",
    timestamp: new Date().toISOString()
  });
}
