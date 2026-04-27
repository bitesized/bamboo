import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { fetchBook } from "@/lib/google-books";
import type { BookWithEntry, Status } from "@/lib/types";
import BookDetail from "@/components/BookDetail";

function serializeDbBook(dbBook: {
  id: string; title: string; subtitle: string | null; authors: string;
  coverUrl: string | null; pageCount: number | null; genres: string;
  publishedYear: number | null; description: string | null;
  isbn: string | null; publisher: string | null; language: string | null;
  entry: {
    id: string; status: string; rating: number | null; notes: string | null;
    startedAt: Date | null; finishedAt: Date | null; createdAt: Date; updatedAt: Date;
  } | null;
}): BookWithEntry {
  return {
    ...dbBook,
    authors: JSON.parse(dbBook.authors),
    genres: JSON.parse(dbBook.genres),
    entry: dbBook.entry
      ? {
          ...dbBook.entry,
          status: dbBook.entry.status as Status,
          startedAt: dbBook.entry.startedAt?.toISOString() ?? null,
          finishedAt: dbBook.entry.finishedAt?.toISOString() ?? null,
          createdAt: dbBook.entry.createdAt.toISOString(),
          updatedAt: dbBook.entry.updatedAt.toISOString(),
        }
      : null,
  };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const dbBook = await prisma.book.findUnique({ where: { id }, include: { entry: true } });
  if (dbBook) return <BookDetail book={serializeDbBook(dbBook)} />;

  const googleBook = await fetchBook(id);
  if (!googleBook) notFound();

  return <BookDetail book={{ ...googleBook, entry: null }} />;
}
