import { NextResponse, type NextRequest } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { defaultLocale, locales } from "@/lib/i18n/config";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

function getLocale(request: NextRequest): string {
  const headers: Record<string, string> = {
    "accept-language": request.headers.get("accept-language") ?? "",
  };
  const languages = new Negotiator({ headers }).languages();
  return match(languages, locales as readonly string[], defaultLocale);
}

/**
 * `proxy` does two jobs: locale negotiation, and minting the per-response
 * Content-Security-Policy nonce.
 *
 * Next.js reads the nonce out of the `Content-Security-Policy` **request**
 * header and stamps it onto its own inline scripts, which is what lets the
 * policy drop `'unsafe-inline'` from `script-src`. The same value is exposed as
 * `x-nonce` so a server component that renders its own inline script — the
 * JSON-LD graph — can stamp it too.
 */
export function proxy(request: NextRequest) {
  // `randomUUID` is 122 bits of CSPRNG output; the nonce only needs to be
  // unpredictable per response, not secret beyond that.
  const nonce = crypto.randomUUID();
  const csp = buildContentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // `/admin` is locale-agnostic and must not be prefixed with a language code.
  // Authentication is enforced by `app/admin/layout.tsx`, which every admin page
  // renders inside; this only stops the redirect from mangling the path.
  // The matcher already excludes `/api`, `/_next` and dotted paths; the checks
  // stay as a guard in case the matcher is widened.
  const skipRedirect =
    pathnameHasLocale ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".");

  if (!skipRedirect) {
    const locale = getLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(
    "Link",
    '</llms.txt>; rel="help"; type="text/plain", </llms-full.txt>; rel="alternate"; type="text/plain"'
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
