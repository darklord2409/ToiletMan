import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/i18n/locales";
import { getBanners, getCategoryTree, getStoreSettings, listProducts } from "@/lib/storefront";
import { buildPageMetadata } from "@/lib/seo";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { CategoryCard } from "@/components/catalog/CategoryCard";
import { HeroCarousel } from "@/components/marketing/HeroCarousel";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getStoreSettings();
  const description = settings.about_text?.[locale] ?? undefined;
  return buildPageMetadata({
    title: settings.store_name || "ToiletMan",
    description,
    pathWithoutLocale: "",
    locale: locale as Locale,
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const tCatalog = await getTranslations({ locale, namespace: "catalog" });

  const [categories, featured, banners] = await Promise.all([
    getCategoryTree(),
    listProducts({ is_featured: true, page_size: 8 }),
    getBanners(),
  ]);

  const topCategories = categories.slice(0, 4);

  return (
    <div>
      {banners.length > 0 ? (
        <HeroCarousel
          banners={banners}
          locale={locale as Locale}
          title={t("heroTitle")}
          subtitle={t("heroSubtitle")}
          ctaLabel={t("heroCta")}
        />
      ) : (
        <section className="bg-brand-gradient px-6 py-16 text-center">
          <h1 className="mx-auto max-w-2xl text-3xl font-bold text-white sm:text-4xl">{t("heroTitle")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-ink-muted">{t("heroSubtitle")}</p>
          <Link
            href={`/${locale}/catalog`}
            className="mt-6 inline-block rounded-l bg-brand-button px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            {t("heroCta")}
          </Link>
        </section>
      )}

      <div className="mx-auto max-w-6xl px-4 py-10">
      {topCategories.length > 0 ? (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">{t("featuredCategories")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {topCategories.map((category) => (
              <CategoryCard key={category.id} category={category} locale={locale as Locale} />
            ))}
          </div>
        </section>
      ) : null}

      {featured.items.length > 0 ? (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">{t("featuredProducts")}</h2>
          <ProductGrid
            products={featured.items}
            locale={locale as Locale}
            outOfStockLabel={tCatalog("outOfStock")}
          />
        </section>
      ) : null}

      <section className="mt-14 grid gap-6 rounded-l bg-brand-gradient-soft p-8 text-center ring-1 ring-line sm:grid-cols-3">
        <div>
          <div className="text-lg font-semibold text-brand-light">{t("whyUsDelivery")}</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-brand-light">{t("whyUsQuality")}</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-brand-light">{t("whyUsSupport")}</div>
        </div>
      </section>
      </div>
    </div>
  );
}
