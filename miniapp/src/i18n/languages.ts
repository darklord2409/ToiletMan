export interface LanguageOption {
  code: "ru" | "en" | "uz";
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "uz", label: "O'zbekcha", flag: "🇺🇿" },
];

export const DEFAULT_LANGUAGE: LanguageOption["code"] = "ru";
export const LANGUAGE_STORAGE_KEY = "tipobot_customer_lang";

export type LanguageCode = LanguageOption["code"];
