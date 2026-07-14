import { Breadcrumb } from "antd";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { useBreadcrumbExtraValue } from "@/layout/BreadcrumbContext";
import { resolveBreadcrumbs } from "@/layout/breadcrumbs";

export function BreadcrumbBar() {
  const { t } = useTranslation("nav");
  const location = useLocation();
  const extra = useBreadcrumbExtraValue();
  const segments = resolveBreadcrumbs(location.pathname);

  const items = segments.map((seg) => ({
    key: seg.path ?? seg.labelKey,
    title: seg.path ? <Link to={seg.path}>{t(seg.labelKey)}</Link> : t(seg.labelKey),
  }));
  if (extra) {
    items.push({ key: "extra", title: <>{extra}</> });
  }

  return <Breadcrumb items={items} style={{ margin: "16px 20px 0" }} />;
}
