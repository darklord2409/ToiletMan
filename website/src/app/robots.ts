import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/media";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/*/cart", "/*/checkout", "/*/account", "/*/search", "/api/"],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
