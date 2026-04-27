"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { BookWithEntry, EntryData, Status, AddDates } from "@/lib/types";
import StarRating from "./StarRating";
import ShelfPicker from "./ShelfPicker";
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
  const [removing, setRemoving] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const rawDescription = initial.description ?? "";
  const safeDescription = sanitizeHtml(rawDescription);
  const isLong = rawDescription.replace(/<[^>]+>/g, "").length > 500;

  async function handleAdd(status: Status, dates: AddDates) {
    setAdding(true);
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...initial, status, ...dates }),
    });
    const data = await res.json();
    setEntry(data.entry);
    setAdding(false);
  }

  async function handleRemove() {
    if (!entry) return;
    setRemoving(true);
    await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
    router.push("/library");
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
    const updates: Partial<EntryData> = { status };
    if (status === "READING" && !entry?.startedAt) updates.startedAt = new Date().toISOString();
    if (status === "READ" && !entry?.finishedAt) updates.finishedAt = new Date().toISOString();
    patch(updates);
  }

  const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  return (
    <div className="space-y-8">
      <button
        onClick={() => router.back()}
        className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
      >
        ← Back
      </button>

      {/* ── Header ── */}
      <div className="flex gap-6">
        <div className="flex-shrink-0 w-28 h-40 bg-stone-100 rounded-lg overflow-hidden relative shadow-sm">
          {initial.coverUrl ? (
            <Image src={initial.coverUrl} alt={initial.title} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs text-center px-2">
              No cover
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold leading-tight">{initial.title}</h1>
          {initial.subtitle && (
            <p className="text-stone-500 mt-0.5 text-sm leading-snug">{initial.subtitle}</p>
          )}
          <p className="text-stone-600 mt-1.5">
            {initial.authors.join(", ") || "Unknown author"}
          </p>
          {initial.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {initial.genres.map((g) => (
                <span key={g} className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Metadata grid ── */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm border border-stone-200 rounded-lg p-4 bg-white">
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
            className={`text-sm text-stone-700 leading-relaxed prose prose-sm max-w-none prose-stone overflow-hidden transition-all ${
              !descExpanded && isLong ? "max-h-36" : ""
            }`}
            dangerouslySetInnerHTML={{ __html: safeDescription }}
          />
          {isLong && (
            <button
              onClick={() => setDescExpanded((v) => !v)}
              className="text-xs text-stone-400 hover:text-stone-700 mt-1 transition-colors"
            >
              {descExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* ── Entry editor ── */}
      <div className="border-t border-stone-200 pt-6">
        {!entry ? (
          <ShelfPicker onSelect={handleAdd} loading={adding} />
        ) : (
          <div className="space-y-5">
            <h2 className="font-medium text-sm text-stone-500 uppercase tracking-wide">Your entry</h2>

            <div className="flex flex-wrap gap-4 items-start">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Status</label>
                <select
                  value={entry.status}
                  onChange={(e) => handleStatusChange(e.target.value as Status)}
                  className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white text-stone-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  <option value="WANT_TO_READ">Want to Read</option>
                  <option value="READING">Reading</option>
                  <option value="READ">Read</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Rating</label>
                <StarRating value={entry.rating} onChange={(r) => patch({ rating: r })} />
              </div>
            </div>

            {(entry.status === "READING" || entry.status === "READ") && (
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Started</label>
                  <input
                    type="date"
                    value={toDateInput(entry.startedAt)}
                    onChange={(e) =>
                      patch({ startedAt: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                    className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
                  />
                </div>
                {entry.status === "READ" && (
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Finished</label>
                    <input
                      type="date"
                      value={toDateInput(entry.finishedAt)}
                      onChange={(e) =>
                        patch({ finishedAt: e.target.value ? new Date(e.target.value).toISOString() : null })
                      }
                      className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs text-stone-500 mb-1">Notes</label>
              <textarea
                defaultValue={entry.notes ?? ""}
                onBlur={(e) => {
                  const val = e.target.value.trim() || null;
                  if (val !== (entry.notes ?? null)) patch({ notes: val });
                }}
                rows={4}
                placeholder="Your thoughts…"
                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
              />
            </div>

            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove from library"}
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
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className={`text-stone-700 mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
