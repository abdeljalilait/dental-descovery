"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loadingText?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Accessible button with built-in React 19 `useFormStatus` pending detection.
 * Automatically shows a spinner and disables click events when a Server Action
 * or form submission is processing.
 */
export function SubmitButton({
  loadingText,
  icon,
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 transition-all disabled:pointer-events-none disabled:opacity-60",
        className
      )}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          {loadingText ? <span>{loadingText}</span> : children ? <span>{children}</span> : null}
        </>
      ) : (
        <>
          {icon}
          {children ? <span>{children}</span> : null}
        </>
      )}
    </button>
  );
}
