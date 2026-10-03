import type { Metadata } from "next";

/**
 * Root layout for the admin area.
 *
 * Deliberately minimal: it must stay permissive so `/admin/login` is reachable.
 * The session guard lives in the `(protected)` group layout instead.
 */
export const metadata: Metadata = {
  title: { default: "Admin", absolute: "Admin — Dental Discovery" },
  // Belt and braces with the `disallow` in robots.txt: a private editor must
  // never appear in a search index even if the file is ignored.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}