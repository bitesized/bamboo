# Bamboo — Design & Improvement Plan

> A focused review of the current codebase plus a roadmap for the next ~month, with longer-term direction sketched at the end.

---

## 1. Where Bamboo is today

Bamboo is a single-user Next.js 16 (App Router) book tracker backed by Prisma 7 + SQLite, running locally with no auth. Google Books is the canonical metadata source; books are cached in the local DB on first add.

### What's working well

- **Tight scope.** No social features, no auth accounts, no recommendation engine — the app does one thing (track personal reading) and stays out of the way.
- **Server-rendered dashboards.** `/` and `/stats` render on the server with `force-dynamic`, so reads are always fresh and there's no client/server data-shape duplication for those pages.
- **Snappy search.** Debounced query + `AbortController` on `/search` gives a clean type-ahead feel.
- **Optimistic mutations.** `/library` and `BookDetail` patch entries optimistically — the UI never sits waiting on the network for a status/rating/date change.
- **Good shelf-picker affordance.** Adding a book lets you skip directly to a status; `autoShowDates` then surfaces the date inputs without a click.
- **Honest import flow.** The StoryGraph importer reports imported / already-in-library / not-found counts and is upfront about being a one-time onboarding step.

### Friction points & risks

| Area | Issue |
|---|---|
| Data model | `authors` and `genres` are JSON-encoded strings; every read site does `JSON.parse(...)`. Works, but every consumer has to remember to parse. |
| Data model | One `Entry` per book — re-reads, DNFs, and per-session reading logs aren't representable. |
| Data model | Deleting an entry also deletes the cached `Book` (`/api/entries/[id]/route.ts:41`). This silently re-fetches from Google on next add, and an existing `.catch(() => {})` hides any failure. |
| API / validation | API routes accept whatever JSON arrives — no zod/valibot guard, no error responses for bad input. Easy to wedge into invalid state from a stale tab. |
| Stats | `app/api/stats/route.ts` exists but nothing calls it. Either wire it up or delete it. |
| Dates | `new Date("YYYY-MM-DD").toISOString()` shifts to UTC and can read back as the previous day depending on locale — already a latent bug in `BookDetail.tsx`. |
| Images | `<Image unoptimized />` everywhere bypasses Next's image pipeline. Configure `remotePatterns` for `books.google.com` and drop the flag. |
| Code dup | The DB-row → `BookWithEntry` `serialize` function is duplicated in `app/api/books/route.ts` and `app/books/[id]/page.tsx`. |
| Sanitizer | Hand-rolled HTML sanitizer in `lib/sanitize.ts` — fine for trusted Google Books content, but a real lib (`sanitize-html`, `DOMPurify`) is one less footgun. |
| Tests | None. The data layer + parsers (`storygraph.ts`, `google-books.ts`) are pure functions and easy wins. |

---

## 2. Goals & non-goals

### Goals (next ~month)
- Ship features that make the app **stickier** for daily use: re-reads, DNF, custom shelves/tags, library search & sort, reading goals, CSV export.
- Polish the UX into something that feels finished: dark mode, mobile pass, keyboard shortcuts, loading skeletons, toasts for confirms/undos.
- Pay down the highest-leverage tech debt that blocks the above (data model for re-reads, input validation, image pipeline).

### Non-goals (this cycle)
- Multi-user accounts or social features. Sketched in §6 only.
- Mobile app or native wrappers.
- Recommendation engine / ML.

---

## 3. Roadmap

Three phases, sequenced by leverage. Each item lists the **shape of the change** and the files most likely to move.

### Phase 1 — "make it feel finished" (week 1)

Quick UX wins and small features that compound.

1. **Library search + sort**
   - Add a search input over `books[].title|authors` (client-side filter is fine at expected library sizes).
   - Sort dropdown: Recently updated · Title · Author · Date finished · Rating · Page count.
   - Touches: `app/library/page.tsx`.

2. **Dark mode**
   - Tailwind v4 — add a `dark:` palette pass.
   - Theme toggle in `Nav`, persisted in `localStorage`, default to `prefers-color-scheme`.
   - Touches: `components/Nav.tsx`, every component (mostly mechanical).

3. **Toasts + undo for destructive actions**
   - Lightweight toast (no lib needed; ~30 lines) that surfaces "Removed *Title*" with an Undo for ~5s.
   - Hook into `handleRemove` in `LibraryPage` and `BookDetail`. Optimistic remove, restore on undo.
   - Touches: new `components/Toast.tsx` + a small `useToast` hook, callers in `LibraryPage`, `BookDetail`.

