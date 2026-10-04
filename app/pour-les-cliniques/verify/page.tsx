"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Suspense } from "react";

function ClinicVerifyInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = sp.get("email") || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/clinics/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.push("/pour-les-cliniques/portal");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Vérification du code</h1>
      <p className="mb-4 text-sm text-slate-600">Code envoyé à {email || "votre email"}</p>
      <form onSubmit={submit} className="space-y-4">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code OTP (6 chiffres)" inputMode="numeric" maxLength={6} required />
        <Button type="submit" disabled={loading}>{loading ? "Vérification..." : "Se connecter"}</Button>
      </form>
      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}

export default function ClinicVerifyPage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-md px-4 py-12">Chargement...</div>}>
      <ClinicVerifyInner />
    </Suspense>
  );
}
