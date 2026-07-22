// SameSite=Lax on the session cookies already blocks them from being sent
// on cross-site fetch/XHR (Lax only attaches cookies to top-level GET
// navigations), which covers the real attack surface here since every
// mutating call in this app is a fetch POST/PATCH/DELETE, never a plain
// form submit. This Origin check is cheap defense-in-depth on top of that.
const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://toiletman.uz")
  .split(",")
  .map((origin) => origin.trim());

export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin requests often omit Origin entirely
  return ALLOWED_ORIGINS.includes(origin) || origin === "http://localhost:3000";
}
