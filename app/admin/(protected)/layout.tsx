import { requireAdmin } from "@/lib/admin/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Container } from "@/components/ui/container";

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
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <div className="flex min-h-screen flex-col md:pl-64">
        <main className="flex-1 py-8 sm:py-10">
          <Container>{children}</Container>
        </main>
      </div>
    </div>
  );
}