4. **Keyboard shortcuts**
   - `/` focus search anywhere
   - `g s` / `g l` / `g h` / `g t` to navigate to Search / Library / Home / Stats
   - `Esc` close modals
   - Touches: new `hooks/useShortcuts.ts`, mount in root layout.

5. **Loading skeletons + empty-state polish**
   - Replace text "Loading…" with cover-shaped skeletons in `LibraryPage` and `SearchPage`.
   - Friendlier empty states with a one-line nudge + a CTA button.

6. **Half-star ratings + clear**
   - Allow `0.5` increments (hover over left/right half of each star) and a "clear rating" affordance.
   - Touches: `components/StarRating.tsx`, schema field stays `Int` but stored as `rating * 2` (range 1–10), or change to `Float`. Lean toward `Float` to keep code obvious.

### Phase 2 — "more reading-tracker fluency" (weeks 2–3)

Features that change what the app can represent.

7. **Re-reads (Reading Sessions)**
   - New model: `ReadingSession { id, entryId, startedAt, finishedAt, notes? }`.
   - `Entry.startedAt` / `finishedAt` become a denormalized convenience (= latest session) or are removed entirely in favour of computing from sessions.
   - Stats per year recompute from sessions, so re-reads of the same book in different years count correctly.
   - UI: `BookDetail` shows a list of sessions with add/edit/delete; "Start re-read" button when status is `READ`.
   - Migration: backfill one session per existing entry that has dates.

8. **DNF status + "Did not finish" stats**
   - Add `DNF` to the status enum (literal string, schema stays `String`).
   - Stats: count, % of started books abandoned, average pages-in before DNF (if `pageCount` known + a new optional `dnfAtPage`).
   - UI: show DNF as a quiet 4th filter chip in `LibraryPage`.

9. **Custom shelves / tags**
   - New models: `Tag { id, name, color? }`, `EntryTag { entryId, tagId }` (many-to-many).
   - Filter library by tag; show tag chips on `BookCard`; manage tags in a small `/settings/tags` page.
   - Tag autocomplete on `BookDetail`.

10. **Reading goals**
    - New model: `Goal { id, year, target }` — one row per year.
    - Dashboard widget: progress bar with "X of Y books read · on track / N ahead / N behind", computed off pace through the year.
    - Settings page (or inline on Dashboard) to edit the current year's target.

11. **CSV export**
    - `/settings/export` (or a button in `/import`) → downloads a Bamboo-format CSV of all entries (book metadata + status + dates + rating + notes + tags).
    - Round-trip importable (Phase 2.5 — make `/api/import/book` accept Bamboo CSV in addition to StoryGraph).

12. **Manual book editing**
    - Edit-in-place on `BookDetail` for: cover URL, title, page count, published year, genres.
    - Useful when Google Books has the wrong edition (very common) or no cover.

### Phase 3 — "polish, performance, foundations" (week 4)

13. **Stats page redesign**
    - Current page is a dense scroll. Reorganize into tabs or accordions: **Overview · This Year · All Time · By Genre · By Author**.
    - Add a true chart (sparkline of books-per-week over last 52 weeks). One small SVG component, no chart lib needed.
    - Add: language breakdown, publication-decade breakdown, longest streak (consecutive days reading), top genres bar chart.

14. **Mobile pass**
    - Audit every page at 375px. Likely fixes: nav becomes a hamburger or bottom-tab bar, `BookCard` reflows below 480px, stats grid collapses to single column.
    - Add `viewport` meta if missing.

15. **PWA basics**
    - Manifest + service worker for "Add to Home Screen". Offline-read of cached library is a stretch goal; for a first pass, just installability.

16. **Tech-debt sweep**
    - Move `serialize()` into `lib/serialize.ts` (one source of truth).
    - Add `zod` schemas for every API route body and parse with `safeParse`. Return 400 on bad input.
    - Replace `lib/sanitize.ts` with `sanitize-html`.
    - Configure `next.config.ts` `images.remotePatterns` for `books.google.com` + `books.googleusercontent.com`; drop `unoptimized`.
    - Stop deleting the `Book` row when an `Entry` is deleted — keep the cached metadata so re-adds are instant.
    - Delete the unused `/api/stats` route or make `/stats` page consume it.
    - Add `vitest` + a handful of tests for `parseStoryGraphRow`, `parseVolume`, and the date-input timezone helper.

