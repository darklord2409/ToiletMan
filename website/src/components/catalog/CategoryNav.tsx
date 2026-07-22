import Link from "next/link";
import type { CategoryTreeNode } from "@/types/api";
import type { Locale } from "@/i18n/locales";

export function CategoryNav({
  categories,
  locale,
  activeSlug,
  allLabel,
}: {
  categories: CategoryTreeNode[];
  locale: Locale;
  activeSlug?: string;
  allLabel: string;
}) {
  return (
    <nav className="space-y-1 text-sm">
      <Link
        href={`/${locale}/catalog`}
        className={
          !activeSlug
            ? "block rounded-l bg-wathet px-3 py-2 font-semibold text-brand dark:bg-wathet-dark dark:text-brand-dark"
            : "block rounded-l px-3 py-2 hover:bg-box dark:hover:bg-box-dark"
        }
      >
        {allLabel}
      </Link>
      {categories.map((category) => (
        <div key={category.id}>
          <Link
            href={`/${locale}/category/${category.slug}`}
            className={
              activeSlug === category.slug
                ? "block rounded-l bg-wathet px-3 py-2 font-semibold text-brand dark:bg-wathet-dark dark:text-brand-dark"
                : "block rounded-l px-3 py-2 hover:bg-box dark:hover:bg-box-dark"
            }
          >
            {category.name}
          </Link>
          {category.children.length > 0 ? (
            <div className="ml-3 space-y-0.5 border-l border-box pl-2 dark:border-box-dark">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/${locale}/category/${child.slug}`}
                  className={
                    activeSlug === child.slug
                      ? "block rounded-l px-3 py-1.5 font-semibold text-brand dark:text-brand-dark"
                      : "block rounded-l px-3 py-1.5 text-slate-500 hover:bg-box dark:hover:bg-box-dark"
                  }
                >
                  {child.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
