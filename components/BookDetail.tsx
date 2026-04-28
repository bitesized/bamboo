"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { BookWithEntry, EntryData, Status, AddDates } from "@/lib/types";
import StarRating from "./StarRating";
import ShelfPicker from "./ShelfPicker";
import Toast from "./Toast";
import { useToast } from "@/hooks/useToast";
import { sanitizeHtml } from "@/lib/sanitize";

const LANGUAGE_NAMES = new Intl.DisplayNames(["en"], { type: "language" });

function langName(code: string | null) {
  if (!code) return null;
  try { return LANGUAGE_NAMES.of(code) ?? code; } catch { return code; }
}

export default function BookDetail({ book: initial }: { book: BookWithEntry }) {
  const router = useRouter();
  const [entry, setEntry] = useState<EntryData | null>(initial.entry);
  const [adding, setAdding] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const rawDescription = initial.description ?? "";
  const safeDescription = sanitizeHtml(rawDescription);
  const isLong = rawDescription.replace(/<[^>]+>/g, "").length > 500;

  async function handleAdd(status: Status, dates: AddDates) {
    setAdding(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...initial, status, ...dates }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setEntry(data.entry);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!entry) return;
    const snapshot = entry;
    // Optimistic: clear entry
    setEntry(null);

    toast({
      message: `Removed "${initial.title}"`,
      action: {
        label: "Undo",
        onClick: async () => {
          // Re-add the entry by re-posting the book
          const res = await fetch("/api/books", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...initial,
              status: snapshot.status,
              startedAt: snapshot.startedAt,
              finishedAt: snapshot.finishedAt,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setEntry(data.entry);
          }
        },
      },
      durationMs: 5000,
    });

    await fetch(`/api/entries/${snapshot.id}`, { method: "DELETE" });
  }

  const patch = useCallback(
    async (updates: Partial<EntryData>) => {
      if (!entry) return;
      setEntry((prev) => prev && { ...prev, ...updates });
      await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    },
    [entry]
  );

  function handleStatusChange(status: Status) {
    patch({ status });
  }

  const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  return (
    <div className="space-y-8">
      <Toast toasts={toasts} onDismiss={dismiss} />

      <button
        onClick={() => router.back()}
        className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
      >
        ← Back
      </button>

      {/* ── Header ── */}
      <div className="flex gap-6">
        <div className="flex-shrink-0 w-28 h-40 bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden relative shadow-sm">
          {initial.coverUrl ? (
            <Image src={initial.coverUrl} alt={initial.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400 dark:text-stone-500 text-xs text-center px-2">
              No cover
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold leading-tight text-stone-900 dark:text-stone-100">{initial.title}</h1>
          {initial.subtitle && (
            <p className="text-stone-500 dark:text-stone-400 mt-0.5 text-sm leading-snug">{initial.subtitle}</p>
          )}
          <p className="text-stone-600 dark:text-stone-400 mt-1.5">
            {initial.authors.join(", ") || "Unknown author"}
          </p>
          {initial.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {initial.genres.map((g) => (
                <span key={g} className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Metadata grid ── */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm border border-stone-200 dark:border-stone-700 rounded-lg p-4 bg-white dark:bg-stone-900">
        {initial.publishedYear && <Meta label="Published" value={initial.publishedYear} />}
        {initial.pageCount && <Meta label="Pages" value={initial.pageCount.toLocaleString()} />}
        {initial.publisher && <Meta label="Publisher" value={initial.publisher} />}
        {initial.isbn && <Meta label="ISBN" value={initial.isbn} mono />}
        {initial.language && <Meta label="Language" value={langName(initial.language) ?? initial.language} />}
      </dl>

      {/* ── Description ── */}
      {safeDescription && (
        <div>
          <div
            className={`text-sm text-stone-700 dark:text-stone-300 leading-relaxed prose prose-sm max-w-none prose-stone dark:prose-invert overflow-hidden transition-all ${
              !descExpanded && isLong ? "max-h-36" : ""
            }`}
            dangerouslySetInnerHTML={{ __html: safeDescription }}
          />
          {isLong && (
            <button
              onClick={() => setDescExpanded((v) => !v)}
              className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 mt-1 transition-colors"
            >
              {descExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* ── Entry editor ── */}
      <div className="border-t border-stone-200 dark:border-stone-700 pt-6">
        {!entry ? (
          <ShelfPicker onSelect={handleAdd} loading={adding} />
        ) : (
          <div className="space-y-5">
            <h2 className="font-medium text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wide">Your entry</h2>

            <div className="flex flex-wrap gap-4 items-start">
              <div>
                <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Status</label>
                <select
                  value={entry.status}
                  onChange={(e) => handleStatusChange(e.target.value as Status)}
                  className="text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-3 py-1.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  <option value="WANT_TO_READ">Want to Read</option>
                  <option value="READING">Reading</option>
                  <option value="READ">Read</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Rating</label>
                <StarRating value={entry.rating} onChange={(r) => patch({ rating: r || null })} />
              </div>
            </div>

            {(entry.status === "READING" || entry.status === "READ") && (
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Started</label>
                  <input
                    type="date"
                    value={toDateInput(entry.startedAt)}
                    onChange={(e) =>
                      patch({ startedAt: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                    className="text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-3 py-1.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300"
                  />
                </div>
                {entry.status === "READ" && (
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Finished</label>
                    <input
                      type="date"
                      value={toDateInput(entry.finishedAt)}
                      onChange={(e) =>
                        patch({ finishedAt: e.target.value ? new Date(e.target.value).toISOString() : null })
                      }
                      className="text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-3 py-1.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Notes</label>
              <textarea
                defaultValue={entry.notes ?? ""}
                onBlur={(e) => {
                  const val = e.target.value.trim() || null;
                  if (val !== (entry.notes ?? null)) patch({ notes: val });
                }}
                rows={4}
                placeholder="Your thoughts…"
                className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-3 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
              />
            </div>

            <button
              onClick={handleRemove}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Remove from library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-stone-400 dark:text-stone-500">{label}</dt>
      <dd className={`text-stone-700 dark:text-stone-300 mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
