"use client";

import { useState } from "react";
import type { Status, AddDates } from "@/lib/types";

const SHELVES: { value: Status; label: string }[] = [
  { value: "WANT_TO_READ", label: "Want to Read" },
  { value: "READING", label: "Reading" },
  { value: "READ", label: "Read" },
];

interface Props {
  onSelect: (status: Status, dates: AddDates) => void;
  loading?: boolean;
}

export default function ShelfPicker({ onSelect, loading }: Props) {
  const [picking, setPicking] = useState(false);

  if (!picking) {
    return (
      <button
        onClick={() => setPicking(true)}
        disabled={loading}
        className="text-xs px-3 py-1 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
      >
        {loading ? "Adding…" : "Add to library"}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {SHELVES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => { onSelect(value, {}); setPicking(false); }}
          className="text-xs px-2.5 py-1 border border-stone-300 dark:border-stone-600 rounded hover:bg-stone-900 dark:hover:bg-stone-100 hover:text-white dark:hover:text-stone-900 hover:border-stone-900 dark:hover:border-stone-100 transition-colors text-stone-700 dark:text-stone-300"
        >
          {label}
        </button>
      ))}
      <button
        onClick={() => setPicking(false)}
        className="text-xs px-2 py-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
