import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from "@/i18n/languages";

import authRu from "@/i18n/locales/ru/auth.json";
import commonRu from "@/i18n/locales/ru/common.json";
import homeRu from "@/i18n/locales/ru/home.json";
import catalogRu from "@/i18n/locales/ru/catalog.json";
import productRu from "@/i18n/locales/ru/product.json";
import cartRu from "@/i18n/locales/ru/cart.json";
import checkoutRu from "@/i18n/locales/ru/checkout.json";
import profileRu from "@/i18n/locales/ru/profile.json";
import favoritesRu from "@/i18n/locales/ru/favorites.json";

import authEn from "@/i18n/locales/en/auth.json";
import commonEn from "@/i18n/locales/en/common.json";
import homeEn from "@/i18n/locales/en/home.json";
import catalogEn from "@/i18n/locales/en/catalog.json";
import productEn from "@/i18n/locales/en/product.json";
import cartEn from "@/i18n/locales/en/cart.json";
import checkoutEn from "@/i18n/locales/en/checkout.json";
import profileEn from "@/i18n/locales/en/profile.json";
import favoritesEn from "@/i18n/locales/en/favorites.json";

import authUz from "@/i18n/locales/uz/auth.json";
import commonUz from "@/i18n/locales/uz/common.json";
import homeUz from "@/i18n/locales/uz/home.json";
import catalogUz from "@/i18n/locales/uz/catalog.json";
import productUz from "@/i18n/locales/uz/product.json";
import cartUz from "@/i18n/locales/uz/cart.json";
import checkoutUz from "@/i18n/locales/uz/checkout.json";
import profileUz from "@/i18n/locales/uz/profile.json";
import favoritesUz from "@/i18n/locales/uz/favorites.json";

const resources = {
  ru: {
    common: commonRu,
    home: homeRu,
    catalog: catalogRu,
    product: productRu,
    cart: cartRu,
    checkout: checkoutRu,
    profile: profileRu,
    favorites: favoritesRu,
    auth: authRu,
  },
  en: {
    common: commonEn,
    home: homeEn,
    catalog: catalogEn,
    product: productEn,
    cart: cartEn,
    checkout: checkoutEn,
    profile: profileEn,
    favorites: favoritesEn,
    auth: authEn,
  },
  uz: {
    common: commonUz,
    home: homeUz,
    catalog: catalogUz,
    product: productUz,
    cart: cartUz,
    checkout: checkoutUz,
    profile: profileUz,
    favorites: favoritesUz,
    auth: authUz,
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
