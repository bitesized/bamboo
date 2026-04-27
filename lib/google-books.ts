import type { GoogleBook } from "./types";

const BASE = "https://www.googleapis.com/books/v1";

function parseVolume(item: Record<string, unknown>): GoogleBook {
  const info = (item.volumeInfo as Record<string, unknown>) ?? {};
  const images = (info.imageLinks as Record<string, string>) ?? {};
  const cover =
    images.extraLarge ?? images.large ?? images.medium ?? images.thumbnail ?? null;

  const publishedDate = info.publishedDate as string | undefined;
  const year = publishedDate ? parseInt(publishedDate.slice(0, 4), 10) : null;

  const identifiers = (info.industryIdentifiers as { type: string; identifier: string }[]) ?? [];
  const isbn13 = identifiers.find((i) => i.type === "ISBN_13")?.identifier ?? null;
  const isbn10 = identifiers.find((i) => i.type === "ISBN_10")?.identifier ?? null;

  return {
    id: item.id as string,
    title: (info.title as string) ?? "Unknown Title",
    subtitle: (info.subtitle as string) ?? null,
    authors: (info.authors as string[]) ?? [],
    coverUrl: cover ? cover.replace("http://", "https://") : null,
    pageCount: (info.pageCount as number) ?? null,
    genres: (info.categories as string[]) ?? [],
    publishedYear: isNaN(year as number) ? null : year,
    description: (info.description as string) ?? null,
    isbn: isbn13 ?? isbn10,
    publisher: (info.publisher as string) ?? null,
    language: (info.language as string) ?? null,
  };
}

export async function searchBooks(query: string): Promise<GoogleBook[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const params = new URLSearchParams({ q: query, maxResults: "20" });
  if (key) params.set("key", key);

  const res = await fetch(`${BASE}/volumes?${params}`, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json();
  return ((data.items as Record<string, unknown>[]) ?? []).map(parseVolume);
}

export async function fetchBook(volumeId: string): Promise<GoogleBook | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const params = key ? `?key=${key}` : "";

  const res = await fetch(`${BASE}/volumes/${volumeId}${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;

  return parseVolume(await res.json());
}
