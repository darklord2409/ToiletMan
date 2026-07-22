import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales";
import { siteUrl } from "@/lib/media";
import { flattenCategories, getCategoryTree, listAllProductSlugs, listPublishedPages } from "@/lib/storefront";

const STATIC_PATHS = ["", "/about", "/contact", "/delivery", "/catalog"];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, productSlugs, pages] = await Promise.all([
    getCategoryTree(),
    listAllProductSlugs(),
    listPublishedPages(),
  ]);
  const categorySlugs = flattenCategories(categories).map((category) => category.slug);

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of STATIC_PATHS) {
      entries.push({ url: siteUrl(`/${locale}${path}`), changeFrequency: "daily" });
    }
    for (const slug of categorySlugs) {
      entries.push({ url: siteUrl(`/${locale}/category/${slug}`), changeFrequency: "daily" });
    }
    for (const slug of productSlugs) {
      entries.push({ url: siteUrl(`/${locale}/product/${slug}`), changeFrequency: "daily" });
    }
    for (const page of pages) {
      entries.push({ url: siteUrl(`/${locale}/pages/${page.slug}`), changeFrequency: "weekly" });
    }
  }

  return entries;
}
