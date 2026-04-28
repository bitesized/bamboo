"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import type { BookWithEntry, Status } from "@/lib/types";
import BookCard from "@/components/BookCard";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const FILTERS: { label: string; value: Status }[] = [
  { label: "Read", value: "READ" },
  { label: "Reading", value: "READING" },
  { label: "Want to Read", value: "WANT_TO_READ" },
];

type SortKey = "updatedAt" | "title" | "author" | "finishedAt" | "rating" | "pageCount";

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Recently updated", value: "updatedAt" },
  { label: "Title", value: "title" },
  { label: "Author", value: "author" },
  { label: "Date finished", value: "finishedAt" },
  { label: "Rating", value: "rating" },
  { label: "Page count", value: "pageCount" },
];

function comparator(key: SortKey) {
  return (a: BookWithEntry, b: BookWithEntry): number => {
    switch (key) {
      case "title":
        return a.title.localeCompare(b.title);
      case "author": {
        const aA = a.authors[0] ?? "";
        const bA = b.authors[0] ?? "";
        return aA.localeCompare(bA);
      }
      case "finishedAt": {
        const af = a.entry?.finishedAt ?? "";
        const bf = b.entry?.finishedAt ?? "";
        return bf.localeCompare(af); // desc
      }
      case "rating": {
        const ar = a.entry?.rating ?? 0;
        const br = b.entry?.rating ?? 0;
        return br - ar; // desc
      }
      case "pageCount": {
        const ap = a.pageCount ?? 0;
        const bp = b.pageCount ?? 0;
        return bp - ap; // desc
      }
      case "updatedAt":
      default: {
        const au = a.entry?.updatedAt ?? "";
        const bu = b.entry?.updatedAt ?? "";
        return bu.localeCompare(au); // desc
      }
    }
  };
}

function matchesSearch(book: BookWithEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    book.title.toLowerCase().includes(q) ||
    book.authors.some((a) => a.toLowerCase().includes(q))
  );
}

function BookSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 animate-pulse">
      <div className="flex-shrink-0 w-16 h-24 bg-stone-200 dark:bg-stone-700 rounded" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
        <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
        <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/4 mt-3" />
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [books, setBooks] = useState<BookWithEntry[]>([]);
  const [filter, setFilter] = useState<Status>("READ");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { toasts, toast, dismiss } = useToast();

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

  // Expose search input for keyboard shortcut `/`
  useEffect(() => {
    const input = searchRef.current;
    if (!input) return;
    // Tag it so useShortcuts can find it
    input.setAttribute("data-search", "true");
  }, []);

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
    const ratingVal = rating || null;
    setBooks((prev) =>
      prev.map((b) =>
        b.entry?.id === entryId ? { ...b, entry: { ...b.entry!, rating: ratingVal } } : b
      )
    );
    await fetch(`/api/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: ratingVal }),
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
    const book = books.find((b) => b.entry?.id === entryId);
    const snapshot = book?.entry;
    if (!snapshot) return;

    // Optimistic remove
    setBooks((prev) => prev.filter((b) => b.entry?.id !== entryId));

    toast({
      message: `Removed "${book.title}"`,
      action: {
        label: "Undo",
        onClick: async () => {
          const res = await fetch("/api/books", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...book,
              status: snapshot.status,
              startedAt: snapshot.startedAt,
              finishedAt: snapshot.finishedAt,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setBooks((prev) => [data, ...prev]);
          }
        },
      },
      durationMs: 5000,
    });

    await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
  }, [books, toast]);

  const openDeleteModal = () => {
    setDeleteInput("");
    setDeleteModal(true);
    setTimeout(() => deleteInputRef.current?.focus(), 50);
  };

  // Close modal on Esc
  useEffect(() => {
    function onClose() { setDeleteModal(false); }
    document.addEventListener("bamboo:close-modal", onClose);
    return () => document.removeEventListener("bamboo:close-modal", onClose);
  }, []);

  const handleDeleteAll = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    await fetch("/api/books", { method: "DELETE" });
    setBooks([]);
    setDeleteModal(false);
    setDeleting(false);
  };

  const displayedBooks = useMemo(() => {
    return [...books]
      .filter((b) => b.entry?.status === filter)
      .filter((b) => matchesSearch(b, query))
      .sort(comparator(sortKey));
  }, [books, filter, query, sortKey]);

  const filteredCount = books.filter((b) => b.entry?.status === filter).length;

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 mx-4">
            <h2 className="font-semibold text-lg text-stone-900 dark:text-stone-100">Delete all books?</h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              This will permanently remove every book and entry from your library. This cannot be undone.
            </p>
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm:
            </p>
            <input
              ref={deleteInputRef}
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDeleteAll()}
              className="w-full border border-stone-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="DELETE"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 text-sm text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-600 rounded-lg hover:border-stone-400 transition-colors"
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
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Library</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
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

      {/* Search + sort */}
      {books.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author…"
            className="flex-1 min-w-48 px-3 py-1.5 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-1.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer focus:outline-none"
          >
            {SORT_OPTIONS.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              filter === value
                ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100"
                : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <BookSkeleton key={i} />)}
        </div>
      ) : displayedBooks.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          {query ? (
            <>
              <p className="text-stone-500 dark:text-stone-400">No books matching "{query}"</p>
              <button
                onClick={() => setQuery("")}
                className="text-sm text-stone-600 dark:text-stone-400 underline"
              >
                Clear search
              </button>
            </>
          ) : filteredCount === 0 ? (
            <>
              <p className="text-stone-500 dark:text-stone-400 text-lg">
                {filter === "READ"
                  ? "No books read yet."
                  : filter === "READING"
                  ? "Not currently reading anything."
                  : "No books on your want-to-read list."}
              </p>
              <Link
                href="/search"
                className="inline-block text-sm px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors"
              >
                Find books to add
              </Link>
            </>
          ) : (
            <p className="text-sm text-stone-400 dark:text-stone-500">No results.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedBooks.map((book) => (
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
