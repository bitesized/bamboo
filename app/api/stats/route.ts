import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const entries = await prisma.entry.findMany({
    include: { book: true },
  });

  const read = entries.filter((e) => e.status === "READ");
  const reading = entries.filter((e) => e.status === "READING");
  const wantToRead = entries.filter((e) => e.status === "WANT_TO_READ");

  const totalPages = read.reduce((sum, e) => sum + (e.book.pageCount ?? 0), 0);

  const ratings = read.filter((e) => e.rating !== null).map((e) => e.rating as number);
  const avgRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;

  const byYear: Record<number, number> = {};
  for (const e of read) {
    if (e.finishedAt) {
      const year = e.finishedAt.getFullYear();
      byYear[year] = (byYear[year] ?? 0) + 1;
    }
  }

  const genreCount: Record<string, number> = {};
  for (const e of read) {
    const genres: string[] = JSON.parse(e.book.genres);
    for (const g of genres) {
      genreCount[g] = (genreCount[g] ?? 0) + 1;
    }
  }

  const readingPaces: number[] = [];
  for (const e of read) {
    if (e.startedAt && e.finishedAt) {
      const days =
        (e.finishedAt.getTime() - e.startedAt.getTime()) / (1000 * 60 * 60 * 24);
      readingPaces.push(days);
    }
  }
  const avgDaysPerBook = readingPaces.length
    ? readingPaces.reduce((a, b) => a + b, 0) / readingPaces.length
    : null;

  return NextResponse.json({
    totalRead: read.length,
    totalReading: reading.length,
    totalWantToRead: wantToRead.length,
    totalPages,
    avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    byYear,
    genreCount,
    avgDaysPerBook: avgDaysPerBook ? Math.round(avgDaysPerBook) : null,
  });
}
