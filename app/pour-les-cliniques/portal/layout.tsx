import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-auth";

export default async function ClinicPortalLayout({ children }: { children: ReactNode }) {
  const session = await getClinicSession();
  if (!session) redirect("/pour-les-cliniques/login");
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Espace cabinet</h1>
        <p className="text-sm text-slate-600">Connecté en tant que {session.email}</p>
      </header>
      {children}
    </div>
  );
}
