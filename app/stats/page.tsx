import Link from "next/link";
import prisma from "@/lib/prisma";
import StarRating from "@/components/StarRating";
import Image from "next/image";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function StatsPage() {
  const entries = await prisma.entry.findMany({ include: { book: true } });

  const read = entries.filter((e) => e.status === "READ");
  const reading = entries.filter((e) => e.status === "READING");

  if (read.length === 0 && reading.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="text-stone-400">Add some books to see your stats.</p>
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

  // ── Genres ───────────────────────────────────────────────────────────────
  const genreCount: Record<string, number> = {};
  for (const e of read) {
    for (const g of JSON.parse(e.book.genres) as string[]) {
      genreCount[g] = (genreCount[g] ?? 0) + 1;
    }
  }
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // ── Rating distribution ───────────────────────────────────────────────────
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) ratingDist[r]++;
  const maxRatingCount = Math.max(...Object.values(ratingDist), 1);

  // ── Longest / shortest ────────────────────────────────────────────────────
  const withPages = read.filter((e) => e.book.pageCount);
  const longest = withPages.length
    ? withPages.reduce((a, b) => ((a.book.pageCount ?? 0) > (b.book.pageCount ?? 0) ? a : b))
    : null;

  // ── Currently reading – days in ───────────────────────────────────────────
  const readingWithDays = reading.map((e) => ({
    ...e,
    daysIn: e.startedAt
      ? Math.floor((Date.now() - e.startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="text-stone-500 text-sm mt-1">Your reading history</p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Books Read" value={read.length} />
        <Stat label="Pages Read" value={totalPages.toLocaleString()} />
        <Stat label="Avg Rating" value={avgRating ? `${avgRating.toFixed(1)} / 5` : "—"} />
        <Stat label="Avg Days / Book" value={avgDays ?? "—"} />
        {byYear[thisYear] !== undefined && (
          <Stat label={`Read in ${thisYear}`} value={byYear[thisYear]} />
        )}
        <Stat label="Want to Read" value={entries.filter((e) => e.status === "WANT_TO_READ").length} />
        {paces.length > 0 && fastest && (
          <Stat label="Fastest Read" value={`${Math.round(fastest.days)}d`} />
        )}
        {ratings.length > 0 && (
          <Stat label="Rated" value={`${ratings.length} / ${read.length}`} />
        )}
      </div>

      {/* ── Currently reading ── */}
      {readingWithDays.length > 0 && (
        <section>
          <h2 className="font-medium mb-4">Currently Reading</h2>
          <div className="space-y-3">
            {readingWithDays.map((e) => (
              <Link
                key={e.id}
                href={`/books/${e.book.id}`}
                className="flex gap-3 items-center bg-white border border-stone-200 rounded-lg p-3 hover:border-stone-300 transition-colors"
              >
                <div className="w-10 h-14 bg-stone-100 rounded overflow-hidden relative flex-shrink-0">
                  {e.book.coverUrl && (
                    <Image src={e.book.coverUrl} alt={e.book.title} fill className="object-cover" unoptimized />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.book.title}</p>
                  <p className="text-xs text-stone-500">
                    {(JSON.parse(e.book.authors) as string[]).join(", ")}
                  </p>
                </div>
                {e.daysIn !== null && (
                  <span className="text-xs text-stone-400 flex-shrink-0">
                    {e.daysIn === 0 ? "Started today" : `${e.daysIn}d in`}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Books per year chart ── */}
      {years.length > 0 && (
        <section>
          <h2 className="font-medium mb-4">Books per Year</h2>
          <div className="flex items-end gap-3 h-32">
            {years.map((year) => {
              const count = byYear[year];
              const heightPct = (count / maxBooksInYear) * 100;
              return (
                <div key={year} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <span className="text-xs text-stone-500">{count}</span>
                  <div
                    className="w-full bg-stone-800 rounded-t"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-xs text-stone-400">{year}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Monthly breakdown (current year) ── */}
      {hasMonthData && (
        <section>
          <h2 className="font-medium mb-4">Monthly — {thisYear}</h2>
          <div className="flex items-end gap-1.5 h-24">
            {byMonth.map((count, i) => {
              const heightPct = (count / maxMonth) * 100;
              const isPast = i <= new Date().getMonth();
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  {count > 0 && <span className="text-xs text-stone-500">{count}</span>}
                  <div
                    className={`w-full rounded-t ${isPast ? "bg-stone-700" : "bg-stone-200"}`}
                    style={{ height: count > 0 ? `${heightPct}%` : "2px" }}
                  />
                  <span className="text-xs text-stone-400 hidden sm:block">{MONTHS[i]}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Rating distribution ── */}
      {ratings.length > 0 && (
        <section>
          <h2 className="font-medium mb-4">Rating Distribution</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDist[star];
              const pct = (count / maxRatingCount) * 100;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-amber-400 w-16 text-sm">{"★".repeat(star)}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-2">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Top genres ── */}
      {topGenres.length > 0 && (
        <section>
          <h2 className="font-medium mb-4">Top Genres</h2>
          <div className="space-y-2">
            {topGenres.map(([genre, count]) => {
              const pct = (count / topGenres[0][1]) * 100;
              return (
                <div key={genre} className="flex items-center gap-3">
                  <span className="text-sm text-stone-600 w-40 truncate">{genre}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-2">
                    <div className="bg-stone-700 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-stone-400 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Pace highlights ── */}
      {(fastest || slowest || longest) && (
        <section>
          <h2 className="font-medium mb-4">Highlights</h2>
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
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5">{label}</p>
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
      className="flex gap-3 items-center bg-white border border-stone-200 rounded-lg p-3 hover:border-stone-300 transition-colors"
    >
      <div className="w-8 h-12 bg-stone-100 rounded overflow-hidden relative flex-shrink-0">
        {book.coverUrl && (
          <Image src={book.coverUrl} alt={book.title} fill className="object-cover" unoptimized />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-500">{label}</p>
        <p className="font-medium text-sm truncate">{book.title}</p>
        <p className="text-xs text-stone-400">
          {(JSON.parse(book.authors) as string[]).join(", ")}
        </p>
      </div>
      <span className="text-sm text-stone-500 flex-shrink-0">{sub}</span>
    </Link>
  );
}
