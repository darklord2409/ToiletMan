import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {pages.map((p, index) => (
        <span key={p} className="flex items-center gap-2">
          {index > 0 && pages[index - 1] !== p - 1 ? <span className="text-slate-400">…</span> : null}
          <Link
            href={hrefFor(p)}
            className={
              p === page
                ? "rounded-l bg-brand px-3 py-1.5 text-sm font-semibold text-white dark:bg-brand-dark"
                : "rounded-l bg-box px-3 py-1.5 text-sm hover:bg-wathet dark:bg-box-dark dark:hover:bg-wathet-dark"
            }
          >
            {p}
          </Link>
        </span>
      ))}
    </nav>
  );
}
