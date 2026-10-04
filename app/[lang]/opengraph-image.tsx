import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site.config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = siteConfig.name;

/**
 * Branded fallback card, generated once per locale.
 *
 * Every page needs a real `og:image`: social platforms render an empty card
 * without one, and Google will not grant an Article rich result to a page that
 * has no image. Individual posts can override it with their own `ogImageUrl`,
 * which takes precedence over this file convention.
 *
 * The copy is deliberately Latin-only. `next/og` ships a single default font
 * (Geist), which has no Arabic coverage, so localized headline text would render
 * as tofu boxes on the `ar` cards. The brand wordmark is the same in both
 * locales, and `og:title`/`og:description` still carry localized text.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundImage: "linear-gradient(135deg, #0c3652 0%, #072134 60%, #065f5b 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="96" height="96" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#075e66" />
                <stop offset="0.5" stopColor="#087f8c" />
                <stop offset="1" stopColor="#0aa8b5" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#g)" />
            <path
              fill="#fff"
              d="M48.9 17.9c-1.2-.9-2.6-1.5-4.1-1.8a10.8 10.8 0 0 0-4.4.1c-1.5.3-2.9 1-4.2 1.6-1.3.6-2.6 1.3-3.7 1.9-1.1-.6-2.4-1.3-3.7-1.9-1.3-.6-2.7-1.3-4.2-1.6a10.8 10.8 0 0 0-4.4-.1c-1.5.3-2.9.9-4.1 1.8-2.6 2-3.7 5.3-3.4 9.1.2 3.1 1.1 6.3 2.5 9.8.9 2.2 2 4.5 2.9 6.2.7 1.3 1.2 2.3 1.4 2.7.8 1.4 1.4 2.3 2.1 3.1.7.8 1.4 1.2 2.4 1.3 1 .1 1.8-.3 2.5-1 .7-.7 1.2-1.6 1.7-2.8.6-1.4 1.1-3 1.7-4.9.2-.8.4-1.5.7-2.1.2-.6.4-1.1.6-1.3.2-.3.2-.3.3-.3.1 0 .1 0 .3.3.2.2.4.7.6 1.3.3.6.5 1.3.7 2.1.6 1.9 1.1 3.5 1.7 4.9.5 1.2 1 2.1 1.7 2.8.7.7 1.5 1.1 2.5 1 1-.1 1.7-.5 2.4-1.3.7-.8 1.3-1.7 2.1-3.1.2-.4.7-2.4 1.4-2.7.9-1.7 2-4 2.9-6.2 1.4-3.5 2.3-6.7 2.5-9.8.3-3.8-.8-7.1-3.4-9.1Z"
            />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 68, fontWeight: 800, color: "#ffffff", letterSpacing: -1.5 }}>
              {siteConfig.name}
            </div>
            <div style={{ marginTop: 6, width: 120, height: 8, borderRadius: 999, backgroundColor: "#059669" }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, fontWeight: 600, color: "#e2e8f0" }}>
            Dentistes, cliniques et tarifs au Maroc
          </div>
          <div style={{ marginTop: 18, fontSize: 30, color: "#94a3b8" }}>{siteConfig.domain}</div>
        </div>
      </div>
    ),
    size
  );
}