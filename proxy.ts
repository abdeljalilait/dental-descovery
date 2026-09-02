import { NextResponse, type NextRequest } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { defaultLocale, locales } from "@/lib/i18n/config";

function getLocale(request: NextRequest): string {
  const headers: Record<string, string> = {
    "accept-language": request.headers.get("accept-language") ?? "",
  };
  const languages = new Negotiator({ headers }).languages();
  return match(languages, locales as readonly string[], defaultLocale);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return;
  }

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
