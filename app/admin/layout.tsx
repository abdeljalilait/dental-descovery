import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Manrope } from "next/font/google";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import "../globals.css";

/**
 * Root layout for the admin area.
 *
 * Deliberately minimal: it must stay permissive so `/admin/login` is reachable.
 * The session guard lives in the `(protected)` group layout instead.
 *
 * This has to be a *real* root layout. The admin tree is not nested under
 * `app/[lang]`, so nothing above it supplies `<html>`/`<body>` or the Tailwind
 * stylesheet — rendering an admin page without them yields "Missing <html> and
 * <body> tags in the root layout" and a completely unstyled page.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Admin", absolute: "Admin — Dentora" },
  // Belt and braces with the `disallow` in robots.txt: a private editor must
  // never appear in a search index even if the file is ignored.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" data-scroll-behavior="smooth" className={manrope.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <div className="min-h-screen bg-background">{children}</div>
      </body>
    </html>
  );
}