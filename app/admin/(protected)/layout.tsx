import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { logoutAction } from "../actions";
import { Container } from "@/components/ui/container";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/clinics", label: "Clinics" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/seo", label: "Page SEO" },
  { href: "/admin/blocks", label: "Content Blocks" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/jobs", label: "Jobs" },
];

/**
 * Every page in this tree is request-time only.
 *
 * Without this, `next build` prerenders the admin pages and bakes the
 * unauthenticated `redirect("/admin/login")` into the static output: the built
 * route then serves that redirect from cache to every operator, including signed-in
 * ones. Forcing dynamic here rather than per page means a new admin page cannot
 * reintroduce it.
 */
export const dynamic = "force-dynamic";

/**
 * Guarded admin shell.
 *
 * The route group keeps this layout out of `/admin/login`, which must render
 * for a signed-out visitor. Every page beneath the group is therefore
 * authenticated before its own render.
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold text-primary">
              Dentora
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/fr/blog"
              className="text-sm font-medium text-muted hover:text-primary"
              target="_blank"
              rel="noreferrer"
            >
              View site
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-pill border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-primary hover:text-primary"
              >
                Sign out
              </button>
            </form>
          </div>
        </Container>
      </header>

      <main className="flex-1 py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
