import { dashboardNavItem, navGroups } from "@/layout/navConfig";

export interface BreadcrumbSegment {
  labelKey: string;
  path?: string;
}

/** Resolves the static (nav-config-derived) breadcrumb trail for a
 * pathname. Dynamic detail routes (e.g. a product editor) are matched via
 * their list-page prefix — the page itself adds the record-specific
 * trailing segment through useBreadcrumbExtra. */
export function resolveBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  if (pathname === dashboardNavItem.path) {
    return [{ labelKey: dashboardNavItem.labelKey }];
  }
  for (const group of navGroups) {
    for (const item of group.items) {
      if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
        return [
          { labelKey: dashboardNavItem.labelKey, path: dashboardNavItem.path },
          { labelKey: group.labelKey },
          { labelKey: item.labelKey, path: item.path },
        ];
      }
    }
  }
  return [{ labelKey: dashboardNavItem.labelKey, path: dashboardNavItem.path }];
}
