"use client";

import { useState } from "react";
import { LeadModal } from "@/components/clinic/lead-modal";
import type { Locale } from "@/lib/i18n/config";
import { Calculator, TrendingUp, ArrowRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function ClinicRoiCalculator({
  locale,
}: {
  locale: Locale;
  dict?: Dictionary;
}) {
  const isAr = locale === "ar";
  const [chairs, setChairs] = useState(2);
  const [patientsPerDay, setPatientsPerDay] = useState(12);
  const [avgTicket, setAvgTicket] = useState(600);
  const [noShowRate, setNoShowRate] = useState(20);

  // Calculations
  // Working days per month: 24 days
  const totalMonthlyPatients = chairs * patientsPerDay * 24;
  const lostPatientsMonthly = Math.round(totalMonthlyPatients * (noShowRate / 100));
  // Dental-App recovers ~65% of no-shows through automated WhatsApp recall + online booking
  const recoveredPatients = Math.round(lostPatientsMonthly * 0.65);
  const recoveredRevenueMonthly = Math.round(recoveredPatients * avgTicket);
  // Time saved: ~15 mins per patient in secretariat / paper / billing overhead
  const savedHoursMonthly = Math.round((totalMonthlyPatients * 12) / 60);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-lift">
      <div className="grid lg:grid-cols-12">
        {/* Left Interactive Sliders */}
        <div className="p-6 sm:p-8 lg:col-span-7 bg-surface">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-2">
            <Calculator className="h-4 w-4 text-accent" />
            <span>{isAr ? "حاسبة العائد الاستثماري للعيادات" : "Simulateur de Rentabilité Cabinet"}</span>
          </div>
          <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
            {isAr ? "احسب كم ستربح عيادتك شهرياً مع Dental-App" : "Estimez le gain mensuel pour votre cabinet"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {isAr
              ? "اضبط المعايير الخاصة بعيادتك لمشاهدة التوفير المالي والزمني المباشر."
              : "Ajustez vos paramètres pour estimer les heures gagnées et le chiffre d'affaires récupéré."}
          </p>

          <div className="mt-6 space-y-5">
            {/* Slider 1: Chairs */}
            <div>
              <div className="flex justify-between text-xs font-bold text-foreground mb-1.5">
                <span>{isAr ? "عدد قاعات / كراسي العلاج" : "Nombre de fauteuils dentaires"}</span>
                <span className="text-primary font-extrabold text-sm">{chairs} {isAr ? "كراسي" : "fauteuils"}</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={chairs}
                onChange={(e) => setChairs(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer h-2 bg-surface-subtle rounded-lg border border-border"
              />
            </div>

            {/* Slider 2: Patients/day */}
            <div>
              <div className="flex justify-between text-xs font-bold text-foreground mb-1.5">
                <span>{isAr ? "متوسط عدد المرضى يومياً (لكل كرسي)" : "Patients reçus par jour (par fauteuil)"}</span>
                <span className="text-primary font-extrabold text-sm">{patientsPerDay} {isAr ? "مرضى" : "patients/j"}</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={patientsPerDay}
                onChange={(e) => setPatientsPerDay(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer h-2 bg-surface-subtle rounded-lg border border-border"
              />
            </div>

            {/* Slider 3: Average Ticket MAD */}
            <div>
              <div className="flex justify-between text-xs font-bold text-foreground mb-1.5">
                <span>{isAr ? "متوسط قيمة الاستشارة / العلاج (درهم)" : "Panier moyen par acte (MAD)"}</span>
                <span className="text-primary font-extrabold text-sm">{avgTicket.toLocaleString()} MAD</span>
              </div>
              <input
                type="range"
                min="200"
                max="2500"
                step="50"
                value={avgTicket}
                onChange={(e) => setAvgTicket(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer h-2 bg-surface-subtle rounded-lg border border-border"
              />
            </div>

            {/* Slider 4: No-show rate */}
            <div>
              <div className="flex justify-between text-xs font-bold text-foreground mb-1.5">
                <span>{isAr ? "نسبة الغياب الحالية عن المواعيد (No-Show)" : "Taux d'absentéisme actuel (No-Show)"}</span>
                <span className="text-destructive font-extrabold text-sm">{noShowRate} %</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="1"
                value={noShowRate}
                onChange={(e) => setNoShowRate(Number(e.target.value))}
                className="w-full accent-destructive cursor-pointer h-2 bg-surface-subtle rounded-lg border border-border"
              />
            </div>
          </div>
        </div>

        {/* Right Computed Value Card */}
        <div className="p-6 sm:p-8 lg:col-span-5 bg-gradient-to-br from-primary-dark via-primary to-primary-light text-white flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              <span>{isAr ? "النتيجة التقديرية" : "Impact Estimé par Mois"}</span>
            </span>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-md border border-white/10">
                <p className="text-xs font-semibold text-white/80">
                  {isAr ? "مداخيل إضافية مسترجعة شهرياً" : "CA Supplémentaire Récupéré / mois"}
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-white">
                  +{recoveredRevenueMonthly.toLocaleString()} <span className="text-lg font-bold text-accent">MAD</span>
                </p>
                <p className="mt-1 text-[11px] text-white/70">
                  {isAr ? `بفضل استرجاع ${recoveredPatients} مريض شهرياً عبر رسائل واتساب الآلية` : `Grâce à ~${recoveredPatients} rendez-vous sauvés automatiquement`}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-md border border-white/10">
                <p className="text-xs font-semibold text-white/80">
                  {isAr ? "وقت إداري تم توفيره" : "Temps Administratif Gagné"}
                </p>
                <p className="mt-1 text-2xl font-black text-white">
                  ~{savedHoursMonthly} <span className="text-base font-semibold text-white/90">{isAr ? "ساعة / شهر" : "heures / mois"}</span>
                </p>
                <p className="mt-1 text-[11px] text-white/70">
                  {isAr ? "لصالح الأمانة والتركيز على العناية بالمرضى" : "Moins de paperasse, plus de temps pour vos patients"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15">
            <LeadModal
              type="app-demo"
              locale={locale}
              trigger={
                <button className="w-full inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill bg-white px-5 py-3 text-sm font-extrabold text-primary-dark shadow-lg transition-all hover:bg-white/90 hover:scale-[1.02]">
                  <span>{isAr ? "احصل على دراسة مخصصة لعيادتك" : "Activer pour mon Cabinet"}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
