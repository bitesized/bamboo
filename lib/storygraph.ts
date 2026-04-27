// Utilities for parsing a StoryGraph CSV export.

export type StoryGraphStatus = "WANT_TO_READ" | "READING" | "READ";

export interface StoryGraphRow {
  title: string;
  authors: string[];
  isbn: string | null;
  status: StoryGraphStatus;
  startedAt: string | null;   // ISO date YYYY-MM-DD
  finishedAt: string | null;  // ISO date YYYY-MM-DD
  rating: number | null;
  notes: string | null;       // mapped from Review
}

function mapStatus(raw: string): StoryGraphStatus {
  if (raw === "read") return "READ";
  if (raw === "currently-reading") return "READING";
  return "WANT_TO_READ";
}

function parseDatesRead(datesRead: string): { startedAt: string | null; finishedAt: string | null } {
  const trimmed = datesRead.trim();
  if (!trimmed) return { startedAt: null, finishedAt: null };

  // Multiple reads are comma-separated; take the last one.
  const ranges = trimmed.split(", ");
  const last = ranges[ranges.length - 1].trim();

  // Format: YYYY/MM/DD-YYYY/MM/DD
  const idx = last.indexOf("-", 4); // skip past year
  if (idx === -1) return { startedAt: null, finishedAt: null };

  const startedAt = last.slice(0, idx).replace(/\//g, "-");
  const finishedAt = last.slice(idx + 1).replace(/\//g, "-");

  return { startedAt, finishedAt };
}

function parseIsbn(raw: string): string | null {
  const clean = raw.trim();
  if (clean.length === 10 || clean.length === 13) return clean;
  return null;
}

function parseRating(raw: string): number | null {
  const n = parseFloat(raw);
  if (isNaN(n) || n < 1 || n > 5) return null;
  return Math.round(n);
}

export function parseStoryGraphRow(row: Record<string, string>): StoryGraphRow | null {
  const title = row["Title"]?.trim();
  if (!title) return null;

  const authorsRaw = row["Authors"]?.trim() ?? "";
  const authors = authorsRaw
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  const status = mapStatus(row["Read Status"]?.trim() ?? "");
  const { startedAt, finishedAt } = parseDatesRead(row["Dates Read"] ?? "");

  const review = row["Review"]?.trim() ?? "";

  return {
    title,
    authors,
    isbn: parseIsbn(row["ISBN/UID"] ?? ""),
    status,
    startedAt: startedAt || null,
    finishedAt: finishedAt || null,
    rating: parseRating(row["Star Rating"] ?? ""),
    notes: review || null,
  };
}
