"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { GoogleBook, BookWithEntry, Status, AddDates } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { useDebounce } from "@/hooks/useDebounce";

function BookSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 animate-pulse">
      <div className="flex-shrink-0 w-16 h-24 bg-stone-200 dark:bg-stone-700 rounded" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
        <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
        <div className="h-6 bg-stone-200 dark:bg-stone-700 rounded w-28 mt-3" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [libraryIds, setLibraryIds] = useState<Set<string>>(new Set());
  const [addedBooks, setAddedBooks] = useState<Map<string, BookWithEntry>>(new Map());
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: GoogleBook[]) => setResults(data))
      .catch((err) => { if (err.name !== "AbortError") setResults([]); })
      .finally(() => setSearching(false));
    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((books: BookWithEntry[]) => setLibraryIds(new Set(books.map((b) => b.id))));
  }, []);

  const handleAdd = useCallback(async (book: GoogleBook, status: Status, dates: AddDates) => {
    setAdding((prev) => new Set(prev).add(book.id));
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...book, status, ...dates }),
      });
      if (!res.ok) return;
      const data: BookWithEntry = await res.json();
      setAddedBooks((prev) => new Map(prev).set(book.id, data));
      setJustAdded((prev) => new Set(prev).add(book.id));
      setLibraryIds((prev) => new Set(prev).add(book.id));
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(book.id);
        return next;
      });
    }
  }, []);

  const handleDateChange = useCallback(
    async (entryId: string, field: "startedAt" | "finishedAt", value: string | null) => {
      setAddedBooks((prev) => {
        const next = new Map(prev);
        next.forEach((bwe, bookId) => {
          if (bwe.entry?.id === entryId) {
            next.set(bookId, { ...bwe, entry: { ...bwe.entry!, [field]: value } });
          }
        });
        return next;
      });
      await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    },
    []
  );

  const hasQuery = query.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Search</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Find books to add to your library</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, author, or ISBN..."
        autoFocus
        className="w-full px-4 py-2.5 border border-stone-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-400"
      />

      {searching && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <BookSkeleton key={i} />)}
        </div>
      )}

      {!searching && hasResults && (
        <div className="space-y-3">
          {results.map((book) => {
            const added = addedBooks.get(book.id);
            const alreadyInLibrary = !added && libraryIds.has(book.id);
            return (
              <BookCard
                key={book.id}
                book={added ?? book}
                onAdd={added ? undefined : handleAdd}
                onDateChange={added ? handleDateChange : undefined}
                autoShowDates={justAdded.has(book.id)}
                loading={adding.has(book.id)}
                inLibrary={alreadyInLibrary}
              />
            );
          })}
        </div>
      )}

      {!searching && hasQuery && !hasResults && (
        <div className="text-center py-12 space-y-3">
          <p className="text-stone-500 dark:text-stone-400">No results for "{query}"</p>
          <p className="text-sm text-stone-400 dark:text-stone-500">Try a different title, author, or ISBN</p>
        </div>
      )}

      {!searching && !hasQuery && (
        <div className="text-center py-12 space-y-3">
          <p className="text-stone-400 dark:text-stone-500 text-4xl">📚</p>
          <p className="text-stone-500 dark:text-stone-400">Search for a book to get started</p>
          <p className="text-sm text-stone-400 dark:text-stone-500">
            Already have books?{" "}
            <Link href="/library" className="underline hover:text-stone-700 dark:hover:text-stone-300">
              View your library
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
