import type { BookWithEntry, Status } from "@/lib/types";

export type DbBook = {
  id: string; title: string; subtitle: string | null; authors: string;
  coverUrl: string | null; pageCount: number | null; genres: string;
  publishedYear: number | null; description: string | null;
  isbn: string | null; publisher: string | null; language: string | null;
  entry: {
    id: string; status: string; rating: number | null; notes: string | null;
    startedAt: Date | null; finishedAt: Date | null; createdAt: Date; updatedAt: Date;
  } | null;
};

export function serialize(book: DbBook): BookWithEntry {
  return {
    ...book,
    authors: JSON.parse(book.authors),
    genres: JSON.parse(book.genres),
    entry: book.entry
      ? {
          ...book.entry,
          status: book.entry.status as Status,
          startedAt: book.entry.startedAt?.toISOString() ?? null,
          finishedAt: book.entry.finishedAt?.toISOString() ?? null,
          createdAt: book.entry.createdAt.toISOString(),
          updatedAt: book.entry.updatedAt.toISOString(),
        }
      : null,
  };
}
