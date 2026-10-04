"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClinicLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/clinics/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.status === 404 && data.contact) {
        setMsg("Aucun cabinet trouvé avec cet email. Contactez-nous pour corriger votre email.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.push(`/pour-les-cliniques/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Connexion cabinet</h1>
      <form onSubmit={submit} className="space-y-4">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email du cabinet" required />
        <Button type="submit" disabled={loading}>{loading ? "Envoi..." : "Recevoir le code OTP"}</Button>
      </form>
      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}
