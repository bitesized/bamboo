"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { GoogleBook, BookWithEntry, Status, AddDates } from "@/lib/types";
import StarRating from "./StarRating";
import ShelfPicker from "./ShelfPicker";

interface Props {
  book: GoogleBook | BookWithEntry;
  onAdd?: (book: GoogleBook, status: Status, dates: AddDates) => void;
  onStatusChange?: (entryId: string, status: string) => void;
  onRatingChange?: (entryId: string, rating: number) => void;
  onDateChange?: (entryId: string, field: "startedAt" | "finishedAt", value: string | null) => void;
  onRemove?: (entryId: string) => void;
  loading?: boolean;
  inLibrary?: boolean;
  autoShowDates?: boolean;
}

export default function BookCard({
  book, onAdd, onStatusChange, onRatingChange, onDateChange, onRemove, loading, inLibrary, autoShowDates,
}: Props) {
  const entry = "entry" in book ? book.entry : null;
  const authors = book.authors.join(", ");
  const isInLibrary = inLibrary || !!entry;

  const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

  const hasExistingDates = !!(entry?.startedAt || entry?.finishedAt);
  const [showDates, setShowDates] = useState(hasExistingDates);
  const [localStartedAt, setLocalStartedAt] = useState(toDateInput(entry?.startedAt));
  const [localFinishedAt, setLocalFinishedAt] = useState(toDateInput(entry?.finishedAt));

  useEffect(() => {
    if (autoShowDates) setShowDates(true);
  }, [autoShowDates]);

  useEffect(() => {
    setLocalStartedAt(toDateInput(entry?.startedAt));
    setLocalFinishedAt(toDateInput(entry?.finishedAt));
  }, [entry?.id, entry?.startedAt, entry?.finishedAt]);

  function saveDates() {
    if (!onDateChange || !entry) return;
    onDateChange(entry.id, "startedAt", localStartedAt || null);
    if (entry.status === "READ") {
      onDateChange(entry.id, "finishedAt", localFinishedAt || null);
    }
  }

  const showDateSection =
    entry &&
    (entry.status === "READING" || entry.status === "READ") &&
    onDateChange;

  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition-colors">
      <Link
        href={`/books/${book.id}`}
        className="flex-shrink-0 w-16 h-24 bg-stone-100 dark:bg-stone-800 rounded overflow-hidden relative block"
      >
        {book.coverUrl ? (
          <Image src={book.coverUrl} alt={book.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 dark:text-stone-500 text-xs text-center px-1">
            No cover
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/books/${book.id}`} className="hover:underline">
          <h3 className="font-medium text-stone-900 dark:text-stone-100 truncate">{book.title}</h3>
        </Link>
        <p className="text-sm text-stone-500 dark:text-stone-400 truncate">{authors || "Unknown author"}</p>
        {book.publishedYear && (
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{book.publishedYear}</p>
        )}

        <div className="mt-2 space-y-2">
          {entry ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={entry.status}
                  onChange={(e) => onStatusChange?.(entry.id, e.target.value)}
                  className="text-xs border border-stone-200 dark:border-stone-600 rounded px-2 py-1 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
                >
                  <option value="WANT_TO_READ">Want to Read</option>
                  <option value="READING">Reading</option>
                  <option value="READ">Read</option>
                </select>
                <StarRating value={entry.rating} onChange={(r) => onRatingChange?.(entry.id, r)} />
                {onRemove && (
                  <button
                    onClick={() => onRemove(entry.id)}
                    className="text-xs text-stone-400 dark:text-stone-500 hover:text-red-500 transition-colors ml-auto"
                  >
                    Remove
                  </button>
                )}
              </div>

              {showDateSection && (
                showDates ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex items-center gap-1.5">
                      <span className="text-xs text-stone-400 dark:text-stone-500">Started</span>
                      <input
                        type="date"
                        value={localStartedAt}
                        onChange={(e) => setLocalStartedAt(e.target.value)}
                        className="text-xs border border-stone-200 dark:border-stone-600 rounded px-2 py-0.5 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-300"
                      />
                    </label>
                    {entry.status === "READ" && (
                      <label className="flex items-center gap-1.5">
                        <span className="text-xs text-stone-400 dark:text-stone-500">Finished</span>
                        <input
                          type="date"
                          value={localFinishedAt}
                          onChange={(e) => setLocalFinishedAt(e.target.value)}
                          className="text-xs border border-stone-200 dark:border-stone-600 rounded px-2 py-0.5 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-300"
                        />
                      </label>
                    )}
                    <button
                      onClick={saveDates}
                      className="text-xs px-2.5 py-1 border border-stone-300 dark:border-stone-600 rounded hover:bg-stone-900 dark:hover:bg-stone-100 hover:text-white dark:hover:text-stone-900 hover:border-stone-900 transition-colors"
                    >
                      Save dates
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDates(true)}
                    className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                  >
                    + Add dates
                  </button>
                )
              )}
            </>
          ) : isInLibrary ? (
            <span className="text-xs text-stone-400 dark:text-stone-500 italic">In library</span>
          ) : (
            <ShelfPicker
              loading={loading}
              onSelect={(status, dates) => onAdd?.(book as GoogleBook, status, dates)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
