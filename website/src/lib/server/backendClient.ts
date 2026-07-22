import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  cookieOptions,
} from "@/lib/server/cookies";
import type { TokenResponse } from "@/lib/server/types";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

async function rawFetch(path: string, init: RequestInit) {
  return fetch(`${BACKEND}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
}

export async function setSessionCookies(tokens: TokenResponse) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(ACCESS_COOKIE_MAX_AGE));
  store.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(REFRESH_COOKIE_MAX_AGE));
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

async function tryRefresh(): Promise<boolean> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return false;

  const response = await rawFetch("/customer-auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    await clearSessionCookies();
    return false;
  }
  const tokens = (await response.json()) as TokenResponse;
  await setSessionCookies(tokens);
  return true;
}

/** Authenticated backend call from a Route Handler. Attaches the access
 * cookie as a Bearer token, and on a 401 transparently refreshes via the
 * refresh cookie and retries once before giving up. */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;

  const attempt = async (token: string | undefined) =>
    rawFetch(path, {
      ...init,
      headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

  let response = await attempt(accessToken);
  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = (await cookies()).get(ACCESS_COOKIE)?.value;
      response = await attempt(newToken);
    }
  }
  return response;
}

export function backendOrigin(): string {
  return BACKEND;
}
