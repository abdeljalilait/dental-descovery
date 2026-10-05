"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { LeadModal } from "@/components/clinic/lead-modal";
import type { Locale } from "@/lib/i18n/config";
import {
  Bot,
  Calendar,
  FileText,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Activity,
  Play,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";

export function InteractiveAppStudio({
  locale,
}: {
  locale: Locale;
  dict?: Dictionary;
}) {
  const isAr = locale === "ar";
  const [selectedTooth, setSelectedTooth] = useState<number | null>(16);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [copilotAction, setCopilotAction] = useState<"briefing" | "slot" | "quotes">("briefing");
  const [activeChair, setActiveChair] = useState<1 | 2 | 3 | "all">("all");

  const teeth = [
    { id: 11, name: isAr ? "قاطع علوي أيمن" : "Incisive centrale sup. D", status: "ok" },
    { id: 12, name: isAr ? "قاطع جانبي أيمن" : "Incisive latérale sup. D", status: "ok" },
    { id: 13, name: isAr ? "ناب علوي أيمن" : "Canine sup. D", status: "ok" },
    { id: 14, name: isAr ? "ضاحك أول أيمن" : "1ère Prémolaire sup. D", status: "ok" },
    { id: 15, name: isAr ? "ضاحك ثاني أيمن" : "2ème Prémolaire sup. D", status: "treatment" },
    { id: 16, name: isAr ? "ضرس أول أيمن (زرع)" : "1ère Molaire sup. D (Implant)", status: "implant" },
    { id: 21, name: isAr ? "قاطع علوي أيسر" : "Incisive centrale sup. G", status: "ok" },
    { id: 22, name: isAr ? "قاطع جانبي أيسر" : "Incisive latérale sup. G", status: "ok" },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-lift" data-testid="interactive-app-studio">
        {/* Studio Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 border-b border-border bg-surface-subtle px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <Activity className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-foreground">
                <span>Dental-App Suite</span>
                <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                  v3.4 Powered by AI Copilot
                </span>
              </p>
              <p className="text-xs text-muted">
                {isAr
                  ? "نظام إدارة العيادات السنية الذكي: أجندة، مخطط 3D، ومساعد ذكي للعيادة"
                  : "Logiciel complet pour cabinets dentaires : Agenda, Odontogramme 3D & Copilot IA"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <LeadModal
              type="app-demo"
              locale={locale}
              trigger={
                <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-lift w-full sm:w-auto">
                  <Play className="h-3.5 w-3.5 text-accent" />
                  <span>{isAr ? "طلب تجربة كاملة" : "Essayer en direct"}</span>
                </button>
              }
            />
          </div>
        </div>

        {/* Studio Interactive Body */}
        <div className="p-3.5 sm:p-6 lg:p-8">
          <Tabs defaultValue="copilot" className="w-full">
            <div className="flex justify-center pb-5 sm:pb-6 overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
              <TabsList className="flex overflow-x-auto no-scrollbar sm:grid sm:grid-cols-5 gap-1.5 p-1.5 bg-surface-subtle max-w-4xl w-full rounded-2xl touch-pan-x">
                <TabsTrigger value="copilot" className="flex-1 shrink-0 whitespace-nowrap min-w-[125px] sm:min-w-0 py-2 sm:py-2.5 px-3 gap-1.5 text-xs sm:text-sm font-bold">
                  <Bot className="h-4 w-4 shrink-0 text-accent" />
                  <span>{isAr ? "مساعد Copilot IA" : "Copilot IA"}</span>
                </TabsTrigger>
                <TabsTrigger value="agenda" className="flex-1 shrink-0 whitespace-nowrap min-w-[110px] sm:min-w-0 py-2 sm:py-2.5 px-3 gap-1.5 text-xs sm:text-sm font-bold">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>{isAr ? "الأجندة الذكية" : "Agenda"}</span>
                </TabsTrigger>
                <TabsTrigger value="patient" className="flex-1 shrink-0 whitespace-nowrap min-w-[145px] sm:min-w-0 py-2 sm:py-2.5 px-3 gap-1.5 text-xs sm:text-sm font-bold">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>{isAr ? "مخطط الأسنان 3D" : "Odontogramme 3D"}</span>
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="flex-1 shrink-0 whitespace-nowrap min-w-[120px] sm:min-w-0 py-2 sm:py-2.5 px-3 gap-1.5 text-xs sm:text-sm font-bold">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span>{isAr ? "واتساب وتذكير" : "WhatsApp"}</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1 shrink-0 whitespace-nowrap min-w-[110px] sm:min-w-0 py-2 sm:py-2.5 px-3 gap-1.5 text-xs sm:text-sm font-bold">
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  <span>{isAr ? "الإحصائيات" : "Analytics"}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: AI Copilot */}
            <TabsContent value="copilot" data-testid="tab-copilot-content">
              <div className="rounded-xl border border-border/80 bg-surface p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-foreground">
                        {isAr ? "المساعد السريري الذكي — Copilot IA Agentic" : "Copilot IA — Assistant Clinique Agentic"}
                      </h4>
                      <p className="text-xs text-muted">
                        {isAr ? "اختر أمراً لتشغيل المهام التلقائية للعيادة" : "Sélectionnez une action pour tester les playbooks agentiques"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-pill bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                    Agentic RBAC Secure
                  </span>
                </div>

                {/* Prompt Actions */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <button
                    onClick={() => setCopilotAction("briefing")}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-bold transition-all",
                      copilotAction === "briefing"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-subtle text-foreground hover:bg-primary-soft"
                    )}
                  >
                    <Play className="h-3 w-3" />
                    <span>{isAr ? "ملخص صباحي للعيادة" : "Briefing Matinal"}</span>
                  </button>
                  <button
                    onClick={() => setCopilotAction("slot")}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-bold transition-all",
                      copilotAction === "slot"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-subtle text-foreground hover:bg-primary-soft"
                    )}
                  >
                    <Play className="h-3 w-3" />
                    <span>{isAr ? "ملء إلغاء الساعة 15:00" : "Remplir Créneau Annulé (15h)"}</span>
                  </button>
                  <button
                    onClick={() => setCopilotAction("quotes")}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-bold transition-all",
                      copilotAction === "quotes"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-subtle text-foreground hover:bg-primary-soft"
                    )}
                  >
                    <Play className="h-3 w-3" />
                    <span>{isAr ? "متابعة عروض زراعة الأسنان" : "Relance Devis Implants"}</span>
                  </button>
                </div>

                {/* Simulated Conversation Box */}
                <div className="rounded-xl border border-border/80 bg-surface-subtle p-4 space-y-3 font-sans text-xs">
                  {copilotAction === "briefing" && (
                    <>
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px]">Dr</div>
                        <div className="rounded-xl bg-surface p-3 shadow-soft border border-border/60 max-w-lg">
                          <p className="font-semibold text-foreground">
                            {isAr ? "كوبيلوت، ما هو ملخص مواعيد اليوم والمهام العاجلة؟" : "Copilot, donne-moi le briefing de la journée et les priorités cliniques."}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center font-bold text-[10px]">AI</div>
                        <div className="rounded-xl bg-surface p-3.5 shadow-soft border border-accent/30 max-w-xl space-y-2">
                          <p className="font-bold text-accent">
                            {isAr ? "☀️ صباح الخير دكتور بناني! إليك إيجاز اليوم:" : "☀️ Bonjour Dr. Bennani ! Voici votre briefing du jour :"}
                          </p>
                          <ul className="space-y-1 text-muted">
                            <li>• <strong>14 consultations</strong> {isAr ? "مبرمجة عبر 3 كراسي" : "prévues sur les 3 fauteuils (94% d'occupation)."}</li>
                            <li>• <strong>2 actes chirurgicaux</strong> {isAr ? "زراعة أسنان الساعة 09:30 و16:00" : "d'implantologie à 09h30 (Mme. Idrissi) et 16h00."}</li>
                            <li>• <strong>3 rappels de détartrage</strong> {isAr ? "تم إرسالها تلقائياً عبر واتساب" : "envoyés automatiquement ce matin par WhatsApp."}</li>
                            <li>• <strong>1 devis en attente</strong> {isAr ? "خطة زرع 15 000 درهم بانتظار التأكيد" : "devis de 15 000 MAD à relancer (accord mutuelle reçu)."}</li>
                          </ul>
                        </div>
                      </div>
                    </>
                  )}

                  {copilotAction === "slot" && (
                    <>
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px]">Dr</div>
                        <div className="rounded-xl bg-surface p-3 shadow-soft border border-border/60 max-w-lg">
                          <p className="font-semibold text-foreground">
                            {isAr ? "تم إلغاء موعد الساعة 15:00. هل يمكنك ملء الفراغ من قائمة الانتظار؟" : "Le RDV de 15h00 est libéré. Peux-tu proposer le créneau à la liste d'attente ?"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center font-bold text-[10px]">AI</div>
                        <div className="rounded-xl bg-surface p-3.5 shadow-soft border border-accent/30 max-w-xl space-y-2">
                          <p className="font-bold text-accent">
                            {isAr ? "✓ تم العثور على 3 مرضى في قائمة الانتظار:" : "✓ 3 patients prioritaires identifiés sur votre liste d'attente :"}
                          </p>
                          <p className="text-muted">
                            {isAr ? "تم إرسال اقتراح الموعد للسيد عمر التازي (علاج عاجل). تم تأكيد الحضور وحجز الكرسي رقم 2 في 4 دقائق!" : "Notification WhatsApp envoyée à M. Omar Tazi (soin urgent). M. Tazi a confirmé en 4 minutes : le créneau de 15h00 est verrouillé !"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {copilotAction === "quotes" && (
                    <>
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px]">Dr</div>
                        <div className="rounded-xl bg-surface p-3 shadow-soft border border-border/60 max-w-lg">
                          <p className="font-semibold text-foreground">
                            {isAr ? "أظهر لي عروض الأسعار غير المؤكدة لهذا الأسبوع." : "Affiche les devis de prothèses/implants en attente de signature."}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center font-bold text-[10px]">AI</div>
                        <div className="rounded-xl bg-surface p-3.5 shadow-soft border border-accent/30 max-w-xl space-y-1.5">
                          <div className="flex justify-between font-bold text-foreground pb-1 border-b border-border/60">
                            <span>Mme. Fatima Zahra (Couronnes Zircone)</span>
                            <span className="text-primary">8 400 MAD</span>
                          </div>
                          <p className="text-[11px] text-muted">
                            {isAr ? "تم إرسال رسالة تذكير ودية برابط خطة العلاج ثلاثية الأبعاد." : "Relance WhatsApp avec plan 3D envoyée. Taux de conversion moyen : 76%."}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Smart Agenda */}
            <TabsContent value="agenda">
              <div className="rounded-xl border border-border/70 bg-surface p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <h4 className="text-base font-extrabold text-foreground">
                      {isAr ? "أجندة اليوم — 3 قاعات علاج متزامنة" : "Planning du Jour — 3 Fauteuils Synchronisés"}
                    </h4>
                    <p className="text-xs text-muted">
                      {isAr ? "تنسيق فوري للمواعيد وتنبيه تلقائي للمرضى" : "Gestion fluide des rendez-vous et flux patients"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-md bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                      <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                      {isAr ? "معدل الحضور: 94%" : "Taux présence: 94%"}
                    </span>
                  </div>
                </div>

                {/* Mobile Chair Switcher */}
                <div className="flex sm:hidden items-center gap-1.5 mb-3.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveChair("all")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-pill transition-all shrink-0 cursor-pointer",
                      activeChair === "all" ? "bg-primary text-white shadow-sm" : "bg-surface-subtle text-muted hover:text-foreground"
                    )}
                  >
                    {isAr ? "الكل (3)" : "Tous les fauteuils"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChair(1)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-pill transition-all shrink-0 cursor-pointer",
                      activeChair === 1 ? "bg-primary text-white shadow-sm" : "bg-surface-subtle text-muted hover:text-foreground"
                    )}
                  >
                    Fauteuil 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChair(2)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-pill transition-all shrink-0 cursor-pointer",
                      activeChair === 2 ? "bg-accent text-white shadow-sm" : "bg-surface-subtle text-muted hover:text-foreground"
                    )}
                  >
                    Fauteuil 2
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChair(3)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-pill transition-all shrink-0 cursor-pointer",
                      activeChair === 3 ? "bg-gold text-white shadow-sm" : "bg-surface-subtle text-muted hover:text-foreground"
                    )}
                  >
                    Fauteuil 3
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Fauteuil 1 */}
                  <div className={cn(
                    "rounded-xl border border-border bg-surface-subtle p-3",
                    activeChair !== "all" && activeChair !== 1 ? "hidden sm:block" : "block"
                  )}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">Fauteuil 1 (Chirurgie)</span>
                      <span className="text-[10px] rounded bg-primary-soft px-1.5 py-0.5 text-primary font-bold">Dr. Bennani</span>
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border/80 bg-surface p-2.5 shadow-soft">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">09:30 — Mme. Idrissi</span>
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">Confirmé</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted">Pose implant titane #16 + Greffe</p>
                      </div>
                      <div className="rounded-lg border border-primary/40 bg-primary-soft/50 p-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-primary-dark">11:00 — M. Tazi</span>
                          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">En cours</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted">Couronne Zircone scan 3D</p>
                      </div>
                    </div>
                  </div>

                  {/* Fauteuil 2 */}
                  <div className={cn(
                    "rounded-xl border border-border bg-surface-subtle p-3",
                    activeChair !== "all" && activeChair !== 2 ? "hidden sm:block" : "block"
                  )}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-accent">Fauteuil 2 (Orthodontie)</span>
                      <span className="text-[10px] rounded bg-accent-soft px-1.5 py-0.5 text-accent font-bold">Dr. Alami</span>
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border/80 bg-surface p-2.5 shadow-soft">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">10:00 — Sarah K.</span>
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">Arrivée</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted">Contrôle gouttières invisibles #6</p>
                      </div>
                      <div className="rounded-lg border border-border/80 bg-surface p-2.5 shadow-soft">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">11:30 — Mehdi B.</span>
                          <span className="rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold text-gold">Rappel envoyé</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted">Pose bagues céramiques sup.</p>
                      </div>
                    </div>
                  </div>

                  {/* Fauteuil 3 */}
                  <div className={cn(
                    "rounded-xl border border-border bg-surface-subtle p-3",
                    activeChair !== "all" && activeChair !== 3 ? "hidden sm:block" : "block"
                  )}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-gold">Fauteuil 3 (Hygiène & Soins)</span>
                      <span className="text-[10px] rounded bg-gold-soft px-1.5 py-0.5 text-gold font-bold">Dr. Chraibi</span>
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border/80 bg-surface p-2.5 shadow-soft">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">10:30 — Karim L.</span>
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">Confirmé</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted">Détartrage ultrasons + Aéropolissage</p>
                      </div>
                      <div className="rounded-lg border border-border/80 bg-surface p-2.5 shadow-soft">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">12:00 — Yasmine O.</span>
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">Confirmé</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted">Blanchiment fauteuil LED</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Interactive 3D Odontogram */}
            <TabsContent value="patient">
              <div className="rounded-xl border border-border/70 bg-surface p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <h4 className="text-base font-extrabold text-foreground">
                      {isAr ? "الملف الطبي الرقمي — مخطط الأسنان التفاعلي" : "Odontogramme Numérique & Plan de Traitement"}
                    </h4>
                    <p className="text-xs text-muted">
                      {isAr ? "اضغط على السن لتحديد العلاج والتكلفة التقديرية" : "Cliquez sur une dent pour inspecter le diagnostic et devis"}
                    </p>
                  </div>
                  <span className="rounded-pill bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                    Patient: Youssef El Mansouri (34 ans)
                  </span>
                </div>

                <div className="grid gap-6 md:grid-cols-12 items-center">
                  <div className="md:col-span-7">
                    <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                      {isAr ? "مخطط الفك العلوي" : "Arcade Dentaire Supérieure"}
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {teeth.map((t) => {
                        const isSelected = selectedTooth === t.id;
                        return (
                          <Tooltip key={t.id}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setSelectedTooth(t.id)}
                                className={cn(
                                  "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer",
                                  isSelected
                                    ? "border-primary bg-primary text-white shadow-lift scale-105"
                                    : t.status === "implant"
                                    ? "border-gold/60 bg-gold-soft text-gold hover:border-gold"
                                    : t.status === "treatment"
                                    ? "border-accent/60 bg-accent-soft text-accent hover:border-accent"
                                    : "border-border bg-surface-subtle text-foreground hover:border-primary/40"
                                )}
                              >
                                <span className="text-sm font-black">#{t.id}</span>
                                <span className="text-[10px] opacity-80 uppercase">
                                  {t.status === "implant" ? "Imp." : t.status === "treatment" ? "Soin" : "Sain"}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-bold">{t.name}</p>
                              <p className="text-[10px] opacity-90">{t.status === "implant" ? "Implant posé 2024" : "Contrôle annuel"}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>

                  <div className="md:col-span-5 rounded-xl border border-border/80 bg-surface-subtle p-4">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                      {isAr ? "تفاصيل التشخيص المحدد" : "Détail de l'Acte Clinique"}
                    </p>
                    {selectedTooth === 16 ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-border/60 pb-1.5 font-bold">
                          <span>Dent #16: Implant Titane + Couronne Zircone</span>
                          <span className="text-primary">7 500 MAD</span>
                        </div>
                        <p className="text-muted">Marque: Straumann SLA® | Chirurgie guidée 3D</p>
                        <div className="rounded bg-accent-soft p-2 text-accent font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>Ostéointégration 100% validée à 3 mois</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-border/60 pb-1.5 font-bold">
                          <span>Dent #{selectedTooth}: Soin conservateur</span>
                          <span className="text-primary">450 MAD</span>
                        </div>
                        <p className="text-muted">Composite esthétique multicouche avec digue dentaire</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: WhatsApp Recall Simulator */}
            <TabsContent value="whatsapp">
              <div className="rounded-xl border border-border/70 bg-surface p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <h4 className="text-base font-extrabold text-foreground">
                      {isAr ? "محاكي رسائل واتساب الآلية للمرضى" : "Générateur Automatique de Rappels WhatsApp"}
                    </h4>
                    <p className="text-xs text-muted">
                      {isAr ? "تذكير تلقائي قبل 24 ساعة يقلل من نسبة الغياب بـ 70%" : "Réduction drastique des no-shows avec confirmation 1-clic"}
                    </p>
                  </div>
                  <span className="rounded-pill bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                    WhatsApp Business API Verified
                  </span>
                </div>

                <div className="mx-auto max-w-md rounded-2xl border border-border bg-[#e5ddd5]/30 p-4 shadow-soft">
                  <div className="rounded-xl bg-white p-3.5 shadow-sm border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">
                        DD
                      </div>
                      <span className="text-xs font-bold text-foreground">Cabinet Dentaire Souissi (Rabat)</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-800">
                      {isAr ? (
                        <>
                          السلام عليكم سيدة مريم، نذكركم بموعدكم غداً على الساعة <strong>15:30</strong> لدى د. العمراني في عيادة الأسنان بالرباط. لتأكيد الحضور اضغطوا على الرابط:
                        </>
                      ) : (
                        <>
                          Bonjour Mme. Meriem, nous vous rappelons votre rendez-vous demain à <strong>15h30</strong> chez le Dr. Amrani (Détartrage & Contrôle). Pour confirmer, cliquez simplement ci-dessous :
                        </>
                      )}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setWhatsappSent(true)}
                        className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{whatsappSent ? (isAr ? "تم التأكيد ✓" : "Confirmé ✓") : (isAr ? "تأكيد الموعد" : "Confirmer le RDV")}</span>
                      </button>
                    </div>
                  </div>
                  {whatsappSent && (
                    <div className="mt-2 text-center text-xs font-semibold text-emerald-700 animate-fade-in">
                      {isAr ? "تم تحديث الأجندة تلقائياً في ثوانٍ!" : "Agenda du cabinet synchronisé instantanément !"}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: Real-time Analytics & CA */}
            <TabsContent value="analytics">
              <div className="rounded-xl border border-border/70 bg-surface p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <h4 className="text-base font-extrabold text-foreground">
                      {isAr ? "لوحة القيادة المالية والتشغيلية" : "Tableau de Bord Financier & Performance"}
                    </h4>
                    <p className="text-xs text-muted">
                      {isAr ? "رؤية شاملة على المداخيل، نسبة الإشغال، ومستحقات التأمين" : "Visibilité complète sur le CA, les devis signés et remboursements"}
                    </p>
                  </div>
                  <span className="rounded-pill bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                    Mois en cours: Août 2026
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-surface-subtle p-4">
                    <p className="text-xs font-semibold text-muted">{isAr ? "رقم المعاملات المحقق" : "Chiffre d'Affaires"}</p>
                    <p className="mt-1 text-2xl font-black text-primary">184 500 MAD</p>
                    <p className="mt-1 text-[11px] font-bold text-accent">+18% {isAr ? "مقارنة بالشهر الماضي" : "vs mois précédent"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-subtle p-4">
                    <p className="text-xs font-semibold text-muted">{isAr ? "نسبة إشغال القاعات" : "Taux d'Occupation"}</p>
                    <p className="mt-1 text-2xl font-black text-foreground">88.5 %</p>
                    <p className="mt-1 text-[11px] font-bold text-accent">+6h {isAr ? "ساعات عمل مستثمرة/أسبوع" : "gagnées / fauteuil / sem."}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-subtle p-4">
                    <p className="text-xs font-semibold text-muted">{isAr ? "معدل تحويل عروض العلاج" : "Acceptation des Devis"}</p>
                    <p className="mt-1 text-2xl font-black text-gold">76 %</p>
                    <p className="mt-1 text-[11px] font-bold text-muted">{isAr ? "بفضل خطط العلاج ثلاثية الأبعاد" : "Grâce aux devis 3D clairs"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
