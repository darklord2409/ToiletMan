import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/server/backendClient";
import { isTrustedOrigin } from "@/lib/server/csrf";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const payload = await request.json();
  const response = await authedFetch(`/storefront/cart/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const response = await authedFetch(`/storefront/cart/items/${id}`, { method: "DELETE" });
  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}
