import Link from "next/link";
import prisma from "@/lib/prisma";
import StarRating from "@/components/StarRating";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const entries = await prisma.entry.findMany({
    include: { book: true },
    orderBy: { updatedAt: "desc" },
  });

  const read = entries.filter((e) => e.status === "READ");
  const reading = entries.filter((e) => e.status === "READING");
  const wantToRead = entries.filter((e) => e.status === "WANT_TO_READ");

  const totalPages = read.reduce((sum, e) => sum + (e.book.pageCount ?? 0), 0);
  const ratings = read.filter((e) => e.rating !== null).map((e) => e.rating as number);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const recentlyRead = read
    .filter((e) => e.finishedAt !== null)
    .sort((a, b) => b.finishedAt!.getTime() - a.finishedAt!.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-stone-500 text-sm mt-1">Your reading at a glance</p>
      </div>

      {/* ── Currently reading — top of page ── */}
      {reading.length > 0 && (
        <section>
          <h2 className="font-medium mb-3">Currently Reading</h2>
          <div className="space-y-3">
            {reading.map((e) => {
              const daysIn = e.startedAt
                ? Math.floor((Date.now() - e.startedAt.getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const pct =
                e.book.pageCount && daysIn !== null
                  ? null // no page progress without current page data
                  : null;
              return (
                <Link
                  key={e.id}
                  href={`/books/${e.book.id}`}
                  className="flex gap-4 bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300 transition-colors"
                >
                  <div className="w-14 h-20 bg-stone-100 rounded overflow-hidden relative flex-shrink-0">
                    {e.book.coverUrl && (
                      <Image src={e.book.coverUrl} alt={e.book.title} fill className="object-cover" unoptimized />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{e.book.title}</p>
                    <p className="text-sm text-stone-500 truncate">
                      {(JSON.parse(e.book.authors) as string[]).join(", ")}
                    </p>
                    {e.book.pageCount && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        {e.book.pageCount.toLocaleString()} pages
                      </p>
                    )}
                    {daysIn !== null && (
                      <p className="text-xs text-stone-400 mt-1">
                        {daysIn === 0 ? "Started today" : `${daysIn} day${daysIn !== 1 ? "s" : ""} in`}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Read", value: read.length },
          { label: "Reading", value: reading.length },
          { label: "Want to Read", value: wantToRead.length },
          { label: "Pages Read", value: totalPages.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-stone-200 rounded-lg p-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {avgRating !== null && (
        <div className="bg-white border border-stone-200 rounded-lg p-4 flex items-center gap-3">
          <StarRating value={Math.round(avgRating)} readonly />
          <span className="text-sm text-stone-600">
            {avgRating.toFixed(1)} average rating across {ratings.length} rated book
            {ratings.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Recently read ── */}
      {recentlyRead.length > 0 && (
        <section>
          <h2 className="font-medium mb-3">Recently Read</h2>
          <div className="space-y-3">
            {recentlyRead.map((e) => (
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
                  <p className="text-xs text-stone-500 truncate">
                    {(JSON.parse(e.book.authors) as string[]).join(", ")}
                  </p>
                  {e.finishedAt && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      Finished{" "}
                      {e.finishedAt.toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                {e.rating && <StarRating value={e.rating} readonly />}
              </Link>
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No books yet.</p>
          <Link href="/search" className="text-sm text-stone-600 underline mt-2 inline-block">
            Search for your first book
          </Link>
        </div>
      )}
    </div>
  );
}
