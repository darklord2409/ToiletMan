import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { getStoreSettings } from "@/lib/storefront";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteMediaUrl } from "@/lib/media";

// Reuses one of the already-uploaded banner photos (see HeroCarousel/About/
// Delivery), a different one again for variety across content pages.
const HERO_IMAGE = "/media/e777b49e91384881975532002c312878.jpg";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABEL_RU: Record<(typeof DAY_KEYS)[number], string> = {
  monday: "Понедельник",
  tuesday: "Вторник",
  wednesday: "Среда",
  thursday: "Четверг",
  friday: "Пятница",
  saturday: "Суббота",
  sunday: "Воскресенье",
};
const DAY_LABEL_EN: Record<(typeof DAY_KEYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};
const DAY_LABEL_UZ: Record<(typeof DAY_KEYS)[number], string> = {
  monday: "Dushanba",
  tuesday: "Seshanba",
  wednesday: "Chorshanba",
  thursday: "Payshanba",
  friday: "Juma",
  saturday: "Shanba",
  sunday: "Yakshanba",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return buildPageMetadata({
    title: t("kicker"),
    description: t("heroSubtitle"),
    pathWithoutLocale: "/contact",
    locale: locale as Locale,
    image: absoluteMediaUrl(HERO_IMAGE),
  });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  const settings = await getStoreSettings();
  const heroImage = absoluteMediaUrl(HERO_IMAGE);

  const dayLabels = locale === "en" ? DAY_LABEL_EN : locale === "uz" ? DAY_LABEL_UZ : DAY_LABEL_RU;
  const hours = settings.working_hours;
  const allSameHours =
    hours &&
    DAY_KEYS.every(
      (day) =>
        !hours[day]?.closed &&
        hours[day]?.open === hours.monday?.open &&
        hours[day]?.close === hours.monday?.close,
    ) &&
    hours.monday?.open;

  const contacts = [
    { name: "Муроджон", role: t("salesRole"), phone: settings.phone },
    { name: "Азизбек", role: t("supportRole"), phone: settings.support_phone },
  ].filter((c): c is { name: string; role: string; phone: string } => Boolean(c.phone));

  return (
    <div>
      {/* Hero */}
      <section className="relative flex h-[45vh] min-h-[320px] w-full items-center overflow-hidden">
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
        {/* Contact cards */}
        {contacts.length > 0 ? (
          <section className="relative -mt-12 z-10 grid gap-6 sm:grid-cols-2">
            {contacts.map((person) => (
              <div
                key={person.phone}
                className="rounded-l border border-line bg-surface-raised p-6 shadow-2xl shadow-black/40 sm:p-8"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-button text-xl font-bold text-white">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{person.name}</h2>
                    <p className="text-sm text-ink-muted">{person.role}</p>
                  </div>
                </div>
                <a
                  href={`tel:${person.phone}`}
                  className="mt-5 flex items-center justify-center gap-2 rounded-l bg-brand-button py-3 font-semibold text-white shadow-lg shadow-brand/20 hover:opacity-90"
                >
                  <IconPhone />
                  {person.phone}
                </a>
              </div>
            ))}
          </section>
        ) : null}

        {/* Working hours + address */}
        <section
          className={
            hours && settings.address
              ? "mt-16 grid gap-6 sm:grid-cols-2"
              : "mx-auto mt-16 max-w-sm"
          }
        >
          {hours ? (
            <div className="rounded-l border border-line bg-surface-raised p-6">
              <h2 className="mb-4 text-lg font-semibold">{t("hoursTitle")}</h2>
              {allSameHours ? (
                <p className="text-ink-muted">
                  <span className="font-medium text-brand-light">{t("everyday")}:</span> {hours.monday?.open} –{" "}
                  {hours.monday?.close}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {DAY_KEYS.map((day) => {
                      const dayHours = hours[day];
                      if (!dayHours) return null;
                      return (
                        <tr key={day} className="border-b border-line last:border-0">
                          <td className="py-1.5 pr-4 text-ink-muted">{dayLabels[day]}</td>
                          <td className="py-1.5">
                            {dayHours.closed ? "—" : `${dayHours.open} – ${dayHours.close}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}

          {settings.address ? (
            <div className="rounded-l border border-line bg-surface-raised p-6">
              <h2 className="mb-4 text-lg font-semibold">{t("addressTitle")}</h2>
              <p className="text-ink-muted">{settings.address}</p>
            </div>
          ) : null}
        </section>

        {/* CTA */}
        <section className="my-16 rounded-l bg-brand-gradient p-10 text-center sm:p-14">
          <h2 className="text-3xl font-bold text-white">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">{t("ctaSubtitle")}</p>
          <Link
            href={`/${locale}/catalog`}
            className="mt-8 inline-block rounded-l bg-brand-button px-6 py-3 font-semibold text-white shadow-lg shadow-brand/30 hover:opacity-90"
          >
            {t("ctaButton")}
          </Link>
        </section>
      </div>
    </div>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .7 2.9a2 2 0 01-.4 2.1L8 10a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.4 1.9.6 2.9.7a2 2 0 011.7 2z"
      />
    </svg>
  );
}
