/**
 * Admin section header.
 *
 * Lives outside `app/admin/(protected)/layout.tsx` on purpose: the App Router
 * validates layout exports and rejects anything beyond the documented set
 * (`default`, `metadata`, `generateMetadata`, segment config), so a shared
 * component cannot be exported from a layout module.
 */
export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}