---

## 4. Detailed designs for the priority features

### 4.1 Re-reads (the only model change worth thinking about up front)

**Schema delta:**

```prisma
model Entry {
  id        String   @id @default(cuid())
  bookId    String   @unique
  book      Book     @relation(fields: [bookId], references: [id])
  status    String   @default("WANT_TO_READ") // + "DNF"
  rating    Float?                              // was Int
  notes     String?
  // startedAt / finishedAt removed (computed from latest session)
  sessions  ReadingSession[]
  tags      EntryTag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ReadingSession {
  id          String   @id @default(cuid())
  entryId     String
  entry       Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
  startedAt   DateTime?
  finishedAt  DateTime?
  dnfAtPage   Int?
  notes       String?
  createdAt   DateTime @default(now())
}
```

**Migration plan:**
1. Add `ReadingSession`, keep `Entry.startedAt`/`finishedAt` for one release.
2. On boot (or via a one-shot script), copy each `Entry`'s dates into a single `ReadingSession`.
3. Switch all reads (stats, dashboard, library) to compute from sessions.
4. Drop the legacy columns.

**Stats implications:** "Books read in 2024" becomes "sessions finished in 2024 where the entry status is `READ`." A book read twice in the same year counts twice. This matches user intent for re-reads.

### 4.2 Tags (schema + UI)

```prisma
model Tag {
  id      String     @id @default(cuid())
  name    String     @unique
  color   String?
  entries EntryTag[]
}

model EntryTag {
  entryId String
  tagId   String
  entry   Entry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  tag     Tag   @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([entryId, tagId])
}
```

UI: small chip row on `BookDetail` with a "+ Tag" combobox (autocompletes existing tags, creates new on Enter). On `LibraryPage`, tags appear as a row of filter chips below the status chips; multi-select narrows results.

### 4.3 Reading goals

```prisma
model Goal {
  year   Int @id     // simplest possible — one goal per year
  target Int
}
```

Dashboard widget computes:
- `done` = entries with `status = READ` and `finishedAt` in the current year (post re-reads: sessions finished in current year).
- `expected` = `target * (dayOfYear / daysInYear)`.
- Display: progress bar with `done / target`, plus "N ahead" / "N behind" / "on track".

### 4.4 Toasts + undo

A single context provider in the root layout with a `useToast()` hook:

```ts
toast({
  message: "Removed The Bee Sting",
  action: { label: "Undo", onClick: () => restoreEntry(snapshot) },
  durationMs: 5000,
});
```

For undo to actually work, mutations need to be reversible: keep a snapshot of the entry before deleting, recreate it on undo. The DELETE handler needs to stop cascading the `Book` removal (Phase 3 item 16) so that recreating an entry doesn't require re-fetching from Google.

### 4.5 Library search & sort

Pure client-side over the existing `books` array — sorting/filtering an array of a few thousand objects is fine. No API changes.

```tsx
const sorted = useMemo(() =>
  [...books]
    .filter(b => matchesSearch(b, query))
    .sort(comparators[sortKey]),
  [books, query, sortKey],
);
```

### 4.6 Dark mode

Tailwind v4 `dark:` variant. Strategy: `class`-based (`html.dark`) so we can opt out of system pref. Toggle component in `Nav`:

```tsx
const [theme, setTheme] = useState<"light" | "dark" | "system">(...);
useEffect(() => { document.documentElement.classList.toggle("dark", isDark); }, [isDark]);
```

Bulk pass over components: `bg-white` → `bg-white dark:bg-stone-900`, `text-stone-900` → `text-stone-900 dark:text-stone-100`, etc. Tedious but mechanical — maybe an hour.

---

## 5. Cross-cutting tech debt to clear alongside

These don't deserve their own phase but should be done opportunistically as features touch the relevant files:

- **Validation.** Add `zod` schemas in `lib/schemas.ts`. Every API route starts with `const body = Schema.parse(await req.json());`.
- **Centralized serialization.** Move the duplicated `serialize` to `lib/serialize.ts`.
- **Date handling.** Add `lib/dates.ts` with `toDateInput(date)` / `fromDateInput(str)` helpers that respect the user's local timezone (don't go through `toISOString()` for date-only fields).
- **Image pipeline.** Configure `next.config.ts`:
  ```ts
  images: { remotePatterns: [{ protocol: "https", hostname: "books.google.com" }, { protocol: "https", hostname: "books.googleusercontent.com" }] }
  ```
  Then drop every `unoptimized` prop.

