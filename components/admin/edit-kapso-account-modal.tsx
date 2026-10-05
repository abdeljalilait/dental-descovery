"use client";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateKapsoAccountAction } from "@/app/admin/kapso-actions";
import { Pencil } from "lucide-react";
import type { KapsoAccountRow } from "@/lib/repositories/kapso";

export function EditKapsoAccountModal({ account }: { account: KapsoAccountRow }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Modifier ce compte"
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-pill bg-surface-subtle px-3 py-1.5 text-xs font-bold text-foreground hover:bg-primary-soft hover:text-primary transition-all border border-border/70 shadow-2xs"
        >
          <Pencil className="h-3.5 w-3.5 text-muted group-hover:text-primary" />
          <span>Modifier</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Modifier le compte Kapso</DialogTitle>
          <DialogDescription>
            Mettez à jour les identifiants et la configuration de connexion pour{" "}
            <strong>{account.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form action={updateKapsoAccountAction} className="space-y-4 p-6 pt-2">
          <input type="hidden" name="id" value={account.id} />

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nom du compte *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={account.name}
              placeholder="ex: Dentora Casablanca"
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Phone Number ID (Meta / Kapso) *
            </label>
            <input
              type="text"
              name="phoneNumberId"
              required
              defaultValue={account.phoneNumberId}
              placeholder="ex: 104829105829102"
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Business Account ID (WABA ID)
            </label>
            <input
              type="text"
              name="businessAccountId"
              defaultValue={account.businessAccountId ?? ""}
              placeholder="WABA ID (requis pour synchroniser les templates Meta)"
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              API Key Kapso
            </label>
            <input
              type="password"
              name="apiKey"
              placeholder="Laisser vide pour conserver la clé actuelle"
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-primary"
            />
            <p className="mt-1 text-[11px] text-muted">
              Laissez ce champ vide si vous ne souhaitez pas modifier votre clé API existante.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Base URL Kapso (Proxy Meta Cloud API)
            </label>
            <input
              type="url"
              name="baseUrl"
              defaultValue={account.baseUrl || "https://api.kapso.ai/meta/whatsapp"}
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id={`isDefault-${account.id}`}
              name="isDefault"
              defaultChecked={account.isDefault}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label
              htmlFor={`isDefault-${account.id}`}
              className="text-xs font-medium text-foreground cursor-pointer"
            >
              Définir comme compte principal par défaut
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <DialogClose asChild>
              <button
                type="button"
                className="cursor-pointer rounded-pill border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-subtle hover:text-foreground transition-all"
              >
                Annuler
              </button>
            </DialogClose>
            <SubmitButton
              loadingText="Enregistrement..."
              icon={<Pencil className="h-3.5 w-3.5" />}
              className="cursor-pointer rounded-pill bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-dark transition-all shadow-xs"
            >
              Enregistrer les modifications
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
