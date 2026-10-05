"use client";

import {
  CalendarCheck,
  CalendarDays,
  FolderOpen,
  Bot,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  Layers,
  FileCheck2,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";
import { InteractiveAppStudio } from "@/components/landing/interactive-app-studio";
import { ClinicRoiCalculator } from "@/components/landing/clinic-roi-calculator";
import { LeadModal } from "@/components/clinic/lead-modal";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizedPath } from "@/lib/routes";

const featureIcons = [Bot, CalendarDays, Layers, FolderOpen, CalendarCheck, FileCheck2];

const featureCategories: Record<Locale, string[]> = {
  fr: [
    "IA Clinique",
    "Organisation",
    "Clinique 3D",
    "Imagerie Médicale",
    "Conversion Devis",
    "Mutuelles & Finance",
  ],
  ar: [
    "ذكاء اصطناعي سريري",
    "إدارة وتنظيم",
    "مخطط 3D متقدم",
    "أشعة وملفات طبية",
    "عروض علاجية وتوقيع",
    "تأمين وتعويضات",
  ],
};

const featureTags: Record<Locale, string[][]> = {
  fr: [
    ["Briefing matinal", "Remplissage créneaux", "Zéro No-Show"],
    ["Multi-praticiens", "Parcours Kanban", "Rappels WhatsApp"],
    ["Schéma adulte & enfant", "Sondage paro", "Céphalométrie IA"],
    ["Visionneuse DICOM", "Radios panoramiques", "Historique complet"],
    ["Devis multi-options (A/B/C)", "Phasage clair", "Signature 1-clic"],
    ["Feuilles CNSS / AMO", "Conformité fiscale", "Encaissement"],
  ],
  ar: [
    ["إيجاز صباحي ذكي", "ملء المواعيد الشاغرة", "تقليل الغياب"],
    ["متعدد الكراسي والأطباء", "مسار المريض كانبان", "تذكير واتساب"],
    ["مخطط كبار وأطفال", "قياس اللثة 3D", "تحليل الأشعة"],
    ["عارض أشعة DICOM", "صور عالية الدقة", "تاريخ مرضي شامل"],
    ["عروض متعددة الخيارات", "مراحل علاج واضحة", "توقيع إلكتروني"],
    ["أوراق CNSS وAMO", "مطابقة ضريبية", "متابعة المداخيل"],
  ],
};

const trustHighlights: Record<Locale, string[]> = {
  fr: [
    "Rappels WhatsApp 100% Automatisés",
    "Conforme CNSS, CNOPS & AMO Maroc",
    "Odontogramme 3D & DICOM Cloud",
    "Multi-Praticiens & Multi-Fauteuils",
    "Support Prioritaire 7j/7 au Maroc",
  ],
  ar: [
    "رسائل تذكير واتساب آلية 100%",
    "متوافق مع CNSS وCNOPS وAMO بالمغرب",
    "مخطط أسنان ثلاثي الأبعاد وأشعة سحابية",
    "يدعم تعدد الأطباء وكراسي العلاج",
    "دعم فني محلي 7 أيام/7 في المغرب",
  ],
};

const workflowIcons = [Sparkles, Users, Layers, ShieldCheck];

