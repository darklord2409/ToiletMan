import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/locales";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export const config = {
  // Skip API routes, Next internals, and static/media assets.
  matcher: ["/((?!api|_next|media|.*\\..*).*)"],
};
