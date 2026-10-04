import { redirect } from "next/navigation";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/login-form";
import { Container } from "@/components/ui/container";

/**
 * Request-time only, for the same reason as the `(protected)` group: the
 * session-dependent redirect below must not be captured at build time.
 */
export const dynamic = "force-dynamic";

/**
 * Sits outside the `(protected)` group, so it must handle its own already-signed-in
 * case: sending a logged-in operator to the login form would be a dead end.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await isAdminAuthenticated()) redirect("/admin");

  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Container className="max-w-sm">
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-sm">
          <h1 className="text-lg font-bold text-foreground">Dentora admin</h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            Sign in to manage articles and page-level SEO.
          </p>

          {isAdminConfigured() ? (
            <LoginForm next={next} />
          ) : (
            <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              Admin access is not configured. Set <code>ADMIN_PASSWORD</code> in{" "}
              <code>.env.local</code> and restart the server.
            </p>
          )}
        </div>
      </Container>
    </div>
  );
}