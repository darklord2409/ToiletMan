import type { Config } from "tailwindcss";

// Brand palette ported 1:1 from miniapp/src/styles/global.css's antd-mobile
// CSS variables, so the new public site reads as the same brand as the
// Telegram Mini App even though it shares no component code with it.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0089a8",
          dark: "#2bb6d4",
        },
        wathet: {
          DEFAULT: "#e1f3f7",
          dark: "#0b2e36",
        },
        surface: {
          DEFAULT: "#f6fafb",
          dark: "#10181b",
        },
        box: {
          DEFAULT: "#eef5f7",
          dark: "#172226",
        },
      },
      borderRadius: {
        l: "14px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
