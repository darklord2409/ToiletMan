import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/server/backendClient";

export async function GET() {
  const response = await authedFetch("/customer-auth/me");
  if (!response.ok) {
    return NextResponse.json(null, { status: response.status === 401 ? 401 : response.status });
  }
  return NextResponse.json(await response.json());
}
