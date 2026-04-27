import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { BookWithEntry, Status } from "@/lib/types";

type DbBook = {
  id: string; title: string; subtitle: string | null; authors: string;
  coverUrl: string | null; pageCount: number | null; genres: string;
  publishedYear: number | null; description: string | null;
  isbn: string | null; publisher: string | null; language: string | null;
  entry: {
    id: string; status: string; rating: number | null; notes: string | null;
    startedAt: Date | null; finishedAt: Date | null; createdAt: Date; updatedAt: Date;
  } | null;
};

function serialize(book: DbBook): BookWithEntry {
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

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const books = await prisma.book.findMany({
    include: { entry: true },
    where: status ? { entry: { status } } : undefined,
    orderBy: { entry: { updatedAt: "desc" } },
  });
  return NextResponse.json(books.map(serialize));
}

export async function DELETE() {
  await prisma.entry.deleteMany({});
  await prisma.book.deleteMany({});
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    id, title, subtitle, authors, coverUrl, pageCount, genres,
    publishedYear, description, isbn, publisher, language,
    status, startedAt, finishedAt,
  } = body;

  const initialStatus: string = status ?? "WANT_TO_READ";
  const entryData: Record<string, unknown> = { status: initialStatus };

  if (startedAt) entryData.startedAt = new Date(startedAt);
  if (finishedAt) entryData.finishedAt = new Date(finishedAt);

  const book = await prisma.book.upsert({
    where: { id },
    create: {
      id, title, subtitle: subtitle ?? null,
      authors: JSON.stringify(authors ?? []),
      coverUrl: coverUrl ?? null, pageCount: pageCount ?? null,
      genres: JSON.stringify(genres ?? []),
      publishedYear: publishedYear ?? null, description: description ?? null,
      isbn: isbn ?? null, publisher: publisher ?? null, language: language ?? null,
      entry: { create: entryData },
    },
    update: {},
    include: { entry: true },
  });

  return NextResponse.json(serialize(book as DbBook), { status: 201 });
}
