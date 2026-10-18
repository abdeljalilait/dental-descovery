import type { NextConfig } from "next";

/**
 * Security headers, applied to every response.
 *
 * There is no reverse proxy in this repo — TLS is terminated by the platform —
 * so the application is the only place these can be set. They are all
 * behaviour-preserving: none of them restricts what the app already loads.
 *
 * `Content-Security-Policy` is deliberately not here. The app ships Next's
 * inline bootstrap scripts plus an inline JSON-LD block, so a strict policy
 * needs a nonce threaded through `proxy.ts` and a test pass before it can be
 * enabled without breaking hydration. Track it separately.
 */
const securityHeaders = [
  // HSTS is only honoured over HTTPS, so plain-HTTP localhost is unaffected.
  // Drop `includeSubDomains` if any subdomain is ever served over HTTP only.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Blocks third-party framing (clickjacking) while still allowing the app to
  // frame itself if a page ever needs to.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Do not advertise the framework version in every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
