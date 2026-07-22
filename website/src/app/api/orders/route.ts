import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/server/backendClient";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  const response = await authedFetch(`/storefront/orders${search}`);
  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}
