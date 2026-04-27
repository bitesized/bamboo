"use client";

import { useState, useCallback, useEffect } from "react";
import type { GoogleBook, BookWithEntry, Status, AddDates } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { useDebounce } from "@/hooks/useDebounce";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [library, setLibrary] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: GoogleBook[]) => setResults(data))
      .finally(() => setSearching(false));
  }, [debouncedQuery]);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((books: BookWithEntry[]) => setLibrary(new Set(books.map((b) => b.id))));
  }, []);

  const handleAdd = useCallback(async (book: GoogleBook, status: Status, dates: AddDates) => {
    setAdding((prev) => new Set(prev).add(book.id));
    await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...book, status, ...dates }),
    });
    setLibrary((prev) => new Set(prev).add(book.id));
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(book.id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-stone-500 text-sm mt-1">Find books to add to your library</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, author, or ISBN..."
        autoFocus
        className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
      />

      {searching && <p className="text-sm text-stone-400">Searching...</p>}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onAdd={handleAdd}
              loading={adding.has(book.id)}
              inLibrary={library.has(book.id)}
            />
          ))}
        </div>
      )}

      {!searching && query && results.length === 0 && (
        <p className="text-sm text-stone-400">No results found.</p>
      )}
    </div>
  );
}