export function AppPromoSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const isAr = locale === "ar";
  const categories = featureCategories[locale] ?? featureCategories.fr;
  const tags = featureTags[locale] ?? featureTags.fr;
  const highlights = trustHighlights[locale] ?? trustHighlights.fr;

  return (
    <Section tone="surface" className="relative overflow-hidden py-16 sm:py-24">
      <Container>
        {/* Section Heading */}
        <SectionHeading
          eyebrow={dict.appSection.eyebrow}
          title={dict.appSection.title}
          subtitle={dict.appSection.subtitle}
          align="center"
        />

        {/* Moroccan Clinic SaaS Trust Highlights Bar */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex overflow-x-auto no-scrollbar max-w-full gap-2 p-1.5 rounded-full border border-border/70 bg-surface-subtle/80 backdrop-blur-sm">
            {highlights.map((item) => (
              <span
                key={item}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-foreground/85 shadow-2xs border border-border/50"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Live Interactive Studio */}
        <div className="mt-8 sm:mt-10">
          <InteractiveAppStudio locale={locale} dict={dict} />
        </div>

        {/* 6 Rebuilt Modular Feature Cards */}
        <div className="mt-16 sm:mt-20">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>{isAr ? "مزايا البرنامج المتكامل" : "Modules & Fonctionnalités Clés"}</span>
            </span>
            <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {isAr
                ? "كل ما تحتاجه لإدارة عيادتك بأعلى كفاءة"
                : "La suite complète pour digitaliser votre cabinet"}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {isAr
                ? "حلول متقدمة تغطي كل جوانب العمل اليومي من الاستقبال إلى الفوترة"
                : "Conçu spécifiquement pour les chirurgiens-dentistes et centres dentaires au Maroc."}
            </p>
          </div>

          <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dict.appSection.features.map((feature, i) => {
              const Icon = featureIcons[i] ?? CalendarCheck;
              const category = categories[i] ?? "Module";
              const cardTags = tags[i] ?? [];

              return (
                <div
                  key={feature.title}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 transition-all hover:border-primary/40 hover:shadow-soft hover:-translate-y-0.5"
                >
                  <div>
                    {/* Header: Icon + Category Badge */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-xs transition-colors group-hover:bg-primary group-hover:text-white">
                        <Icon className="h-5.5 w-5.5" strokeWidth={1.9} aria-hidden />
                      </span>
                      <span className="rounded-pill bg-surface-subtle px-2.5 py-0.5 text-[11px] font-bold text-muted border border-border/60">
                        {category}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h4 className="mt-4 text-base font-extrabold text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h4>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted">
                      {feature.description}
                    </p>
                  </div>

                  {/* Feature Sub-Chips */}
                  {cardTags.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-border/60 flex flex-wrap gap-1.5">
                      {cardTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-surface-subtle px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4-Step Daily Clinic Workflow (from /dental-app) */}
        {dict.appPage?.workflow && dict.appPage.workflow.length > 0 && (
          <div className="mt-16 sm:mt-24 rounded-3xl border border-border/80 bg-surface-subtle/60 p-6 sm:p-10">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                <Clock className="h-3.5 w-3.5" />
                <span>{isAr ? "سير العمل السريري" : "Workflow Clinique"}</span>
              </span>
              <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {dict.appPage.workflowTitle}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {isAr
                  ? "من الإيجاز الصباحي بالذكاء الاصطناعي حتى مغادرة آخر مريض مع ورقة تعويض التأمين"
                  : "Du premier briefing d'équipe jusqu'à l'édition des feuilles de soins CNSS."}
              </p>
            </div>

            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {dict.appPage.workflow.map((step, i) => {
                const StepIcon = workflowIcons[i] ?? Sparkles;
                return (
                  <li
                    key={step.step}
                    className="relative flex flex-col justify-between rounded-2xl border border-border/80 bg-surface p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-soft"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-pill bg-primary text-xs font-black text-white shadow-xs">
                          0{i + 1}
                        </span>
                        <StepIcon className="h-4 w-4 text-accent" strokeWidth={2} />
                      </div>
                      <h4 className="mt-3 text-sm sm:text-base font-extrabold text-foreground">
                        {step.step}
                      </h4>
                      <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Interactive Clinic ROI Calculator */}
        <div className="mt-16 sm:mt-24">
          <ClinicRoiCalculator locale={locale} dict={dict} />
        </div>

        {/* Bottom CTA Bar */}
        <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
          <ButtonLink
            href={localizedPath("app", locale)}
            variant="primary"
            size="lg"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <span>{dict.appSection.ctaSecondary}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </ButtonLink>
          <LeadModal
            type="app-demo"
            locale={locale}
            trigger={
              <button className="w-full sm:w-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill bg-surface border border-border px-6 h-12 text-sm sm:text-base font-bold text-foreground hover:bg-primary-soft hover:text-primary hover:border-primary/40 transition-all shadow-xs">
                <Bot className="h-4.5 w-4.5 text-accent" strokeWidth={2} />
                <span>{dict.appSection.cta}</span>
              </button>
            }
          />
        </div>
      </Container>
    </Section>
  );
}

