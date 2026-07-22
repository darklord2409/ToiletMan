// Backend media/logo/banner URL fields are root-relative strings like
// "/media/abc.png" (see backend/app/main.py's StaticFiles mount) -- fine for
// an <img src>, but OpenGraph/Twitter meta tags and JSON-LD need an
// *absolute* URL, so every such field must go through this before landing
// in generateMetadata()/JSON-LD. Safe to also use for plain <Image src> --
// it's a no-op there beyond adding the origin.
export function absoluteMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toiletman.uz";
  return `${site}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function siteUrl(path: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toiletman.uz";
  return `${site}${path.startsWith("/") ? "" : "/"}${path}`;
}
