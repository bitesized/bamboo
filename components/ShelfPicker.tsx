"use client";

import { useState } from "react";
import type { Status, AddDates } from "@/lib/types";

const SHELVES: { value: Status; label: string }[] = [
  { value: "WANT_TO_READ", label: "Want to Read" },
  { value: "READING", label: "Reading" },
  { value: "READ", label: "Read" },
];

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  onSelect: (status: Status, dates: AddDates) => void;
  loading?: boolean;
}

export default function ShelfPicker({ onSelect, loading }: Props) {
  const [step, setStep] = useState<"idle" | "picking" | "dating">("idle");
  const [shelf, setShelf] = useState<Status | null>(null);
  const [startedAt, setStartedAt] = useState(today());
  const [finishedAt, setFinishedAt] = useState(today());

  function pickShelf(s: Status) {
    if (s === "WANT_TO_READ") {
      onSelect(s, {});
      setStep("idle");
    } else {
      setShelf(s);
      setStep("dating");
    }
  }

  function confirm() {
    if (!shelf) return;
    const dates: AddDates = { startedAt };
    if (shelf === "READ") dates.finishedAt = finishedAt;
    onSelect(shelf, dates);
    setStep("idle");
    setShelf(null);
  }

  if (step === "idle") {
    return (
      <button
        onClick={() => setStep("picking")}
        disabled={loading}
        className="text-xs px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Adding…" : "Add to library"}
      </button>
    );
  }

  if (step === "picking") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {SHELVES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => pickShelf(value)}
            className="text-xs px-2.5 py-1 border border-stone-300 rounded hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-colors"
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setStep("idle")}
          className="text-xs px-2 py-1 text-stone-400 hover:text-stone-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // dating step
  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-500 font-medium">
        {shelf === "READ" ? "When did you read it?" : "When did you start?"}
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-stone-400">
            {shelf === "READ" ? "Started" : "Start date"}
          </span>
          <input
            type="date"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
        </label>
        {shelf === "READ" && (
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-stone-400">Finished</span>
            <input
              type="date"
              value={finishedAt}
              onChange={(e) => setFinishedAt(e.target.value)}
              className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={confirm}
          className="text-xs px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 transition-colors"
        >
          Add to library
        </button>
        <button
          onClick={() => setStep("picking")}
          className="text-xs px-2 py-1 text-stone-400 hover:text-stone-600 transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}
