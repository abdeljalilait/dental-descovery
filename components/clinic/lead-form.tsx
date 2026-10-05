"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/lib/i18n/config";

export interface LeadFormLabels {
  clinicName: string;
  yourName: string;
  yourEmail: string;
  yourPhone: string;
  city: string;
  message: string;
  send: string;
  sending: string;
  success: string;
  error: string;
}

const defaultLabels: Record<Locale, LeadFormLabels> = {
  fr: {
    clinicName: "Nom de votre cabinet ou clinique",
    yourName: "Votre nom complet",
    yourEmail: "Adresse e-mail professionnelle",
    yourPhone: "Numéro de téléphone",
    city: "Ville (ex: Casablanca, Tanger, Rabat)",
    message: "Message ou précision",
    send: "Envoyer ma demande",
    sending: "Envoi en cours...",
    success: "Merci ! Votre demande a été reçue. Un conseiller vous contactera sous 24h.",
    error: "Une erreur est survenue. Veuillez réessayer ou nous contacter directement.",
  },
  ar: {
    clinicName: "اسم العيادة أو المركز الطبي",
    yourName: "الاسم الكامل",
    yourEmail: "البريد الإلكتروني المهني",
    yourPhone: "رقم الهاتف",
    city: "المدينة (مثلاً: الدار البيضاء، طنجة، الرباط)",
    message: "رسالتكم أو استفساركم",
    send: "إرسال الطلب",
    sending: "جاري الإرسال...",
    success: "شكراً لكم! تم استلام طلبكم وسيتواصل معكم مستشارنا خلال 24 ساعة.",
    error: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو الاتصال بنا مباشرة.",
  },
};

