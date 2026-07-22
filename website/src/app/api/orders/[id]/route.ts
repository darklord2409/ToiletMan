import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/server/backendClient";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await authedFetch(`/storefront/orders/${id}`);
  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}
