import type { ReactNode } from "react";
import "./globals.css";

// Minimal root layout -- next-intl needs the <html lang> to come from the
// [locale] segment below it, so the actual document shell lives there.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
