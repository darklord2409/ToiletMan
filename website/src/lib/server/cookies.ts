// Cookie names/lifetimes for the BFF auth pattern -- httpOnly, never
// touched by client JS. Lifetimes mirror backend/app/core/config.py's
// ACCESS_TOKEN_EXPIRE_MINUTES (1440 = 24h) and REFRESH_TOKEN_EXPIRE_DAYS (30).
export const ACCESS_COOKIE = "tm_access";
export const REFRESH_COOKIE = "tm_refresh";
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h, seconds
export const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, seconds

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
