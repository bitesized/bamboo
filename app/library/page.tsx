"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { BookWithEntry, Status } from "@/lib/types";
import BookCard from "@/components/BookCard";

const FILTERS: { label: string; value: Status }[] = [
  { label: "Read", value: "READ" },
  { label: "Reading", value: "READING" },
  { label: "Want to Read", value: "WANT_TO_READ" },
];

export default function LibraryPage() {
  const [books, setBooks] = useState<BookWithEntry[]>([]);
  const [filter, setFilter] = useState<Status>("READ");
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then(setBooks)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleStatusChange = useCallback(async (entryId: string, status: string) => {
    setBooks((prev) =>
      prev.map((b) =>
        b.entry?.id === entryId ? { ...b, entry: { ...b.entry!, status: status as Status } } : b
      )
    );
    await fetch(`/api/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }, []);

  const handleRatingChange = useCallback(async (entryId: string, rating: number) => {
    setBooks((prev) =>
      prev.map((b) =>
        b.entry?.id === entryId ? { ...b, entry: { ...b.entry!, rating } } : b
      )
    );
    await fetch(`/api/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
  }, []);

  const handleDateChange = useCallback(
    async (entryId: string, field: "startedAt" | "finishedAt", value: string | null) => {
      setBooks((prev) =>
        prev.map((b) =>
          b.entry?.id === entryId ? { ...b, entry: { ...b.entry!, [field]: value } } : b
        )
      );
      await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    },
    []
  );

  const handleRemove = useCallback(async (entryId: string) => {
    setBooks((prev) => prev.filter((b) => b.entry?.id !== entryId));
    await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
  }, []);

  const openDeleteModal = () => {
    setDeleteInput("");
    setDeleteModal(true);
    setTimeout(() => deleteInputRef.current?.focus(), 50);
  };

  const handleDeleteAll = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    await fetch("/api/books", { method: "DELETE" });
    setBooks([]);
    setDeleteModal(false);
    setDeleting(false);
  };

  const filtered = books.filter((b) => b.entry?.status === filter);

  return (
    <div className="space-y-6">
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 mx-4">
            <h2 className="font-semibold text-lg">Delete all books?</h2>
            <p className="text-sm text-stone-600">
              This will permanently remove every book and entry from your library. This cannot be undone.
            </p>
            <p className="text-sm text-stone-700">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm:
            </p>
            <input
              ref={deleteInputRef}
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDeleteAll()}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="DELETE"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 text-sm text-stone-600 border border-stone-200 rounded-lg hover:border-stone-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteInput !== "DELETE" || deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? "Deleting…" : "Delete all"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="text-stone-500 text-sm mt-1">
            {books.length} book{books.length !== 1 ? "s" : ""}
          </p>
        </div>
        {books.length > 0 && (
          <button
            onClick={openDeleteModal}
            className="text-xs text-red-500 hover:text-red-700 transition-colors mt-1 flex-shrink-0"
          >
            Delete all books
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              filter === value
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-stone-400">No books here yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onStatusChange={handleStatusChange}
              onRatingChange={handleRatingChange}
              onDateChange={handleDateChange}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
