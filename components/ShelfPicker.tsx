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
        className="text-xs px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 transition-colors disabled:opacity-50"
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
          className="text-xs px-2.5 py-1 border border-stone-300 rounded hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-colors"
        >
          {label}
        </button>
      ))}
      <button
        onClick={() => setPicking(false)}
        className="text-xs px-2 py-1 text-stone-400 hover:text-stone-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
