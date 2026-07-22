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
  title,
  subtitle,
  ctaLabel,
}: {
  banners: Banner[];
  locale: Locale;
  title: string;
  subtitle: string;
  ctaLabel: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % banners.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [banners.length]);

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
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          </div>
        );
      })}

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="max-w-3xl text-4xl font-bold drop-shadow-lg sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-xl text-lg text-white/90 drop-shadow sm:text-xl">{subtitle}</p>
        <Link
          href={`/${locale}/catalog`}
          className="mt-8 inline-block rounded-l bg-brand px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:opacity-90 dark:bg-brand-dark"
        >
          {ctaLabel}
        </Link>
      </div>

      {banners.length > 1 ? (
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Slide ${index + 1}`}
              onClick={() => setActive(index)}
              className={
                "h-2 rounded-full transition-all " +
                (index === active ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80")
              }
            />
          ))}
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex w-full justify-center pb-2">
        <span className="animate-bounce text-2xl text-white/80">⌄</span>
      </div>
    </section>
  );
}
