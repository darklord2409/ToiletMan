export const TAB_ROOT_PATHS = ["/", "/catalog", "/favorites", "/cart", "/profile"] as const;

export function isTabRootPath(pathname: string): boolean {
  return (TAB_ROOT_PATHS as readonly string[]).includes(pathname);
}
