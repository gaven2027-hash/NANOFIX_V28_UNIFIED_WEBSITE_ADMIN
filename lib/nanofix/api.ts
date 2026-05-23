import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(error: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

export function validationError(error: ZodError) {
  return fail(
    "Invalid request payload",
    400,
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }))
  );
}

export async function readJsonOrForm(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return request.json();
  }
  return Object.fromEntries((await request.formData()).entries());
}

export function nextRunPreview(timezone: string, count = 3) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const next = new Date(now);
    next.setDate(now.getDate() + index + 1);
    return {
      run_at: next.toISOString(),
      timezone
    };
  });
}
