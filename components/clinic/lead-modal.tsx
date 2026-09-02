"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LeadForm } from "@/components/clinic/lead-form";
import type { Locale } from "@/lib/i18n/config";
import type { LeadType } from "@/lib/data/types";
import { Building2 } from "lucide-react";

interface LeadModalProps {
  type: LeadType;
  locale: Locale;
  clinicName?: string;
  trigger: React.ReactNode;
}

export function LeadModal({ type, locale, clinicName, trigger }: LeadModalProps) {
  const [open, setOpen] = useState(false);

  const titles: Record<LeadType, { fr: string; ar: string }> = {
    "app-demo": {
      fr: "Demander une démo Dental-App",
      ar: "طلب عرض تجريبي لتطبيق Dental-App",
    },
    "website-quote": {
      fr: "Devis pour site web dentaire",
      ar: "عرض سعر لموقع عيادة أسنان",
    },
    "clinic-claim": {
      fr: clinicName ? `Revendiquer ${clinicName}` : "Revendiquer votre cabinet",
      ar: clinicName ? `تأكيد ملكية ${clinicName}` : "تأكيد ملكية عيادتك",
    },
    contact: {
      fr: "Contactez notre équipe",
      ar: "تواصل مع فريقنا",
    },
  };

  const subtitles: Record<LeadType, { fr: string; ar: string }> = {
    "app-demo": {
      fr: "Découvrez comment Dental-App digitalise votre cabinet en 15 minutes.",
      ar: "اكتشف كيف يطور تطبيق Dental-App إدارة عيادتك في 15 دقيقة فقط.",
    },
    "website-quote": {
      fr: "Site premium sur-mesure, optimisé Google Maps & SEO local au Maroc.",
      ar: "موقع ويب احترافي متكامل ومتوافق مع خرائط Google ومحركات البحث في المغرب.",
    },
    "clinic-claim": {
      fr: "Mettez à jour vos coordonnées, vos équipements et vos horaires.",
      ar: "قم بتحديث معلومات الاتصال، الأجهزة الطبية، ومواعيد العمل.",
    },
    contact: {
      fr: "Notre équipe vous répond sous 24h ouvrées.",
      ar: "فريقنا المتخصص يجيبكم في أقل من 24 ساعة عمل.",
    },
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg border-border/80 bg-surface/98 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-widest">
            <Building2 className="h-4 w-4 text-accent" strokeWidth={2} />
            <span>Dental Discovery Pro</span>
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground mt-1">
            {titles[type][locale]}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted mt-1">
            {subtitles[type][locale]}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <LeadForm
            type={type}
            locale={locale}
            clinicName={clinicName}
            onSuccess={() => {
              setTimeout(() => setOpen(false), 2000);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
