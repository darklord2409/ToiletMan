import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { getCategoryTree, getManufacturers, getStoreSettings, listProducts, flattenCategories } from "@/lib/storefront";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteMediaUrl } from "@/lib/media";

// Already-uploaded, editorial-quality bathroom photo reused from the home
// page's hero banners (see banners table) -- keeps a consistent visual
// identity across the site without needing a second image pipeline.
const HERO_IMAGE = "/media/dbd1941a18d547dab42f30d8a47b87bf.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  const settings = await getStoreSettings();
  return buildPageMetadata({
    title: t("nav.about"),
    description: settings.about_text?.[locale] ?? undefined,
    pathWithoutLocale: "/about",
    locale: locale as Locale,
    image: absoluteMediaUrl(HERO_IMAGE),
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const [settings, categories, productsPage, manufacturers] = await Promise.all([
    getStoreSettings(),
    getCategoryTree(),
    listProducts({ page_size: 1 }),
    getManufacturers(),
  ]);

  const storyText = settings.about_text?.[locale] ?? settings.about_text?.ru;
  const categoryCount = flattenCategories(categories).filter((c) => c.children.length === 0).length;
  const productCount = productsPage.meta.total_items;
  const brandCount = manufacturers.items.length;
  const heroImage = absoluteMediaUrl(HERO_IMAGE);

  const values = [
    { title: t("value1Title"), desc: t("value1Desc"), icon: <IconTruck /> },
    { title: t("value2Title"), desc: t("value2Desc"), icon: <IconShield /> },
    { title: t("value3Title"), desc: t("value3Desc"), icon: <IconChat /> },
    { title: t("value4Title"), desc: t("value4Desc"), icon: <IconTag /> },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative flex h-[60vh] min-h-[420px] w-full items-center overflow-hidden">
        {heroImage ? (
          <Image src={heroImage} alt={t("heroTitle")} fill priority sizes="100vw" className="object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-[#0A0F1E]/70 to-[#0A0F1E]/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1E]/70 via-transparent to-brand/30" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-light backdrop-blur">
            {t("kicker")}
          </span>
          <h1 className="mt-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">{t("heroSubtitle")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        {/* Story */}
        {storyText ? (
          <section className="relative -mt-16 z-10 rounded-l border border-line bg-surface-raised p-8 shadow-2xl shadow-black/40 sm:p-12">
            <span className="text-6xl font-serif leading-none text-brand/30">“</span>
            <h2 className="-mt-8 mb-4 text-2xl font-bold">{t("storyTitle")}</h2>
            <p className="whitespace-pre-line text-lg leading-relaxed text-ink-muted">{storyText}</p>
          </section>
        ) : null}

        {/* Stats */}
        <section className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile value={`${productCount}+`} label={t("statsProducts")} />
          <StatTile value={`${categoryCount}+`} label={t("statsCategories")} />
          <StatTile value={`${brandCount}`} label={t("statsBrands")} />
          <StatTile value={t("statsDelivery")} label={t("statsDeliveryLabel")} />
        </section>

        {/* Values */}
        <section className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold">{t("valuesTitle")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-l border border-line bg-surface-raised p-6 transition hover:border-brand/50 hover:shadow-lg hover:shadow-brand/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-l bg-brand-button text-white">
                  {value.icon}
                </div>
                <h3 className="mb-2 font-semibold">{value.title}</h3>
                <p className="text-sm text-ink-muted">{value.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Brands */}
        {manufacturers.items.length > 0 ? (
          <section className="mt-16 rounded-l bg-brand-gradient-soft p-8 text-center ring-1 ring-line sm:p-12">
            <h2 className="text-2xl font-bold">{t("brandsTitle")}</h2>
            <p className="mt-2 text-ink-muted">{t("brandsSubtitle")}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {manufacturers.items.map((brand) => (
                <span
                  key={brand.id}
                  className="rounded-full border border-line bg-box px-5 py-2 text-lg font-bold tracking-wide text-brand-light"
                >
                  {brand.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <section className="my-16 rounded-l bg-brand-gradient p-10 text-center sm:p-14">
          <h2 className="text-3xl font-bold text-white">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">{t("ctaSubtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/${locale}/catalog`}
              className="rounded-l bg-brand-button px-6 py-3 font-semibold text-white shadow-lg shadow-brand/30 hover:opacity-90"
            >
              {t("ctaButton")}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="rounded-l border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              {tCommon("nav.contact")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-l border border-line bg-surface-raised px-4 py-6 text-center">
      <div className="text-3xl font-bold text-brand-light">{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
      <circle cx="7" cy="17" r="1.7" />
      <circle cx="17.5" cy="17" r="1.7" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.5a7.5 7.5 0 01-11.4 6.4L3 19l1.1-4.5A7.5 7.5 0 1121 11.5z"
      />
    </svg>
  );
}

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.6 12.4L12.4 20.6a2 2 0 01-2.8 0l-6.2-6.2a2 2 0 010-2.8L11.6 3.4A2 2 0 0113 2.8L20 4l1.2 7a2 2 0 01-.6 1.4z"
      />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </svg>
  );
}
