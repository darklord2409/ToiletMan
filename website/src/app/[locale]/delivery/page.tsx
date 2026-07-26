import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { getStoreSettings } from "@/lib/storefront";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteMediaUrl } from "@/lib/media";

// Reuses one of the already-uploaded banner photos, distinct from the one
// About page uses, to keep some visual variety across content pages while
// staying inside the same small, already-vetted image set.
const HERO_IMAGE = "/media/a30ac8362da4415d8ab550dd92d9ddfc.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "delivery" });
  return buildPageMetadata({
    title: t("kicker"),
    description: t("heroSubtitle"),
    pathWithoutLocale: "/delivery",
    locale: locale as Locale,
    image: absoluteMediaUrl(HERO_IMAGE),
  });
}

export default async function DeliveryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "delivery" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const settings = await getStoreSettings();
  const heroImage = absoluteMediaUrl(HERO_IMAGE);

  const steps = [
    { title: t("step1Title"), desc: t("step1Desc") },
    { title: t("step2Title"), desc: t("step2Desc") },
    { title: t("step3Title"), desc: t("step3Desc") },
    { title: t("step4Title"), desc: t("step4Desc") },
  ];

  const faq = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative flex h-[50vh] min-h-[360px] w-full items-center overflow-hidden">
        {heroImage ? (
          <Image src={heroImage} alt={t("kicker")} fill priority sizes="100vw" className="object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-[#0A0F1E]/70 to-[#0A0F1E]/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1E]/70 via-transparent to-brand/30" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-light backdrop-blur">
            {t("kicker")}
          </span>
          <h1 className="mt-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">{t("heroSubtitle")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        {/* Steps */}
        <section className="relative -mt-12 z-10 rounded-l border border-line bg-surface-raised p-8 shadow-2xl shadow-black/40 sm:p-10">
          <h2 className="mb-8 text-center text-2xl font-bold">{t("stepsTitle")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center sm:text-left">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-button font-bold text-white sm:mx-0">
                  {index + 1}
                </div>
                <h3 className="mb-1 font-semibold">{step.title}</h3>
                <p className="text-sm text-ink-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery methods */}
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">{t("methodsTitle")}</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-l border border-line bg-surface-raised p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-l bg-brand-button text-white">
                <IconBox />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("pickupTitle")}</h3>
              <p className="text-ink-muted">{t("pickupDesc")}</p>
            </div>
            <div className="rounded-l border border-line bg-surface-raised p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-l bg-brand-button text-white">
                <IconTruck />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("deliveryTitle")}</h3>
              <p className="text-ink-muted">{t("deliveryDesc")}</p>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section className="mt-16 rounded-l bg-brand-gradient-soft p-8 ring-1 ring-line sm:p-10">
          <h2 className="mb-6 text-2xl font-bold">{t("paymentTitle")}</h2>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-l bg-brand-button text-white">
              <IconCash />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-brand-light">{t("paymentHeading")}</h3>
              <p className="mt-1 text-ink-muted">{t("paymentDesc")}</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">{t("faqTitle")}</h2>
          <div className="divide-y divide-line rounded-l border border-line bg-surface-raised">
            {faq.map((item) => (
              <div key={item.q} className="p-6">
                <h3 className="font-semibold">{item.q}</h3>
                <p className="mt-2 text-sm text-ink-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Working hours, if configured */}
        {settings.phone ? (
          <section className="mt-16 rounded-l border border-line bg-surface-raised p-6 text-center">
            <p className="text-ink-muted">
              {tCommon("nav.contact")}:{" "}
              <a href={`tel:${settings.phone}`} className="font-semibold text-brand-light hover:underline">
                {settings.phone}
              </a>
            </p>
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
              {t("ctaContact")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
    </svg>
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

function IconCash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7">
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" d="M6 9v.01M18 15v.01" />
    </svg>
  );
}
