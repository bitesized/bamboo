export type Status = "WANT_TO_READ" | "READING" | "READ";

export const STATUS_LABELS: Record<Status, string> = {
  WANT_TO_READ: "Want to Read",
  READING: "Reading",
  READ: "Read",
};

export interface AddDates {
  startedAt?: string;
  finishedAt?: string;
}

export interface GoogleBook {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  pageCount: number | null;
  genres: string[];
  publishedYear: number | null;
  description: string | null;
  isbn: string | null;
  publisher: string | null;
  language: string | null;
}

export interface BookWithEntry extends GoogleBook {
  entry: EntryData | null;
}

export interface EntryData {
  id: string;
  status: Status;
  rating: number | null;
  notes: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
