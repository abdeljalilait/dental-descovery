import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "accent";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-lift",
  secondary: "bg-primary-soft text-primary-dark hover:bg-primary hover:text-white hover:-translate-y-0.5",
  outline: "border border-border bg-surface text-foreground hover:border-primary hover:text-primary",
  ghost: "text-primary hover:bg-primary-soft",
  accent: "bg-accent text-white hover:bg-accent/90 hover:-translate-y-0.5 hover:shadow-lift",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
} & React.ComponentPropsWithoutRef<"a">) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}

export { base as buttonBase, variants as buttonVariants, sizes as buttonSizes };
