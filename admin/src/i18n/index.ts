import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from "@/i18n/languages";

import commonRu from "@/i18n/locales/ru/common.json";
import authRu from "@/i18n/locales/ru/auth.json";
import navRu from "@/i18n/locales/ru/nav.json";
import dashboardRu from "@/i18n/locales/ru/dashboard.json";
import notFoundRu from "@/i18n/locales/ru/notFound.json";
import notificationsRu from "@/i18n/locales/ru/notifications.json";
import catalogRu from "@/i18n/locales/ru/catalog.json";
import commerceRu from "@/i18n/locales/ru/commerce.json";
import usersRu from "@/i18n/locales/ru/users.json";
import contentRu from "@/i18n/locales/ru/content.json";
import systemRu from "@/i18n/locales/ru/system.json";

import commonEn from "@/i18n/locales/en/common.json";
import authEn from "@/i18n/locales/en/auth.json";
import navEn from "@/i18n/locales/en/nav.json";
import dashboardEn from "@/i18n/locales/en/dashboard.json";
import notFoundEn from "@/i18n/locales/en/notFound.json";
import notificationsEn from "@/i18n/locales/en/notifications.json";
import catalogEn from "@/i18n/locales/en/catalog.json";
import commerceEn from "@/i18n/locales/en/commerce.json";
import usersEn from "@/i18n/locales/en/users.json";
import contentEn from "@/i18n/locales/en/content.json";
import systemEn from "@/i18n/locales/en/system.json";

import commonUz from "@/i18n/locales/uz/common.json";
import authUz from "@/i18n/locales/uz/auth.json";
import navUz from "@/i18n/locales/uz/nav.json";
import dashboardUz from "@/i18n/locales/uz/dashboard.json";
import notFoundUz from "@/i18n/locales/uz/notFound.json";
import notificationsUz from "@/i18n/locales/uz/notifications.json";
import catalogUz from "@/i18n/locales/uz/catalog.json";
import commerceUz from "@/i18n/locales/uz/commerce.json";
import usersUz from "@/i18n/locales/uz/users.json";
import contentUz from "@/i18n/locales/uz/content.json";
import systemUz from "@/i18n/locales/uz/system.json";

const resources = {
  ru: {
    common: commonRu,
    auth: authRu,
    nav: navRu,
    dashboard: dashboardRu,
    notFound: notFoundRu,
    notifications: notificationsRu,
    catalog: catalogRu,
    commerce: commerceRu,
    users: usersRu,
    content: contentRu,
    system: systemRu,
  },
  en: {
    common: commonEn,
    auth: authEn,
    nav: navEn,
    dashboard: dashboardEn,
    notFound: notFoundEn,
    notifications: notificationsEn,
    catalog: catalogEn,
    commerce: commerceEn,
    users: usersEn,
    content: contentEn,
    system: systemEn,
  },
  uz: {
    common: commonUz,
    auth: authUz,
    nav: navUz,
    dashboard: dashboardUz,
    notFound: notFoundUz,
    notifications: notificationsUz,
    catalog: catalogUz,
    commerce: commerceUz,
    users: usersUz,
    content: contentUz,
    system: systemUz,
  },
};

function initialLanguage(): string {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.some((lang) => lang.code === stored)) {
    return stored;
  }
  return DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: "common",
  ns: Object.keys(resources[DEFAULT_LANGUAGE]),
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
});

export default i18n;
