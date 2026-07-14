export interface LanguageOption {
  code: "ru" | "en" | "uz";
  label: string;
  flag: string;
}

// Adding a fourth language only requires: one entry here, one JSON file per
// namespace under i18n/locales/<code>/, and registering it in i18n/index.ts.
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "uz", label: "O'zbekcha", flag: "🇺🇿" },
];

export const DEFAULT_LANGUAGE: LanguageOption["code"] = "ru";
export const LANGUAGE_STORAGE_KEY = "tipobot_admin_lang";

export type LanguageCode = LanguageOption["code"];
