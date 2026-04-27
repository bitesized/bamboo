"use client";

import Image from "next/image";
import Link from "next/link";
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
}

export default function BookCard({
  book, onAdd, onStatusChange, onRatingChange, onDateChange, onRemove, loading, inLibrary,
}: Props) {
  const entry = "entry" in book ? book.entry : null;
  const authors = book.authors.join(", ");
  const isInLibrary = inLibrary || !!entry;

  const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  return (
    <div className="flex gap-4 p-4 bg-white rounded-lg border border-stone-200 hover:border-stone-300 transition-colors">
      <Link
        href={`/books/${book.id}`}
        className="flex-shrink-0 w-16 h-24 bg-stone-100 rounded overflow-hidden relative block"
      >
        {book.coverUrl ? (
          <Image src={book.coverUrl} alt={book.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs text-center px-1">
            No cover
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/books/${book.id}`} className="hover:underline">
          <h3 className="font-medium text-stone-900 truncate">{book.title}</h3>
        </Link>
        <p className="text-sm text-stone-500 truncate">{authors || "Unknown author"}</p>
        {book.publishedYear && (
          <p className="text-xs text-stone-400 mt-0.5">{book.publishedYear}</p>
        )}

        <div className="mt-2 space-y-2">
          {entry ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={entry.status}
                  onChange={(e) => onStatusChange?.(entry.id, e.target.value)}
                  className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-stone-700 cursor-pointer"
                >
                  <option value="WANT_TO_READ">Want to Read</option>
                  <option value="READING">Reading</option>
                  <option value="READ">Read</option>
                </select>
                <StarRating value={entry.rating} onChange={(r) => onRatingChange?.(entry.id, r)} />
                {onRemove && (
                  <button
                    onClick={() => onRemove(entry.id)}
                    className="text-xs text-stone-400 hover:text-red-500 transition-colors ml-auto"
                  >
                    Remove
                  </button>
                )}
              </div>

              {(entry.status === "READING" || entry.status === "READ") && onDateChange && (
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5">
                    <span className="text-xs text-stone-400">Started</span>
                    <input
                      type="date"
                      value={toDateInput(entry.startedAt)}
                      onChange={(e) =>
                        onDateChange(entry.id, "startedAt", e.target.value || null)
                      }
                      className="text-xs border border-stone-200 rounded px-2 py-0.5 bg-white text-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-300"
                    />
                  </label>
                  {entry.status === "READ" && (
                    <label className="flex items-center gap-1.5">
                      <span className="text-xs text-stone-400">Finished</span>
                      <input
                        type="date"
                        value={toDateInput(entry.finishedAt)}
                        onChange={(e) =>
                          onDateChange(entry.id, "finishedAt", e.target.value || null)
                        }
                        className="text-xs border border-stone-200 rounded px-2 py-0.5 bg-white text-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-300"
                      />
                    </label>
                  )}
                </div>
              )}
            </>
          ) : isInLibrary ? (
            <span className="text-xs text-stone-400 italic">In library</span>
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
