import { cn } from "@/lib/utils/cn";

export function Section({
  className,
  tone = "default",
  children,
  id,
}: {
  className?: string;
  tone?: "default" | "surface" | "soft";
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-20 lg:py-24",
        tone === "surface" && "bg-surface",
        tone === "soft" && "gradient-soft",
        className
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "start";
}) {
  return (
    <div className={cn("mb-10 max-w-2xl sm:mb-12", align === "center" ? "mx-auto text-center" : "text-start")}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="display-heading mt-3 text-balance text-3xl sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-pretty leading-relaxed text-muted">{subtitle}</p> : null}
    </div>
  );
}
