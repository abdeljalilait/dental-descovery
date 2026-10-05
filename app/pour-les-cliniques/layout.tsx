import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "../globals.css";

/**
 * Root layout for the clinic portal (`login`, `verify`, `portal`).
 *
 * Like `/admin`, these routes sit outside `app/[lang]`, so this layout is the
 * only place `<html>`, `<body>` and the Tailwind stylesheet can come from.
 * Without it any of these pages fails with "Missing <html> and <body> tags in
 * the root layout".
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Espace cabinet", absolute: "Espace cabinet — Dentora" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function ClinicPortalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" data-scroll-behavior="smooth" className={manrope.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}