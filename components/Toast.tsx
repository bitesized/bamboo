"use client";

import { useEffect, useRef } from "react";

export interface ToastData {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface Props {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: Props) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), toast.durationMs ?? 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 bg-stone-800 dark:bg-stone-700 text-white text-sm rounded-lg shadow-lg min-w-[220px] max-w-xs">
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss(toast.id); }}
          className="text-xs font-medium text-stone-300 hover:text-white transition-colors flex-shrink-0"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-stone-400 hover:text-white transition-colors flex-shrink-0 ml-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
