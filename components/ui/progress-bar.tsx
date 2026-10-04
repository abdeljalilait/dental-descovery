/**
 * Determinate progress bar used by the admin job runners.
 *
 * Kept as a plain presentational component so both the campaign and the sync
 * panels can render the same bar without pulling in client state.
 */
export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}