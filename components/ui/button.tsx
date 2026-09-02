"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { buttonBase, buttonVariants, buttonSizes } from "@/components/ui/button-link";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "accent";
type Size = "md" | "lg" | "sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const sizeClasses = size === "sm" ? "h-9 px-3.5 text-xs" : buttonSizes[size];
    return (
      <button
        ref={ref}
        className={cn(buttonBase, buttonVariants[variant], sizeClasses, className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
