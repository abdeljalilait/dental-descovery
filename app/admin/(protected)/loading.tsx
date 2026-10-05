import { Container } from "@/components/ui/container";

export default function AdminLoading() {
  return (
    <Container className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-xl bg-surface-subtle" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-surface-subtle/80" />
        </div>
        <div className="h-10 w-32 rounded-pill bg-surface-subtle" />
      </div>

      {/* Cards skeleton grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-36 rounded-2xl border border-border/60 bg-surface p-5 space-y-3">
          <div className="h-4 w-28 rounded-md bg-surface-subtle" />
          <div className="h-8 w-16 rounded-md bg-surface-subtle" />
          <div className="h-3 w-40 rounded-md bg-surface-subtle" />
        </div>
        <div className="h-36 rounded-2xl border border-border/60 bg-surface p-5 space-y-3">
          <div className="h-4 w-28 rounded-md bg-surface-subtle" />
          <div className="h-8 w-16 rounded-md bg-surface-subtle" />
          <div className="h-3 w-40 rounded-md bg-surface-subtle" />
        </div>
        <div className="h-36 rounded-2xl border border-border/60 bg-surface p-5 space-y-3">
          <div className="h-4 w-28 rounded-md bg-surface-subtle" />
          <div className="h-8 w-16 rounded-md bg-surface-subtle" />
          <div className="h-3 w-40 rounded-md bg-surface-subtle" />
        </div>
      </div>

      {/* Table / Section skeleton */}
      <div className="rounded-2xl border border-border/60 bg-surface p-6 space-y-4">
        <div className="h-5 w-48 rounded-md bg-surface-subtle" />
        <div className="h-4 w-80 rounded-md bg-surface-subtle/80" />
        <div className="space-y-3 pt-4">
          <div className="h-12 w-full rounded-xl bg-surface-subtle/60" />
          <div className="h-12 w-full rounded-xl bg-surface-subtle/60" />
          <div className="h-12 w-full rounded-xl bg-surface-subtle/60" />
        </div>
      </div>
    </Container>
  );
}
