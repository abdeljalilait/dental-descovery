"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { savePostAction, type ArticleFormState } from "@/app/admin/actions";
import type { BlogPostRecord, LocalizedText } from "@/lib/data/types";

/**
 * Shared field styling. `Field` owns the label/help wiring so every input in
 * this form is labelled the same way.
 */
const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary";

function Field({
  label,
  htmlFor,
  help,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {help ? <p className="mt-1 text-xs text-muted">{help}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** One locale's editorial content, tab by tab. */
function LocaleFields({
  locale,
  post,
}: {
  locale: "fr" | "ar";
  post?: BlogPostRecord;
}) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const isAr = locale === "ar";
  // Field *names* must match the camelCase keys the server action reads
  // (`titleFr`, `metaTitleAr`, ...), while the ids stay lowercase.
  const suffix = isAr ? "Ar" : "Fr";

  return (
    <div className="space-y-4">
      <Field label={isAr ? "Title (Arabic)" : "Title (French)"} htmlFor={`title${locale}`}>
        <input
          id={`title${locale}`}
          name={`title${suffix}`}
          dir={dir}
          required
          defaultValue={post?.title[locale] ?? ""}
          className={inputClass}
        />
      </Field>

      <Field
        label={isAr ? "Excerpt (Arabic)" : "Excerpt (French)"}
        htmlFor={`excerpt${locale}`}
        help="Short summary used in listings and as the meta description fallback."
      >
        <textarea
          id={`excerpt${locale}`}
          name={`excerpt${suffix}`}
          dir={dir}
          rows={3}
          defaultValue={post?.excerpt[locale] ?? ""}
          className={inputClass}
        />
      </Field>

      <Field
        label={isAr ? "Body (Arabic)" : "Body (French)"}
        htmlFor={`content${locale}`}
        help="Plain text. Separate paragraphs with a blank line — the renderer splits on double newlines."
      >
        <textarea
          id={`content${locale}`}
          name={`content${suffix}`}
          dir={dir}
          rows={18}
          required
          defaultValue={post?.content[locale] ?? ""}
          className={`${inputClass} font-mono text-[13px] leading-relaxed`}
        />
      </Field>

      <Field
        label={isAr ? "Category (Arabic)" : "Category (French)"}
        htmlFor={`category${locale}`}
        help="Display label only. Categories are free text, not a managed list."
      >
        <input
          id={`category${locale}`}
          name={`category${suffix}`}
          dir={dir}
          defaultValue={post?.category[locale] ?? ""}
          className={inputClass}
        />
      </Field>

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          SEO override
        </p>
        <div className="space-y-4">
          <Field
            label="Meta title"
            htmlFor={`metaTitle${locale}`}
            help="Leave empty to use the article title."
          >
            <input
              id={`metaTitle${locale}`}
              name={`metaTitle${suffix}`}
              dir={dir}
              defaultValue={post?.metaTitle[locale] ?? ""}
              className={inputClass}
            />
          </Field>

          <Field
            label="Meta description"
            htmlFor={`metaDescription${locale}`}
            help="Leave empty to use the excerpt."
          >
            <textarea
              id={`metaDescription${locale}`}
              name={`metaDescription${suffix}`}
              dir={dir}
              rows={2}
              defaultValue={post?.metaDescription[locale] ?? ""}
              className={inputClass}
            />
          </Field>

          <Field
            label="Keywords"
            htmlFor={`keywords${locale}`}
            help="Comma-separated."
          >
            <input
              id={`keywords${locale}`}
              name={`keywords${suffix}`}
              dir={dir}
              defaultValue={post?.keywords[locale] ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? "Saving…" : isNew ? "Create article" : "Save changes"}
    </button>
  );
}

export function ArticleForm({
  post,
  cities,
  specialties,
  saved,
}: {
  post?: BlogPostRecord;
  cities: { slug: string; name: string; nameAr: string }[];
  specialties: { slug: string; name: LocalizedText }[];
  saved?: boolean;
}) {
  const [state, formAction] = useActionState<ArticleFormState, FormData>(savePostAction, {});
  const isNew = !post;

  return (
    <form action={formAction} className="space-y-6">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}

      <Panel title="Publishing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Slug"
            htmlFor="slug"
            help="Shared by both languages. Changing it changes the public URL."
          >
            <input
              id="slug"
              name="slug"
              dir="ltr"
              required
              defaultValue={post?.slug ?? ""}
              className={`${inputClass} font-mono`}
            />
          </Field>

          <Field label="Status" htmlFor="status">
            <select id="status" name="status" defaultValue={post?.status ?? "DRAFT"} className={inputClass}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </Field>

          <Field label="Reading time (minutes)" htmlFor="readTime">
            <input
              id="readTime"
              name="readTime"
              type="number"
              min={1}
              max={120}
              defaultValue={post?.readTime ?? 5}
              className={inputClass}
            />
          </Field>

          {post?.publishedAt ? (
            <Field label="Published" htmlFor="publishedAt-readonly">
              <p
                id="publishedAt-readonly"
                className="rounded-xl border border-border bg-surface-subtle px-3.5 py-2.5 text-sm text-muted"
              >
                {post.publishedAt.slice(0, 10)}
              </p>
            </Field>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Related city"
            htmlFor="relatedCitySlug"
            help="Used to show clinics from that city at the foot of the article."
          >
            <select
              id="relatedCitySlug"
              name="relatedCitySlug"
              defaultValue={post?.relatedCitySlug ?? ""}
              className={inputClass}
            >
              <option value="">None</option>
              {cities.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name} / {city.nameAr}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Related specialty"
            htmlFor="relatedSpecialtySlug"
            help="Links the article to a treatment page and to related-article rails."
          >
            <select
              id="relatedSpecialtySlug"
              name="relatedSpecialtySlug"
              defaultValue={post?.relatedSpecialtySlug ?? ""}
              className={inputClass}
            >
              <option value="">None</option>
              {specialties.map((specialty) => (
                <option key={specialty.slug} value={specialty.slug}>
                  {specialty.name.fr} / {specialty.name.ar}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>

      <Panel title="Content">
        <Tabs defaultValue="fr">
          <TabsList>
            <TabsTrigger value="fr">Français</TabsTrigger>
            <TabsTrigger value="ar">العربية</TabsTrigger>
          </TabsList>
          {/* `forceMount` keeps the inactive panel in the DOM. Without it Radix
              unmounts the hidden locale, so its inputs never submit and the
              Arabic title/body arrive empty. Radix still hides the inactive
              panel, so this costs nothing visually. */}
          <TabsContent value="fr" forceMount>
            <LocaleFields locale="fr" post={post} />
          </TabsContent>
          <TabsContent value="ar" forceMount>
            <LocaleFields locale="ar" post={post} />
          </TabsContent>
        </Tabs>
      </Panel>

      <Panel title="Images">
        <p className="text-xs text-muted">
          URLs only — there is no upload endpoint. Host the image anywhere and paste the link.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cover image URL" htmlFor="coverImageUrl">
            <input
              id="coverImageUrl"
              name="coverImageUrl"
              type="url"
              dir="ltr"
              defaultValue={post?.coverImageUrl ?? ""}
              className={`${inputClass} font-mono text-xs`}
            />
          </Field>

          <Field
            label="Open Graph image URL"
            htmlFor="ogImageUrl"
            help="Falls back to the cover image when empty."
          >
            <input
              id="ogImageUrl"
              name="ogImageUrl"
              type="url"
              dir="ltr"
              defaultValue={post?.ogImageUrl ?? ""}
              className={`${inputClass} font-mono text-xs`}
            />
          </Field>
        </div>
      </Panel>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Changes saved.</p>
      ) : null}
      {saved ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Article created.</p>
      ) : null}

      <div className="flex items-center gap-3">
        <SaveButton isNew={isNew} />
      </div>
    </form>
  );
}