import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_Arabic } from "next/font/google";
import "../globals.css";
import { locales, localeDir, localeHtmlLang, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { siteConfig } from "@/lib/site.config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileCtaBar } from "@/components/layout/mobile-cta-bar";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5fbfa",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);

  return (
    <html lang={localeHtmlLang[locale]} dir={localeDir[locale]} data-scroll-behavior="smooth" className={`${manrope.variable} ${notoArabic.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:rounded-pill focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          {dict.common.skipToContent}
        </a>
        <Header locale={locale} nav={dict.nav} />
        <main id="main" className="pb-16 lg:pb-0">
          {children}
        </main>
        <Footer locale={locale} dict={dict} />
        <MobileCtaBar
          locale={locale}
          labels={{ dentists: dict.nav.dentists, forClinics: dict.nav.forClinics }}
        />
      </body>
    </html>
  );
}
