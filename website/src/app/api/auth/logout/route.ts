import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authedFetch, clearSessionCookies } from "@/lib/server/backendClient";
import { REFRESH_COOKIE } from "@/lib/server/cookies";
import { isTrustedOrigin } from "@/lib/server/csrf";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  await authedFetch("/customer-auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => undefined);
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