export function LeadForm({
  type,
  labels,
  locale = "fr",
  clinicName,
  showClinicName = true,
  showCity = true,
  showPhone = true,
  showMessage = true,
  submitLabel,
  className,
  inModal = false,
  onSuccess,
}: {
  type: "app-demo" | "website-quote" | "clinic-claim" | "contact";
  labels?: LeadFormLabels;
  locale?: Locale;
  clinicName?: string;
  showClinicName?: boolean;
  showCity?: boolean;
  showPhone?: boolean;
  showMessage?: boolean;
  submitLabel?: string;
  className?: string;
  inModal?: boolean;
  onSuccess?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const formLabels = labels ?? defaultLabels[locale];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      type,
      clinicName: (data.get("clinicName") as string) || clinicName || undefined,
      name: data.get("name") as string,
      email: data.get("email") as string,
      phone: (data.get("phone") as string) || undefined,
      city: (data.get("city") as string) || undefined,
      message: (data.get("message") as string) || undefined,
      locale,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
      onSuccess?.();
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  if (status === "success") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-card border border-accent/30 bg-accent-soft p-10 text-center",
          className
        )}
        role="status"
      >
        <CheckCircle2 className="h-10 w-10 text-accent" strokeWidth={1.5} aria-hidden />
        <p className="text-base font-bold text-foreground">{formLabels.success}</p>
      </div>
    );
  }

  if (inModal) {
    return (
      <form onSubmit={handleSubmit} className={cn("flex flex-col flex-1 min-h-0", className)} noValidate={false}>
        {/* Scrollable Fields Body */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-0.5 py-1 space-y-3"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {showClinicName ? (
            <div>
              <label htmlFor={`${type}-clinic`} className="mb-1 block text-xs sm:text-sm font-semibold text-foreground">
                {formLabels.clinicName}
              </label>
              <input
                id={`${type}-clinic`}
                name="clinicName"
                type="text"
                className="h-10.5 sm:h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                autoComplete="organization"
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${type}-name`} className="mb-1 block text-xs sm:text-sm font-semibold text-foreground">
                {formLabels.yourName} *
              </label>
              <input
                id={`${type}-name`}
                name="name"
                type="text"
                required
                className="h-10.5 sm:h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor={`${type}-email`} className="mb-1 block text-xs sm:text-sm font-semibold text-foreground">
                {formLabels.yourEmail} *
              </label>
              <input
                id={`${type}-email`}
                name="email"
                type="email"
                required
                className="h-10.5 sm:h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {showPhone ? (
              <div>
                <label htmlFor={`${type}-phone`} className="mb-1 block text-xs sm:text-sm font-semibold text-foreground">
                  {formLabels.yourPhone}
                </label>
                <input
                  id={`${type}-phone`}
                  name="phone"
                  type="tel"
                  className="h-10.5 sm:h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  autoComplete="tel"
                />
              </div>
            ) : null}

            {showCity ? (
              <div>
                <label htmlFor={`${type}-city`} className="mb-1 block text-xs sm:text-sm font-semibold text-foreground">
                  {formLabels.city}
                </label>
                <input
                  id={`${type}-city`}
                  name="city"
                  type="text"
                  className="h-10.5 sm:h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  autoComplete="address-level2"
                />
              </div>
            ) : null}
          </div>

          {showMessage ? (
            <div>
              <label htmlFor={`${type}-message`} className="mb-1 block text-xs sm:text-sm font-semibold text-foreground">
                {formLabels.message}
              </label>
              <textarea
                id={`${type}-message`}
                name="message"
                rows={2}
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
            </div>
          ) : null}
        </div>

        {/* Pinned Submit Button Footer */}
        <div className="shrink-0 pt-3 sm:pt-4 border-t border-border/60 bg-surface">
          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex h-11 sm:h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-pill bg-primary px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            {status === "sending" ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" strokeWidth={2} aria-hidden />
            ) : (
              <Send className="h-4.5 w-4.5 rtl:rotate-180" strokeWidth={2} aria-hidden />
            )}
            <span>{status === "sending" ? formLabels.sending : (submitLabel ?? formLabels.send)}</span>
          </button>
          {status === "error" ? (
            <p role="alert" className="mt-2 text-center text-xs sm:text-sm font-medium text-destructive">
              {formLabels.error}
            </p>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("grid gap-4 sm:grid-cols-2", className)} noValidate={false}>
      {showClinicName ? (
        <div className="sm:col-span-2">
          <label htmlFor={`${type}-clinic`} className="mb-1.5 block text-sm font-semibold text-foreground">
            {formLabels.clinicName}
          </label>
          <input id={`${type}-clinic`} name="clinicName" type="text" className={inputClass} autoComplete="organization" />
        </div>
      ) : null}

      <div>
        <label htmlFor={`${type}-name`} className="mb-1.5 block text-sm font-semibold text-foreground">
          {formLabels.yourName} *
        </label>
        <input
          id={`${type}-name`}
          name="name"
          type="text"
          required
          className={inputClass}
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor={`${type}-email`} className="mb-1.5 block text-sm font-semibold text-foreground">
          {formLabels.yourEmail} *
        </label>
        <input
          id={`${type}-email`}
          name="email"
          type="email"
          required
          className={inputClass}
          autoComplete="email"
        />
      </div>

      {showPhone ? (
        <div>
          <label htmlFor={`${type}-phone`} className="mb-1.5 block text-sm font-semibold text-foreground">
            {formLabels.yourPhone}
          </label>
          <input id={`${type}-phone`} name="phone" type="tel" className={inputClass} autoComplete="tel" />
        </div>
      ) : null}

      {showCity ? (
        <div>
          <label htmlFor={`${type}-city`} className="mb-1.5 block text-sm font-semibold text-foreground">
            {formLabels.city}
          </label>
          <input id={`${type}-city`} name="city" type="text" className={inputClass} autoComplete="address-level2" />
        </div>
      ) : null}

      {showMessage ? (
        <div className="sm:col-span-2">
          <label htmlFor={`${type}-message`} className="mb-1.5 block text-sm font-semibold text-foreground">
            {formLabels.message}
          </label>
          <textarea
            id={`${type}-message`}
            name="message"
            rows={4}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
      ) : null}

      <div className="sm:col-span-2 pt-1 pb-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-pill bg-primary px-6 text-sm font-bold text-white transition-all hover:bg-primary-dark hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 sm:w-auto"
        >
          {status === "sending" ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <Send className="h-4.5 w-4.5 rtl:rotate-180" strokeWidth={2} aria-hidden />
          )}
          {status === "sending" ? formLabels.sending : (submitLabel ?? formLabels.send)}
        </button>
        {status === "error" ? (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {formLabels.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
