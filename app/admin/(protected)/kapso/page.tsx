import { AdminPageHeader } from "@/components/admin/page-header";
import { siteConfig } from "@/lib/site.config";
import {
  getKapsoAccountsDb,
  getWhatsAppTemplatesDb,
} from "@/lib/repositories/kapso";
import {
  createKapsoAccountAction,
  deleteKapsoAccountAction,
  testKapsoAccountAction,
  syncKapsoTemplatesAction,
} from "@/app/admin/kapso-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Radio,
  FileCode2,
  ShieldCheck,
  Info,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminKapsoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const accounts = await getKapsoAccountsDb();
  const allTemplates = await getWhatsAppTemplatesDb();

  const webhookUrl = `${siteConfig.url}/api/webhooks/kapso`;
  const hasWebhookSecret = Boolean(process.env.KAPSO_WEBHOOK_SECRET);

  const error = typeof params.error === "string" ? params.error : null;
  const msg = typeof params.msg === "string" ? params.msg : null;
  const created = params.created === "1";
  const updated = params.updated === "1";
  const deleted = params.deleted === "1";
  const tested = params.tested === "1";
  const synced = typeof params.synced === "string" ? params.synced : null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="WhatsApp & Comptes Kapso"
        description="Gérez vos comptes Kapso (Cloud API Meta), testez vos clés API en direct, synchronisez vos templates et configurez le webhook de réception."
      />

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive flex items-center gap-2">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{msg || `Erreur: ${error}`}</span>
        </div>
      )}

      {(created || updated || deleted || tested || synced) && (
        <div className="rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm font-semibold text-accent flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            {msg
              ? msg
              : created
              ? "Compte Kapso créé et testé avec succès."
              : updated
              ? "Compte Kapso mis à jour."
              : deleted
              ? "Compte Kapso supprimé."
              : tested
              ? "Test de connexion réussi."
              : synced
              ? `${synced} template(s) synchronisé(s) depuis Kapso.`
              : "Opération réussie."}
          </span>
        </div>
      )}

      {/* Webhook Configuration Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold text-foreground">Endpoint Webhook WhatsApp</h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              hasWebhookSecret
                ? "bg-accent-soft text-accent"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{hasWebhookSecret ? "Secret Configuré" : "Secret Manquant"}</span>
          </span>
        </div>

        <p className="text-sm text-muted">
          Renseignez cette URL de webhook et votre jeton de vérification dans votre tableau de bord{" "}
          <strong>Kapso / Meta Developers</strong> pour recevoir les accusés de réception en temps réel (
          <em>delivered</em>, <em>read</em>, <em>failed</em>) et les mises à jour de statut des templates.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-subtle p-3">
            <span className="text-xs font-semibold text-muted block mb-1">Callback URL (Webhook)</span>
            <code className="text-xs font-mono text-primary font-bold break-all select-all">
              {webhookUrl}
            </code>
          </div>
          <div className="rounded-xl border border-border bg-surface-subtle p-3">
            <span className="text-xs font-semibold text-muted block mb-1">Verify Token (Secret)</span>
            <code className="text-xs font-mono text-foreground font-bold">
              {hasWebhookSecret ? "•••••••• (Défini dans KAPSO_WEBHOOK_SECRET)" : "Non défini — ajoutez KAPSO_WEBHOOK_SECRET"}
            </code>
          </div>
        </div>
      </div>

      {/* Accounts List & Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Comptes Kapso ({accounts.length})</h2>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-muted mx-auto" />
            <p className="text-sm font-semibold text-foreground">Aucun compte Kapso configuré</p>
            <p className="text-xs text-muted max-w-md mx-auto">
              Ajoutez votre premier compte ci-dessous avec vos identifiants Kapso (API Key et Phone Number ID) pour synchroniser vos templates et envoyer des campagnes.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((acc) => {
              const isActive = acc.status === "ACTIVE";
              const isError = acc.status === "ERROR";

              return (
                <div
                  key={acc.id}
                  className="rounded-2xl border border-border/80 bg-surface p-5 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-foreground">{acc.name}</h3>
                          {acc.isDefault && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                              Par défaut
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted font-mono mt-0.5">Phone ID: {acc.phoneNumberId}</p>
                        {acc.businessAccountId && (
                          <p className="text-[11px] text-muted font-mono">WABA ID: {acc.businessAccountId}</p>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isActive
                            ? "bg-accent-soft text-accent"
                            : isError
                            ? "bg-destructive/10 text-destructive"
                            : "bg-surface-subtle text-muted"
                        }`}
                      >
                        {isActive ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : isError ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Info className="h-3.5 w-3.5" />
                        )}
                        <span>{acc.status}</span>
                      </span>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-surface-subtle p-3 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted">Templates synchronisés:</span>
                        <span className="font-bold text-foreground">{acc.templatesCount ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Dernier test API:</span>
                        <span className="font-medium text-foreground">
                          {acc.lastTestedAt ? new Date(acc.lastTestedAt).toLocaleString("fr-FR") : "Jamais"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Dernière synchro:</span>
                        <span className="font-medium text-foreground">
                          {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleString("fr-FR") : "Jamais"}
                        </span>
                      </div>
                    </div>

                    {acc.testResult && (
                      <div className="rounded-xl bg-surface-subtle/80 p-2.5 text-[11px] font-mono text-muted overflow-x-auto">
                        <p className="font-semibold text-foreground mb-1">Dernier résultat de test:</p>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(acc.testResult, null, 2)}</pre>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-2">
                    {/* Test Connection Button */}
                    <form action={testKapsoAccountAction}>
                      <input type="hidden" name="id" value={acc.id} />
                      <SubmitButton
                        loadingText="Test en cours..."
                        icon={<Radio className="h-3.5 w-3.5 text-accent" />}
                        className="cursor-pointer rounded-pill bg-surface-subtle px-3 py-1.5 text-xs font-bold text-foreground hover:bg-primary-soft hover:text-primary transition-all border border-border/70 shadow-2xs"
                      >
                        Tester connexion
                      </SubmitButton>
                    </form>

                    {/* Sync Templates Button */}
                    <form action={syncKapsoTemplatesAction}>
                      <input type="hidden" name="id" value={acc.id} />
                      <SubmitButton
                        loadingText="Synchronisation..."
                        icon={<RefreshCw className="h-3.5 w-3.5" />}
                        className="cursor-pointer rounded-pill bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-dark transition-all shadow-xs"
                      >
                        Synchroniser templates
                      </SubmitButton>
                    </form>

                    {/* Delete Account */}
                    <form action={deleteKapsoAccountAction} className="ms-auto">
                      <input type="hidden" name="id" value={acc.id} />
                      <SubmitButton
                        title="Supprimer ce compte"
                        icon={<Trash2 className="h-4 w-4" />}
                        className="p-1.5 text-muted hover:text-destructive transition-colors rounded-pill hover:bg-destructive/10"
                      />
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Account Form */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Ajouter un nouveau compte Kapso</h2>
        </div>

        <form action={createKapsoAccountAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nom du compte *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="ex: Dentora Casablanca - 0661..."
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
              placeholder="WABA ID (requis pour synchroniser les templates Meta)"
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              API Key Kapso *
            </label>
            <input
              type="password"
              name="apiKey"
              required
              placeholder="kapso_api_key_..."
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-primary"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-foreground mb-1">
              Base URL Kapso (Proxy Meta Cloud API)
            </label>
            <input
              type="url"
              name="baseUrl"
              defaultValue="https://api.kapso.ai/meta/whatsapp"
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-primary"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              defaultChecked={accounts.length === 0}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isDefault" className="text-xs font-medium text-foreground cursor-pointer">
              Définir comme compte principal par défaut
            </label>
          </div>

          <div className="sm:col-span-2 pt-2">
            <SubmitButton
              loadingText="Vérification et enregistrement..."
              icon={<Plus className="h-4 w-4" />}
              className="cursor-pointer rounded-pill bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition-all shadow-xs"
            >
              Enregistrer et tester le compte
            </SubmitButton>
          </div>
        </form>
      </div>

      {/* Synced Templates List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Templates synchronisés dans la base ({allTemplates.length})
            </h2>
            <p className="text-xs text-muted">
              Ces templates sont récupérés directement depuis Kapso et respectent strictement la nomenclature des paramètres Meta (<code>[a-z0-9_]+</code>).
            </p>
          </div>
        </div>

        {allTemplates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center space-y-2">
            <FileCode2 className="h-8 w-8 text-muted mx-auto" />
            <p className="text-sm font-semibold text-foreground">Aucun template synchronisé</p>
            <p className="text-xs text-muted">
              Cliquez sur <strong>Synchroniser templates</strong> sur l&apos;un de vos comptes Kapso ci-dessus pour importer vos templates approuvés.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {allTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-2xl border border-border/80 bg-surface p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-foreground">{tpl.name}</h3>
                      <p className="text-[11px] text-muted">Compte: {tpl.accountName}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-bold text-foreground uppercase border border-border/60">
                        {tpl.language}
                      </span>
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                        {tpl.status}
                      </span>
                    </div>
                  </div>

                  {/* Body text preview */}
                  <div className="mt-3 rounded-xl border border-border/60 bg-surface-subtle p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                    {tpl.bodyText}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Paramètres détectés (Meta Compliant):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.variables.length > 0 ? (
                      tpl.variables.map((v) => (
                        <span
                          key={v}
                          className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-mono font-bold text-primary"
                        >
                          {"{{" + v + "}}"}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted italic">Aucune variable requise</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
