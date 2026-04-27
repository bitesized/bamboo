import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { searchBooks } from "@/lib/google-books";
import type { StoryGraphRow } from "@/lib/storygraph";

export type ImportBookResult =
  | { result: "imported"; title: string }
  | { result: "already_in_library"; title: string }
  | { result: "not_found"; title: string };

async function findGoogleBook(row: StoryGraphRow) {
  // Try ISBN first — most reliable.
  if (row.isbn) {
    const results = await searchBooks(`isbn:${row.isbn}`);
    if (results.length > 0) return results[0];
  }

  // Fall back to title + first author.
  const author = row.authors[0] ?? "";
  const query = `intitle:"${row.title}"${author ? ` inauthor:"${author}"` : ""}`;
  const results = await searchBooks(query);
  if (results.length > 0) return results[0];

  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse<ImportBookResult>> {
  const row: StoryGraphRow = await req.json();

  const googleBook = await findGoogleBook(row);
  if (!googleBook) {
    return NextResponse.json({ result: "not_found", title: row.title });
  }

  // Check if an entry already exists for this book.
  const existing = await prisma.entry.findUnique({ where: { bookId: googleBook.id } });
  if (existing) {
    return NextResponse.json({ result: "already_in_library", title: row.title });
  }

  // Create the book (safe: upsert with update:{} never overwrites).
  await prisma.book.upsert({
    where: { id: googleBook.id },
    create: {
      id: googleBook.id,
      title: googleBook.title,
      subtitle: googleBook.subtitle ?? null,
      authors: JSON.stringify(googleBook.authors),
      coverUrl: googleBook.coverUrl ?? null,
      pageCount: googleBook.pageCount ?? null,
      genres: JSON.stringify(googleBook.genres),
      publishedYear: googleBook.publishedYear ?? null,
      description: googleBook.description ?? null,
      isbn: googleBook.isbn ?? null,
      publisher: googleBook.publisher ?? null,
      language: googleBook.language ?? null,
    },
    update: {},
  });

  // Create the entry.
  await prisma.entry.create({
    data: {
      bookId: googleBook.id,
      status: row.status,
      rating: row.rating ?? null,
      notes: row.notes ?? null,
      startedAt: row.startedAt ? new Date(row.startedAt) : null,
      finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
    },
  });

  return NextResponse.json({ result: "imported", title: row.title }, { status: 201 });
}
