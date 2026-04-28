"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useShortcuts() {
  const router = useRouter();
  // Track g-chord state
  const pendingG = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable;

      // Esc: close modals (dispatch a custom event so modal owners can listen)
      if (e.key === "Escape") {
        document.dispatchEvent(new CustomEvent("bamboo:close-modal"));
        return;
      }

      // Don't intercept when typing in inputs, except for `/`
      if (isInput && e.key !== "/") return;

      // `/` — focus global search
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          router.push("/search");
        }
        return;
      }

      // g-chord navigation
      if (pendingG.current) {
        pendingG.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        switch (e.key) {
          case "s": router.push("/search"); break;
          case "l": router.push("/library"); break;
          case "h": router.push("/"); break;
          case "t": router.push("/stats"); break;
        }
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        pendingG.current = true;
        gTimer.current = setTimeout(() => { pendingG.current = false; }, 1000);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [router]);
}
