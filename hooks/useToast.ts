"use client";

import { useState, useCallback } from "react";
import type { ToastData } from "@/components/Toast";

let counter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toast = useCallback((opts: Omit<ToastData, "id">) => {
    const id = String(++counter);
    setToasts((prev) => [...prev, { ...opts, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