---

## 6. Long-term direction (not in scope, sketched only)

These are deliberately rough — flagged so the data-model decisions made above don't paint us into a corner.

### Multi-user

- Add `User { id, email, name?, passwordHash, createdAt }`.
- Every `Entry`, `ReadingSession`, `Goal`, `Tag` gets `userId` (nullable during migration, then NOT NULL).
- Add a real auth library — likely [`better-auth`](https://www.better-auth.com/) or NextAuth. Email + password, magic link optional. Sessions in DB, not just signed cookies.
- Rate-limit the login endpoint.

### Social / discovery (only if there's appetite)

- Public profile pages (`/u/[username]`) showing read shelf + stats.
- Follow / friends / activity feed.
- Book pages aggregating ratings + notes across users.

These imply an entirely different product surface; treat them as a separate v2 effort, not a continuation of this roadmap.

---

## 7. Open questions (worth deciding before Phase 2 starts)

1. **Re-reads model:** keep the denormalized `startedAt`/`finishedAt` on `Entry` as a "latest session" cache, or compute everywhere? (Recommendation: compute everywhere; it's simpler and the data is small.)
2. **DNF in stats:** does a DNF book count toward "Books read this year"? (Recommendation: no — DNF is its own bucket, not under "Read".)
3. **Half-star ratings:** are existing 1–5 integer ratings preserved as `1.0`–`5.0`, or do we want a one-time "rate things you previously rated" flow? (Recommendation: just promote integers to floats; don't bother the user.)
4. **Tags vs. shelves naming:** the current model has fixed shelves (Want / Reading / Read). Are tags additional, or do we let users define custom shelves and drop the fixed three? (Recommendation: keep the three statuses fixed — they're a state machine, not a label — and add tags as a separate orthogonal axis.)
5. **CSV export format:** match StoryGraph's columns for round-trip compatibility, or design our own richer format? (Recommendation: ship a Bamboo-native format, with a separate "StoryGraph-compatible" export later if needed.)

---

## 8. Suggested execution order

If picking off the list one-at-a-time, this order minimizes rework:

1. Tech-debt sweep items that unblock features (centralize `serialize`, add `zod`, fix image pipeline, stop cascading book delete) — half a day.
2. Library search + sort, toasts + undo, keyboard shortcuts, dark mode, half-star ratings, loading skeletons — Phase 1 in roughly a week of evenings.
3. Re-reads model migration (the only change that touches the schema in a load-bearing way) — do this *before* tags / DNF / goals so they all sit on the new model.
4. DNF, tags, goals, CSV export, manual book editing — Phase 2.
5. Stats redesign, mobile pass, PWA, tests — Phase 3.

That gets you a noticeably better product in a month, without painting into corners that a multi-user phase would later have to repaint.

---

## 9. Mid-cycle additions

Three follow-up changes scoped on top of the roadmap above. (1) and (3) are stats-page refinements; (2) is a small subtraction.

### 9.1 Calendar view in stats

A second visualisation alongside the existing "Books per Year" / "Monthly — {year}" sections that lays reading periods out as horizontal bars on a browsable month-by-month calendar grid.

**Goals**

- See *what* was being read on any given day, not just *how many* books finished in a month.
- Make currently-reading visible on the calendar (open-ended, distinct visual treatment).
- Browsable: ◀ / ▶ to step months, "Today" button to jump back, default month is the current one.
- Live-updating with respect to reading-date changes — i.e. when the user adds/removes/edits dates elsewhere in the app and lands back on `/stats`, the calendar reflects the new state.

**Data model — what counts as a "bar"**

Given the current schema (`Entry.startedAt` / `finishedAt` only — one period per book), a bar is derived per entry as follows:

| Status | `startedAt` | `finishedAt` | Bar |
|---|---|---|---|
| `READ` | set | set | Solid bar from `startedAt` → `finishedAt` (the canonical case) |
| `READ` | unset | set | Single-day marker on `finishedAt` (book was logged without a start date) |
| `READ` | set | unset | Skipped — finished but no end date is contradictory; surface as a data-quality warning rather than a bar |
| `READING` | set | — | Open-ended bar from `startedAt` → `min(today, monthEnd)` with a "currently reading" visual: striped/dashed fill, no end-cap, optional ▶ indicator on the trailing edge |
| `READING` | unset | — | Excluded — no anchor point to draw |
| `WANT_TO_READ` / no dates | — | — | Excluded |

The READ vs READING split is the only meaningful one: solid filled bars for finished reads, dashed/open-ended bars for in-progress. Hover/tap a bar to see the title + author + date range; click to navigate to `/books/[id]`.

**Layout**

- Use a CSS-grid month view: 7 columns × 5–6 rows (weeks), Mon-start (consistent with the rest of the UI — confirm no Sun-start convention is in play before locking this in).
- Each week-row contains a stack of "lanes" for bars that overlap that week. A book that spans multiple weeks renders as one bar segment per week (the simplest correct layout — no fancy continuation lines needed for v1, but add a left/right tick on bar ends that don't actually start/end in the visible week so it's obvious the bar continues).
- Books that span beyond the visible month clip at the month boundary with the same continuation tick.
- Bar color: stone-700 (dark mode: stone-300) for READ; striped/dashed amber-or-stone for READING so it stands out.
- Today-cell highlighted with a subtle ring.
- Empty months: render the grid anyway with a one-line "Nothing read in {Month YYYY}." underneath.

**Component shape**

- `app/stats/page.tsx` (server component) fetches every entry that could possibly contribute to the calendar — i.e. all entries with `startedAt` or `finishedAt` set. Passes a serialised, minimal shape to a new client component:
  ```ts
  type CalendarEntry = {
    entryId: string;
    bookId: string;
    title: string;
    coverUrl: string | null;
    status: "READ" | "READING";
    startedAt: string | null;  // ISO date-only
    finishedAt: string | null;
  };
  ```
- New `components/StatsCalendar.tsx` (client) holds the visible-month state, handles ◀ / ▶ / "Today", and computes the per-week lane assignments with a small interval-graph greedy packer. Pure-client filtering — no extra API surface needed.
- Live-update story: the calendar is a child of a server-rendered `force-dynamic` page, so a navigation back to `/stats` always re-runs the query and re-passes fresh props. For changes made *while* the user is on `/stats` (in another tab, or after we wire up `router.refresh()` in `BookDetail` mutations — which we should do anyway), the same flow applies. **No polling, no websockets** — that's overkill for a single-user local app.

**Edge cases & gotchas**

- **Date timezone**: `startedAt` / `finishedAt` are `DateTime` columns but represent date-only intent. The existing latent `toISOString()` bug noted in §1 means a date entered as `2026-04-30` may serialise as `2026-04-29T23:00:00Z` for some locales. Fix `lib/dates.ts` (already on the list at §5) *before* shipping the calendar, otherwise bars will land on the wrong day for ~50% of users at month boundaries.
- **Re-reads (Phase 2 §7)**: when `ReadingSession` lands, the calendar source becomes "all sessions with at least one date" rather than "all entries with at least one date". The component contract above (`CalendarEntry`) cleanly extends to one entry per session; nothing client-side needs to change beyond the server-side query. Worth keeping the type name generic (`CalendarBar` rather than `CalendarEntry`) to avoid renaming later.
- **Data-quality bars**: entries with `finishedAt < startedAt` or status mismatches are skipped silently in the v1 — log a `console.warn` so they're noticeable in dev.
- **Performance**: at any plausible library size (low thousands of entries) the per-month filtering is trivial; no virtualisation needed.

**Where it lives on the page**

Insert as a new section between "Monthly — {year}" and "Rating Distribution". Heading: **"Reading calendar"** with the month label and ◀ / ▶ controls in the header row.

---

### 9.2 Remove the Fiction vs Non-Fiction split (for now)

The current implementation in `app/stats/page.tsx:67-74` infers fiction by checking whether any genre string contains `"fiction"`, and treats the absence of that substring as non-fiction. This is wrong in both directions:

- Books with no `genres` data are skipped entirely — Google Books returns empty categories more often than not, so the sample is silently small and biased.
- Books whose genres include "Literary Fiction" or "Science Fiction" hit the filter, but anything tagged only as "Mystery", "Romance", "Thriller", etc. is misclassified as non-fiction.
- Conversely, "Non-fiction" → contains "fiction" → counted as fiction.

**Plan**

1. **Drop the section.** Remove the `fictionCount` / `nonFictionCount` block in `app/stats/page.tsx` and the corresponding `<section>`. Also remove `genreCount` from `app/api/stats/route.ts` if it's similarly unused (or just delete that whole route per §3 item 16).
2. **Document the gap.** Add a one-line note in this design doc (below) so it doesn't quietly disappear and resurface as a "missing feature" later.
3. **Future re-implementation, when the data exists.** Options, ranked by feasibility:
   - **Manual override on the book record** — add an optional `Book.kind: "FICTION" | "NONFICTION" | null` column, edited inline on `/books/[id]` (slots into the Phase 2 §12 manual-edit feature). User-curated, slow to populate but always correct.
   - **Open Library subjects API** — richer subject taxonomy than Google Books, but still ambiguous and would need its own mapping layer. Worth a spike before committing.
   - **Hardcover.app** — has explicit fiction/non-fiction flags but requires a different metadata pipeline; not justified for one stat alone.

The recommended path is the manual override (option 1) bundled with §12, not a separate effort. Until then: no fiction/non-fiction stat appears on the page.

---

### 9.3 Standardise the "at a glance" summary cards

Today the summary grid (`app/stats/page.tsx:130-151`) mixes three formats:

| Card | Value rendered | Where the unit lives |
|---|---|---|
| Books Read | `17` | (none — implicit) |
| Pages Read | `4,523` | (none — implicit) |
| Avg Rating | `4.2 / 5` | **in the value** |
| Avg Days / Book | `4` | in the label |
| Read in {year} | `3` | in the label |
| Want to Read | `8` | in the label |
| Avg Length | `287 pp` | **in the value** |
| Most Read · {Author} | `4 books` | **in the value** |
| 1-Day Reads | `2` | in the label |
| Rated | `12 / 17` | **in the value (as a ratio)** |

**Rule**

> The `value` slot is a number (or `—`). Anything qualifying that number — units, scale, comparator, denominator — lives in the `label`.

**Standardised mapping**

| Card | New value | New label |
|---|---|---|
| Books Read | `17` | `Books read` |
| Pages Read | `4,523` | `Pages read` |
| Avg Rating | `4.2` | `Avg rating (out of 5)` |
| Avg Days / Book | `4` | `Avg days per book` |
| Read in {year} | `3` | `Read in {year}` |
| Want to Read | `8` | `On the want-to-read shelf` |
| Avg Length | `287` | `Avg pages per book` |
| Most Read · {Author} | `4` | `Books by {Author} (most read)` |
| 1-Day Reads | `2` | `Books read in a single day` |
| Rated | `12` | `Books rated (of {read.length})` |

Notes on the trickier ones:

- **Avg Rating "out of 5"**: belongs in the label, not the value. The value `4.2` is a number; the `/ 5` was acting as both a unit and a scale-anchor and reads as if it's a fraction.
- **Rated `12 / 17`**: the cleanest fix is "Rated 12, of 17 read" → value `12`, label `Books rated (of 17)`. Alternative: drop the card entirely and surface ratings coverage in the Rating Distribution section instead. **Lean toward keeping it** — it's the only place coverage is visible at a glance.
- **Most Read · {Author}**: the author belongs in the label so it can wrap onto two lines if needed; the value is the count of books by that author. Keeps card height consistent.
- **Numeric values get `toLocaleString()`** uniformly so `4523` always renders as `4,523`.

**Component change**

The `Stat` helper at `app/stats/page.tsx:330-337` already renders value + label in that order. The change is data-only — update the call sites and pass numbers (not pre-formatted strings) where possible. Optionally tighten the prop type to `value: number | "—"` to enforce the rule at the type level; pre-format with `toLocaleString()` inside `Stat` so the rule can't drift.

```tsx
function Stat({ label, value }: { label: string; value: number | "—" }) {
  return (
    <div className="...">
      <p className="text-2xl font-semibold ...">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs ... mt-0.5">{label}</p>
    </div>
  );
}
```

**Out of scope here**: redesigning what cards appear or in what order — that's the §3 Phase 3 item 13 stats redesign. This pass is purely a presentation-consistency cleanup.

---

### Sequencing within this batch

1. **9.2 Remove fiction/non-fiction** — five-minute deletion, do first so neither of the next two has to reason about the section.
2. **9.3 Standardise summary cards** — small, mechanical, no schema or data fetching changes.
3. **9.1 Calendar view** — the only one that's a real implementation task. Do *after* fixing the date-input timezone helper (§5), otherwise bars will land on the wrong day at month boundaries.
