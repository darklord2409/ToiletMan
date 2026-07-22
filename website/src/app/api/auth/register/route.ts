import { NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/server/backendClient";
import { isTrustedOrigin } from "@/lib/server/csrf";
import type { TokenResponse } from "@/lib/server/types";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();

  const response = await fetch(`${BACKEND}/api/v1/customer-auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    return NextResponse.json(detail, { status: response.status });
  }

  const tokens = (await response.json()) as TokenResponse;
  await setSessionCookies(tokens);
  return NextResponse.json({ ok: true }, { status: 201 });
}
