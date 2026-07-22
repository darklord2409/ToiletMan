import type { Config } from "tailwindcss";

// Dark, blue-gradient palette matching the ToiletMan logo (light "TOILET"
// wordmark + vivid blue "MAN"): this is a committed single dark theme for
// the marketing site, not a light/dark toggle -- distinct from the
// Mini App's teal/aqua antd-mobile palette, which stays as-is over there.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2F8FF0", // matches the logo's "MAN" blue
          light: "#6AB3FF",
          dark: "#1B5FC7",
        },
        surface: {
          DEFAULT: "#0A0F1E", // page background -- near-black navy
          raised: "#111A30", // cards/sections one step up
        },
        box: "#16213E", // secondary surface (inputs, muted panels)
        line: "#223056", // borders/dividers
        ink: {
          DEFAULT: "#F2F5FA", // primary text on dark
          muted: "#94A3C4", // secondary text on dark
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0A0F1E 0%, #14285A 55%, #2F8FF0 120%)",
        "brand-gradient-soft": "linear-gradient(135deg, #111A30 0%, #17264D 100%)",
        "brand-button": "linear-gradient(135deg, #6AB3FF 0%, #2F8FF0 55%, #1B5FC7 100%)",
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
