import Link from "next/link";
import Image from "next/image";
import { absoluteMediaUrl } from "@/lib/media";
import type { CategoryTreeNode } from "@/types/api";
import type { Locale } from "@/i18n/locales";

export function CategoryCard({ category, locale }: { category: CategoryTreeNode; locale: Locale }) {
  const image = absoluteMediaUrl(category.image_url);
  return (
    <Link
      href={`/${locale}/category/${category.slug}`}
      className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-l bg-box dark:bg-box-dark"
    >
      {image ? (
        <Image
          src={image}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition group-hover:scale-105"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <span className="relative z-10 p-3 text-sm font-semibold text-white">{category.name}</span>
    </Link>
  );
}
