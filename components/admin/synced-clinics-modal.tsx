"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SyncedClinicSummary } from "@/lib/repositories/job-runs";
import { clinicPath } from "@/lib/routes";

export function SyncedClinicsModal({
  open,
  onOpenChange,
  clinics,
  searchQueries = [],
  jobMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinics: SyncedClinicSummary[];
  searchQueries?: string[];
  jobMessage?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | "created" | "updated">("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const createdCount = useMemo(
    () => clinics.filter((c) => c.action === "created").length,
    [clinics]
  );
  const updatedCount = useMemo(
    () => clinics.filter((c) => c.action === "updated").length,
    [clinics]
  );

  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    for (const c of clinics) {
      if (c.citySlug) citySet.add(c.citySlug);
    }
    return Array.from(citySet).sort();
  }, [clinics]);

  const filteredClinics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clinics.filter((c) => {
      if (actionFilter !== "all" && c.action !== actionFilter) return false;
      if (selectedCity !== "all" && c.citySlug !== selectedCity) return false;
      if (!q) return true;

      return (
        c.name.toLowerCase().includes(q) ||
        c.citySlug.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
    });
  }, [clinics, search, actionFilter, selectedCity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/80 px-6 py-5 bg-surface">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-black text-foreground">
                  Cliniques synchronisées
                </DialogTitle>
                <DialogDescription className="text-xs text-muted">
                  {clinics.length} cliniques enregistrées · {createdCount} nouvelles · {updatedCount} mises à jour
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {jobMessage ? (
            <p className="mt-2 text-xs font-medium text-muted bg-surface-subtle/80 px-3 py-1.5 rounded-lg border border-border/50">
              {jobMessage}
            </p>
          ) : null}

          {searchQueries && searchQueries.length > 0 ? (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary-soft/30 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {searchQueries.length > 1
                    ? `Requêtes Google Maps exécutées (${searchQueries.length})`
                    : "Requête Google Maps exécutée"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {searchQueries.map((query, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-surface px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground shadow-2xs"
                  >
                    <span className="text-primary font-bold">"</span>
                    <span>{query}</span>
                    <span className="text-primary font-bold">"</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Search & Filter Bar */}
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Rechercher par nom, ville, téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9.5 w-full rounded-xl border border-border bg-background ps-9 pe-8 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="h-9.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">Toutes les villes ({clinics.length})</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city.charAt(0).toUpperCase() + city.slice(1)} (
                    {clinics.filter((c) => c.citySlug === city).length})
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-xl border border-border bg-surface-subtle p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActionFilter("all")}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    actionFilter === "all"
                      ? "bg-surface font-bold text-foreground shadow-2xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Toutes
                </button>
                <button
                  type="button"
                  onClick={() => setActionFilter("created")}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    actionFilter === "created"
                      ? "bg-emerald-500 font-bold text-white shadow-2xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Nouvelles ({createdCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActionFilter("updated")}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    actionFilter === "updated"
                      ? "bg-primary font-bold text-white shadow-2xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Mises à jour ({updatedCount})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Clinics List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-background/50">
          {filteredClinics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted/60" />
              <p className="mt-2 text-sm font-semibold text-foreground">
                Aucune clinique trouvée
              </p>
              <p className="mt-1 text-xs text-muted">
                Essayez de modifier votre recherche ou vos filtres.
              </p>
            </div>
          ) : (
            filteredClinics.map((clinic, index) => {
              const isCreated = clinic.action === "created";
              const publicUrl = clinicPath("fr", clinic.citySlug, clinic.slug);

              return (
                <div
                  key={`${clinic.slug}-${index}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface p-4 transition-all hover:border-primary/40 hover:shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          isCreated
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {isCreated ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Nouvelle
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3" />
                            Mise à jour
                          </>
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-pill bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold text-muted border border-border/60">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span className="capitalize">{clinic.citySlug}</span>
                      </span>

                      {clinic.rating ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{clinic.rating.toFixed(1)}</span>
                          {clinic.reviewCount ? (
                            <span className="text-[11px] font-normal text-muted">
                              ({clinic.reviewCount} avis)
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </div>

                    <h4 className="mt-1.5 text-sm font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                      {clinic.name}
                    </h4>

                    {clinic.address ? (
                      <p className="mt-0.5 text-xs text-muted truncate">
                        {clinic.address}
                      </p>
                    ) : null}

                    {clinic.phone ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <a
                          href={`tel:${clinic.phone}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-primary transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{clinic.phone}</span>
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 flex items-center gap-2 sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                    <Link
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-subtle px-3 py-1.5 text-xs font-bold text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all"
                    >
                      <span>Voir la fiche</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/80 bg-surface px-6 py-3.5">
          <p className="text-xs text-muted">
            Affichage de <span className="font-bold text-foreground">{filteredClinics.length}</span> sur {clinics.length} cliniques
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-pill bg-surface-subtle border border-border px-4 py-1.5 text-xs font-bold text-foreground hover:bg-border transition-colors"
          >
            Fermer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
