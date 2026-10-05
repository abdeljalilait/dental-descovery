"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top loading progress bar that gives immediate feedback whenever
 * an operator or patient navigates routes or triggers transitions.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKey = `${pathname}?${searchParams.toString()}`;

  const [prevKey, setPrevKey] = useState(currentKey);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Adjust state during render when key changes (official React pattern)
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setLoading(false);
  }

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");

      if (anchor && anchor.href) {
        const targetUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Only trigger for same-origin internal navigations that change the URL
        if (
          targetUrl.origin === currentUrl.origin &&
          targetUrl.pathname + targetUrl.search !== currentUrl.pathname + currentUrl.search &&
          !anchor.hasAttribute("download") &&
          anchor.target !== "_blank" &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey
        ) {
          startTransition(() => {
            setLoading(true);
          });
        }
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-accent via-primary to-accent animate-[pulse_1s_infinite] w-full origin-left transition-all duration-300" />
    </div>
  );
}
