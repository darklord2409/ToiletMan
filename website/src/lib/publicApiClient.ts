// Anonymous storefront data only -- nothing here ever sends a token. Used
// both from Server Components (SSG/ISR, calls the backend directly server
// side) and from client components (via the same-origin /api/v1 path that
// Caddy/next.config.ts rewrites forward to the backend).
const isServer = typeof window === "undefined";

function baseUrl(): string {
  if (isServer) {
    // Server-side: skip the network hop through Caddy/rewrites and hit the
    // backend directly over the Docker-internal network.
    return `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000"}/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
}

export interface FetchOptions {
  /** Next.js ISR revalidation window in seconds. Ignored on the client. */
  revalidate?: number;
  searchParams?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function publicGet<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = new URL(`${baseUrl()}${path}`, isServer ? "http://internal" : window.location.origin);
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(isServer ? url.toString() : url.pathname + url.search, {
    next: isServer ? { revalidate: options.revalidate ?? 300 } : undefined,
    cache: isServer ? undefined : "no-store",
  });

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

/** Same as publicGet but resolves to null on 404 instead of throwing --
 * convenient for pages that call notFound() themselves. */
export async function publicGetOrNull<T>(path: string, options: FetchOptions = {}): Promise<T | null> {
  try {
    return await publicGet<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
