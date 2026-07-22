import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/server/backendClient";
import { isTrustedOrigin } from "@/lib/server/csrf";

export async function GET() {
  const response = await authedFetch("/storefront/cart");
  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  const payload = await request.json();
  const response = await authedFetch("/storefront/cart/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}

export async function DELETE() {
  const response = await authedFetch("/storefront/cart", { method: "DELETE" });
  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}
