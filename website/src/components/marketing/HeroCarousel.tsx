"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Banner } from "@/types/api";
import { absoluteMediaUrl } from "@/lib/media";
import type { Locale } from "@/i18n/locales";

const SLIDE_DURATION_MS = 6000;

export function HeroCarousel({
  banners,
  locale,
  kicker,
  title,
  subtitle,
  ctaLabel,
  secondaryCtaLabel,
  secondaryCtaHref,
  stats,
}: {
  banners: Banner[];
  locale: Locale;
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  stats: { value: string; label: string }[];
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % banners.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [banners.length]);

  const goTo = (index: number) => setActive((index + banners.length) % banners.length);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {banners.map((banner, index) => {
        const image = absoluteMediaUrl(banner.image_url);
        return (
          <div
            key={banner.id}
            aria-hidden={index !== active}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: index === active ? 1 : 0 }}
          >
            {image ? (
              <Image
                src={image}
                alt={banner.title}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-[#0A0F1E]/60 to-[#0A0F1E]/10" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1E]/70 via-transparent to-brand/30" />
          </div>
        );
      })}

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-light backdrop-blur">
          {kicker}
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold drop-shadow-lg sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-xl text-lg text-white/90 drop-shadow sm:text-xl">{subtitle}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={`/${locale}/catalog`}
            className="rounded-l bg-brand-button px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand/30 transition hover:opacity-90"
          >
            {ctaLabel}
          </Link>
          <Link
            href={secondaryCtaHref}
            className="rounded-l border border-white/30 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
          >
            {secondaryCtaLabel}
          </Link>
        </div>

        {stats.length > 0 ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {stats.map((stat, index) => (
              <div key={stat.label} className="flex items-center gap-8">
                {index > 0 ? <span className="hidden h-8 w-px bg-white/20 sm:block" /> : null}
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-light">{stat.value}</div>
                  <div className="text-xs text-white/70">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {banners.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => goTo(active - 1)}
            className="absolute left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:flex"
          >
            <IconChevron direction="left" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => goTo(active + 1)}
            className="absolute right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:flex"
          >
            <IconChevron direction="right" />
          </button>

          <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Slide ${index + 1}`}
                onClick={() => goTo(index)}
                className={
                  "h-2 rounded-full transition-all " +
                  (index === active ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80")
                }
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex w-full justify-center pb-2">
        <span className="animate-bounce text-2xl text-white/80">⌄</span>
      </div>
    </section>
  );
}

function IconChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
      />
    </svg>
  );
}
