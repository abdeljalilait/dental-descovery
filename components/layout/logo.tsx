export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl gradient-hero">
        <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 fill-white" aria-hidden>
          <path d="M19.44 5.34c-.53-.4-1.16-.68-1.85-.8a4.9 4.9 0 0 0-2.02.05c-.68.15-1.3.43-1.9.72-.6.28-1.2.58-1.67.84-.48-.26-1.07-.56-1.67-.84-.6-.29-1.22-.57-1.9-.72a4.9 4.9 0 0 0-2.02-.05c-.69.12-1.32.4-1.85.8-1.2.9-1.68 2.4-1.55 4.13.1 1.4.5 2.87 1.13 4.43.4 1 .9 2.03 1.3 2.82.3.6.53 1.03.63 1.2.35.63.62 1.06.93 1.42.3.35.65.56 1.07.6.45.05.83-.13 1.13-.44.3-.31.55-.74.78-1.27.27-.62.5-1.38.76-2.2.1-.34.2-.66.3-.93.1-.28.18-.48.26-.6.08-.12.1-.12.13-.12.03 0 .05 0 .13.12.08.12.16.32.26.6.1.27.2.59.3.93.26.82.49 1.58.76 2.2.23.53.48.96.78 1.27.3.31.68.49 1.13.44.42-.04.77-.25 1.07-.6.31-.36.58-.79.93-1.42.1-.17.33-.6.63-1.2.4-.79.9-1.82 1.3-2.82.63-1.56 1.03-3.03 1.13-4.43.13-1.73-.35-3.23-1.55-4.13Z" />
        </svg>
      </span>
      <span className="text-base font-extrabold tracking-tight text-foreground">
        Dental<span className="text-primary">Discovery</span>
      </span>
    </span>
  );
}
