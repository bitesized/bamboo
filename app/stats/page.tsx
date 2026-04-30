import Link from "next/link";
import prisma from "@/lib/prisma";
import Image from "next/image";
import StatsCalendar, { type CalendarBar } from "@/components/StatsCalendar";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function StatsPage() {
  const entries = await prisma.entry.findMany({ include: { book: true } });

  const read = entries.filter((e) => e.status === "READ");
  const reading = entries.filter((e) => e.status === "READING");

  if (read.length === 0 && reading.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Stats</h1>
        <p className="text-stone-400 dark:text-stone-500">Add some books to see your stats.</p>
      </div>
    );
  }

  // ── Core totals ──────────────────────────────────────────────────────────
  const totalPages = read.reduce((sum, e) => sum + (e.book.pageCount ?? 0), 0);
  const ratings = read.filter((e) => e.rating !== null).map((e) => e.rating as number);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  // ── Reading pace ─────────────────────────────────────────────────────────
  const paces: { days: number; entry: typeof read[0] }[] = [];
  for (const e of read) {
    if (e.startedAt && e.finishedAt && e.finishedAt > e.startedAt) {
      const days = (e.finishedAt.getTime() - e.startedAt.getTime()) / (1000 * 60 * 60 * 24);
      paces.push({ days, entry: e });
    }
  }
  const avgDays = paces.length
    ? Math.round(paces.reduce((a, b) => a + b.days, 0) / paces.length)
    : null;
  const fastest = paces.length ? paces.reduce((a, b) => (a.days < b.days ? a : b)) : null;
  const slowest = paces.length ? paces.reduce((a, b) => (a.days > b.days ? a : b)) : null;

  // ── Books per year ────────────────────────────────────────────────────────
  const byYear: Record<number, number> = {};
  for (const e of read) {
    if (!e.finishedAt) continue;
    const year = e.finishedAt.getFullYear();
    byYear[year] = (byYear[year] ?? 0) + 1;
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  const maxBooksInYear = Math.max(...Object.values(byYear), 1);

  // ── Books per month (current year) ───────────────────────────────────────
  const thisYear = new Date().getFullYear();
  const byMonth: number[] = Array(12).fill(0);
  for (const e of read) {
    if (!e.finishedAt) continue;
    if (e.finishedAt.getFullYear() === thisYear) {
      byMonth[e.finishedAt.getMonth()]++;
    }
  }
  const maxMonth = Math.max(...byMonth, 1);
  const hasMonthData = byMonth.some((n) => n > 0);

  // ── Rating distribution ───────────────────────────────────────────────────
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) ratingDist[r]++;
  const maxRatingCount = Math.max(...Object.values(ratingDist), 1);

  // ── Page stats ────────────────────────────────────────────────────────────
  const withPages = read.filter((e) => e.book.pageCount);
  const longest = withPages.length
    ? withPages.reduce((a, b) => ((a.book.pageCount ?? 0) > (b.book.pageCount ?? 0) ? a : b))
    : null;
  const shortest = withPages.length
    ? withPages.reduce((a, b) => ((a.book.pageCount ?? Infinity) < (b.book.pageCount ?? Infinity) ? a : b))
    : null;
  const avgPages = withPages.length
    ? Math.round(withPages.reduce((sum, e) => sum + (e.book.pageCount ?? 0), 0) / withPages.length)
    : null;

  // ── Oldest book read ──────────────────────────────────────────────────────
  const withYear = read.filter((e) => e.book.publishedYear);
  const oldest = withYear.length
    ? withYear.reduce((a, b) => ((a.book.publishedYear ?? Infinity) < (b.book.publishedYear ?? Infinity) ? a : b))
    : null;

  // ── Most-read author ──────────────────────────────────────────────────────
  const authorCount: Record<string, number> = {};
  for (const e of read) {
    for (const author of JSON.parse(e.book.authors) as string[]) {
      authorCount[author] = (authorCount[author] ?? 0) + 1;
    }
  }
  const topAuthor = Object.entries(authorCount).sort((a, b) => b[1] - a[1])[0] ?? null;

  // ── Single-day reads ──────────────────────────────────────────────────────
  const singleDayReads = read.filter((e) => {
    if (!e.startedAt || !e.finishedAt) return false;
    return e.startedAt.toDateString() === e.finishedAt.toDateString();
  }).length;

  // ── Currently reading – days in ───────────────────────────────────────────
  const readingWithDays = reading.map((e) => ({
    ...e,
    daysIn: e.startedAt
      ? Math.floor((Date.now() - e.startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  // ── Calendar bars ─────────────────────────────────────────────────────────
  const calendarBars: CalendarBar[] = entries
    .filter((e) => {
      if (e.status === "READ") return !!e.finishedAt;
      if (e.status === "READING") return !!e.startedAt;
      return false;
    })
    .map((e) => ({
      entryId: e.id,
      bookId: e.book.id,
      title: e.book.title,
      coverUrl: e.book.coverUrl,
      status: e.status as "READ" | "READING",
      startedAt: e.startedAt ? fmtLocalDate(e.startedAt) : null,
      finishedAt: e.finishedAt ? fmtLocalDate(e.finishedAt) : null,
    }));

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Stats</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Your reading history</p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Books read" value={read.length} />
        <Stat label="Pages read" value={totalPages} />
        <Stat label="Avg rating (out of 5)" value={avgRating ? avgRating.toFixed(1) : "—"} />
        <Stat label="Avg days per book" value={avgDays ?? "—"} />
        {byYear[thisYear] !== undefined && (
          <Stat label={`Read in ${thisYear}`} value={byYear[thisYear]} />
        )}
        <Stat label="On the want-to-read shelf" value={entries.filter((e) => e.status === "WANT_TO_READ").length} />
        {avgPages !== null && (
          <Stat label="Avg pages per book" value={avgPages} />
        )}
        {topAuthor && topAuthor[1] > 1 && (
          <Stat label={`Most read — ${topAuthor[0]}`} value={topAuthor[1]} />
        )}
        {singleDayReads > 0 && (
          <Stat label="Books read in a single day" value={singleDayReads} />
        )}
        {ratings.length > 0 && (
          <Stat label={`Books rated (of ${read.length})`} value={ratings.length} />
        )}
      </div>

      {/* ── Currently reading ── */}
      {readingWithDays.length > 0 && (
        <section>
          <h2 className="font-medium mb-4 text-stone-900 dark:text-stone-100">Currently Reading</h2>
          <div className="space-y-3">
            {readingWithDays.map((e) => (
              <Link
                key={e.id}
                href={`/books/${e.book.id}`}
                className="flex gap-3 items-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
              >
                <div className="w-10 h-14 bg-stone-100 dark:bg-stone-800 rounded overflow-hidden relative flex-shrink-0">
                  {e.book.coverUrl && (
                    <Image src={e.book.coverUrl} alt={e.book.title} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-stone-900 dark:text-stone-100">{e.book.title}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {(JSON.parse(e.book.authors) as string[]).join(", ")}
                  </p>
                </div>
                {e.daysIn !== null && (
                  <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">
                    {e.daysIn === 0 ? "Started today" : `${e.daysIn}d in`}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Books per year ── */}
      {years.length > 0 && (
        <section>
          <h2 className="font-medium mb-4 text-stone-900 dark:text-stone-100">Books per Year</h2>
          <div className="space-y-2">
            {years.map((year) => {
              const count = byYear[year];
              const pct = (count / maxBooksInYear) * 100;
              return (
                <div key={year} className="flex items-center gap-3">
                  <span className="text-sm text-stone-600 dark:text-stone-400 w-10">{year}</span>
                  <div className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-full h-2">
                    <div className="bg-stone-800 dark:bg-stone-300 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-stone-400 dark:text-stone-500 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Monthly breakdown (current year) ── */}
      {hasMonthData && (
        <section>
          <h2 className="font-medium mb-4 text-stone-900 dark:text-stone-100">Monthly — {thisYear}</h2>
          <div className="space-y-2">
            {byMonth.map((count, i) => {
              const pct = (count / maxMonth) * 100;
              const isPast = i <= new Date().getMonth();
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-stone-500 dark:text-stone-400 w-7">{MONTHS[i]}</span>
                  <div className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${isPast ? "bg-stone-700 dark:bg-stone-300" : "bg-stone-300 dark:bg-stone-600"}`}
                      style={{ width: count > 0 ? `${pct}%` : "0%" }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 dark:text-stone-500 w-4 text-right">{count > 0 ? count : ""}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Reading calendar ── */}
      {calendarBars.length > 0 && <StatsCalendar bars={calendarBars} />}

      {/* ── Rating distribution ── */}
      {ratings.length > 0 && (
        <section>
          <h2 className="font-medium mb-4 text-stone-900 dark:text-stone-100">Rating Distribution</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDist[star];
              const pct = (count / maxRatingCount) * 100;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-amber-400 w-16 text-sm">{"★".repeat(star)}</span>
                  <div className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-full h-2">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 dark:text-stone-500 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Highlights ── */}
      {(fastest || slowest || longest || shortest || oldest) && (
        <section>
          <h2 className="font-medium mb-4 text-stone-900 dark:text-stone-100">Highlights</h2>
          <div className="space-y-3">
            {fastest && (
              <Highlight
                label="Fastest read"
                sub={`${Math.round(fastest.days)} day${Math.round(fastest.days) !== 1 ? "s" : ""}`}
                book={fastest.entry.book}
              />
            )}
            {slowest && slowest.entry.id !== fastest?.entry.id && (
              <Highlight
                label="Slowest read"
                sub={`${Math.round(slowest.days)} days`}
                book={slowest.entry.book}
              />
            )}
            {longest && (
              <Highlight
                label="Longest book"
                sub={`${longest.book.pageCount?.toLocaleString()} pages`}
                book={longest.book}
              />
            )}
            {shortest && shortest.id !== longest?.id && (
              <Highlight
                label="Shortest book"
                sub={`${shortest.book.pageCount?.toLocaleString()} pages`}
                book={shortest.book}
              />
            )}
            {oldest && (
              <Highlight
                label="Oldest book read"
                sub={`Published ${oldest.book.publishedYear}`}
                book={oldest.book}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-4">
      <p className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{label}</p>
    </div>
  );
}

function Highlight({
  label,
  sub,
  book,
}: {
  label: string;
  sub: string;
  book: { id: string; title: string; authors: string; coverUrl: string | null };
}) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="flex gap-3 items-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
    >
      <div className="w-8 h-12 bg-stone-100 dark:bg-stone-800 rounded overflow-hidden relative flex-shrink-0">
        {book.coverUrl && (
          <Image src={book.coverUrl} alt={book.title} fill className="object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
        <p className="font-medium text-sm truncate text-stone-900 dark:text-stone-100">{book.title}</p>
        <p className="text-xs text-stone-400 dark:text-stone-500">
          {(JSON.parse(book.authors) as string[]).join(", ")}
        </p>
      </div>
      <span className="text-sm text-stone-500 dark:text-stone-400 flex-shrink-0">{sub}</span>
    </Link>
  );
}
