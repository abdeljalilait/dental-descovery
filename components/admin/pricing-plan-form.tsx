"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PricingPlanRecord } from "@/lib/data/types";
import { leadTypes } from "@/lib/data/types";
import {
  savePricingPlanAction,
  deletePricingPlanAction,
  reorderPricingPlansAction,
  type PricingPlanFormState,
} from "@/app/admin/pricing-actions";
import { cn } from "@/lib/utils/cn";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary";

function SubmitButton({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer rounded-pill bg-primary px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60 shadow-sm"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function PlanEditorCard({
  plan,
  isFirstHighlighted,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  plan: PricingPlanRecord;
  isFirstHighlighted: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [state, formAction] = useActionState<PricingPlanFormState, FormData>(
    savePricingPlanAction,
    {}
  );
  const [isExpanded, setIsExpanded] = useState(false);

  // Completeness warnings
  const warnings: string[] = [];
  if (!plan.name.fr || !plan.name.ar) warnings.push("Missing name translation");
  if (!plan.price.fr || !plan.price.ar) warnings.push("Missing price translation");
  if (plan.features.fr.length === 0) warnings.push("No French features listed");
  if (plan.features.ar.length === 0) warnings.push("No Arabic features listed");
  if (plan.highlighted && !isFirstHighlighted) {
    warnings.push("Flagged as highlighted, but another plan ahead of it in sort order already takes priority.");
  }

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200",
        plan.active ? "border-border bg-surface" : "border-border/60 bg-surface-subtle/50 opacity-80",
        plan.highlighted && isFirstHighlighted && "ring-2 ring-primary/40"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label="Move plan up"
              className="cursor-pointer rounded p-1 text-muted transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label="Move plan down"
              className="cursor-pointer rounded p-1 text-muted transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/10 text-muted">
                #{plan.sortOrder}
              </span>
              <h3 className="text-base font-bold text-foreground">
                {plan.name.fr} <span className="font-normal text-muted" dir="rtl">({plan.name.ar})</span>
              </h3>
              {plan.badge.fr ? (
                <span className="rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {plan.badge.fr}
                </span>
              ) : null}
              {plan.highlighted ? (
                <span
                  className={cn(
                    "rounded-pill px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                    isFirstHighlighted
                      ? "bg-accent/15 text-accent"
                      : "bg-amber-100 text-amber-800"
                  )}
                >
                  {isFirstHighlighted ? "Active Highlight" : "Highlight Secondary"}
                </span>
              ) : null}
              {!plan.active ? (
                <span className="rounded-pill bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                  Inactive
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted">
              Key: <code className="font-mono font-bold">{plan.key}</code> • Price: {plan.price.fr} {plan.period.fr} • Lead: {plan.leadType} • {plan.features.fr.length} features
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {warnings.length > 0 ? (
            <span
              title={warnings.join(" | ")}
              className="inline-flex items-center gap-1 rounded-pill bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>{warnings.length} warning{warnings.length > 1 ? "s" : ""}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Complete</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer rounded-pill border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {isExpanded ? "Collapse" : "Edit Plan"}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <form action={formAction} className="border-t border-border/80 p-6 space-y-6 bg-surface-subtle/30">
          <input type="hidden" name="key" value={plan.key} />

          {state.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {state.error}
            </div>
          ) : null}

          {state.saved ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              Plan saved and pages revalidated.
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Completeness Notice:
              </p>
              <ul className="list-disc ps-5 space-y-0.5">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Core Settings */}
          <div className="grid gap-4 sm:grid-cols-4 items-center">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Key (read-only)</label>
              <input
                type="text"
                disabled
                value={plan.key}
                className={cn(inputClass, "bg-muted/10 text-muted cursor-not-allowed")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Sort Order</label>
              <input
                type="number"
                name="sortOrder"
                defaultValue={plan.sortOrder}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Lead Type</label>
              <select name="leadType" defaultValue={plan.leadType} className={inputClass}>
                {leadTypes.map((lt) => (
                  <option key={lt} value={lt}>
                    {lt}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={plan.active}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>Active (publicly visible)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  name="highlighted"
                  defaultChecked={plan.highlighted}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>Highlighted (featured card)</span>
              </label>
            </div>
          </div>

          <p className="text-[11px] text-muted">
            * Note on Highlight: Only the first highlighted plan in sort order will receive the enlarged featured styling (<code className="font-mono text-primary">scale-105</code>).
          </p>

          {/* Bilingual Names & Pricing */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* French Section */}
            <div className="space-y-4 rounded-xl border border-border/80 bg-surface p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">French (Français)</h4>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Name</label>
                <input type="text" name="nameFr" defaultValue={plan.name.fr} required className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Price</label>
                  <input type="text" name="priceFr" defaultValue={plan.price.fr} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Period</label>
                  <input type="text" name="periodFr" defaultValue={plan.period.fr} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">CTA Label</label>
                  <input type="text" name="ctaFr" defaultValue={plan.cta.fr} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Badge (optional)</label>
                  <input type="text" name="badgeFr" defaultValue={plan.badge.fr ?? ""} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Features (one per line, max 12)
                </label>
                <textarea
                  name="featuresFr"
                  rows={6}
                  defaultValue={plan.features.fr.join("\n")}
                  className={cn(inputClass, "font-sans leading-relaxed")}
                />
              </div>
            </div>

            {/* Arabic Section */}
            <div className="space-y-4 rounded-xl border border-border/80 bg-surface p-4" dir="rtl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary text-start">العربية (Arabic)</h4>
              <div>
                <label className="block text-xs font-medium text-muted mb-1 text-start">الاسم</label>
                <input type="text" name="nameAr" defaultValue={plan.name.ar} required className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1 text-start">السعر</label>
                  <input type="text" name="priceAr" defaultValue={plan.price.ar} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1 text-start">الفترة</label>
                  <input type="text" name="periodAr" defaultValue={plan.period.ar} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1 text-start">زر الإجراء</label>
                  <input type="text" name="ctaAr" defaultValue={plan.cta.ar} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1 text-start">شارة العرض (اختياري)</label>
                  <input type="text" name="badgeAr" defaultValue={plan.badge.ar ?? ""} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1 text-start">
                  المميزات (ميزة في كل سطر، حد أقصى 12)
                </label>
                <textarea
                  name="featuresAr"
                  rows={6}
                  defaultValue={plan.features.ar.join("\n")}
                  className={cn(inputClass, "font-sans leading-relaxed")}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <SubmitButton label="Update Plan" />

            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to delete the plan "${plan.name.fr}" (${plan.key})?`)) {
                  const fd = new FormData();
                  fd.set("key", plan.key);
                  deletePricingPlanAction(fd);
                }
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Plan</span>
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function NewPlanForm({ onCancel }: { onCancel: () => void }) {
  const [state, formAction] = useActionState<PricingPlanFormState, FormData>(
    savePricingPlanAction,
    {}
  );

  return (
    <form action={formAction} className="rounded-2xl border-2 border-primary/30 bg-surface p-6 space-y-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Add New Pricing Plan</h3>
          <p className="text-xs text-muted">Create a new subscription plan or offering.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-xs font-semibold text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          Plan created successfully!
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4 items-center">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Key (e.g. enterprise)</label>
          <input
            type="text"
            name="key"
            placeholder="cabinet-plus"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Sort Order</label>
          <input
            type="number"
            name="sortOrder"
            defaultValue={100}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Lead Type</label>
          <select name="leadType" defaultValue="app-demo" className={inputClass}>
            {leadTypes.map((lt) => (
              <option key={lt} value={lt}>
                {lt}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 pt-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>Active</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
            <input
              type="checkbox"
              name="highlighted"
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>Highlighted</span>
          </label>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* French */}
        <div className="space-y-4 rounded-xl border border-border/80 bg-surface-subtle/40 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">French (Français)</h4>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Name</label>
            <input type="text" name="nameFr" placeholder="Cabinet +" required className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Price</label>
              <input type="text" name="priceFr" placeholder="899 MAD" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Period</label>
              <input type="text" name="periodFr" placeholder="/ mois" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">CTA Label</label>
              <input type="text" name="ctaFr" placeholder="Choisir cette offre" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Badge (optional)</label>
              <input type="text" name="badgeFr" placeholder="Recommandé" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Features (one per line, max 12)</label>
            <textarea
              name="featuresFr"
              rows={5}
              placeholder={"2 Médecins\n3 Assistantes\n30 msg WhatsApp / jour\nApplication dentaire Cloud"}
              className={cn(inputClass, "font-sans leading-relaxed")}
            />
          </div>
        </div>

        {/* Arabic */}
        <div className="space-y-4 rounded-xl border border-border/80 bg-surface-subtle/40 p-4" dir="rtl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary text-start">العربية (Arabic)</h4>
          <div>
            <label className="block text-xs font-medium text-muted mb-1 text-start">الاسم</label>
            <input type="text" name="nameAr" placeholder="عيادة +" required className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1 text-start">السعر</label>
              <input type="text" name="priceAr" placeholder="899 درهم" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1 text-start">الفترة</label>
              <input type="text" name="periodAr" placeholder="شهرياً" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1 text-start">زر الإجراء</label>
              <input type="text" name="ctaAr" placeholder="اختر الباقة" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1 text-start">شارة العرض</label>
              <input type="text" name="badgeAr" placeholder="موصى به" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1 text-start">المميزات (ميزة في كل سطر)</label>
            <textarea
              name="featuresAr"
              rows={5}
              placeholder={"طبيبان\n3 مساعدات\n30 رسالة واتساب / يوم\nتطبيق سحابي للعيادة"}
              className={cn(inputClass, "font-sans leading-relaxed")}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-pill border border-border px-4 py-2 text-xs font-semibold text-muted hover:text-foreground"
        >
          Cancel
        </button>
        <SubmitButton label="Create Plan" />
      </div>
    </form>
  );
}

export function PricingPlansEditor({ plans }: { plans: PricingPlanRecord[] }) {
  const [showNewForm, setShowNewForm] = useState(false);

  // Find first highlighted plan in sort order
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const firstHighlightedKey = sortedPlans.find((p) => p.highlighted)?.key;

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sortedPlans.length) return;
    const newItems = [...sortedPlans];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    const keys = newItems.map((p) => p.key);

    const fd = new FormData();
    fd.set("keys", JSON.stringify(keys));
    await reorderPricingPlansAction(fd);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">
            Managing <strong className="text-foreground">{plans.length}</strong> pricing plans. Reorder with the arrows to change display order.
          </p>
        </div>
        {!showNewForm ? (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            <span>Add Plan</span>
          </button>
        ) : null}
      </div>

      {showNewForm ? <NewPlanForm onCancel={() => setShowNewForm(false)} /> : null}

      <div className="space-y-4">
        {sortedPlans.map((plan, index) => (
          <PlanEditorCard
            key={plan.key}
            plan={plan}
            isFirstHighlighted={plan.key === firstHighlightedKey}
            canMoveUp={index > 0}
            canMoveDown={index < sortedPlans.length - 1}
            onMoveUp={() => handleReorder(index, index - 1)}
            onMoveDown={() => handleReorder(index, index + 1)}
          />
        ))}

        {sortedPlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted">No pricing plans found in database.</p>
            <p className="text-xs text-muted mt-1">
              The public site is currently falling back to the 3 default dictionary plans.
            </p>
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="cursor-pointer mt-4 inline-flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Plan</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
