"use client";

import { useShortcuts } from "@/hooks/useShortcuts";

export default function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  useShortcuts();
  return <>{children}</>;
}
