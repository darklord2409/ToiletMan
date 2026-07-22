import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "./locales";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = locales.includes(requested as Locale) ? (requested as Locale) : undefined;
  if (!locale) notFound();

  const [common, home, catalog, product, checkout, account] = await Promise.all([
    import(`../../messages/${locale}/common.json`),
    import(`../../messages/${locale}/home.json`),
    import(`../../messages/${locale}/catalog.json`),
    import(`../../messages/${locale}/product.json`),
    import(`../../messages/${locale}/checkout.json`),
    import(`../../messages/${locale}/account.json`),
  ]);

  return {
    locale,
    messages: {
      common: common.default,
      home: home.default,
      catalog: catalog.default,
      product: product.default,
      checkout: checkout.default,
      account: account.default,
    },
  };
});
