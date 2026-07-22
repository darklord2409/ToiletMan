import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/locales";
import { getPageBySlug, listPublishedPages } from "@/lib/storefront";
import { buildPageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const pages = await listPublishedPages();
  return pages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) return {};
  return buildPageMetadata({
    title: page.title,
    pathWithoutLocale: `/pages/${slug}`,
    locale: locale as Locale,
  });
}

export default async function StaticContentPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">{page.title}</h1>
      <div className="whitespace-pre-line text-lg leading-relaxed text-slate-600 dark:text-slate-300">
        {page.content}
      </div>
    </div>
  );
}
