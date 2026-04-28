# Bamboo — Design & Improvement Plan

> A focused review of the current codebase plus a roadmap for the next ~month, with longer-term direction sketched at the end.

---

## 1. Where Bamboo is today

Bamboo is a single-user Next.js 16 (App Router) book tracker backed by Prisma 7 + SQLite, gated by a single-password proxy. Google Books is the canonical metadata source; books are cached in the local DB on first add.

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
| Data model | `authors` and `genres` are JSON-encoded strings; every read site does `JSON.parse(...)`. Fine for SQLite, will become real-column work on Postgres. |
| Data model | One `Entry` per book — re-reads, DNFs, and per-session reading logs aren't representable. |
| Data model | Deleting an entry also deletes the cached `Book` (`/api/entries/[id]/route.ts:41`). This silently re-fetches from Google on next add, and an existing `.catch(() => {})` hides any failure. |
| API / validation | API routes accept whatever JSON arrives — no zod/valibot guard, no error responses for bad input. Easy to wedge into invalid state from a stale tab. |
| Auth | The HMAC cookie is a constant for the lifetime of `SESSION_SECRET`: no expiry baked in, no rotation, no per-session nonce. Logging out only clears your cookie, not anyone else's. Good enough for one user, not for multi-user. |
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
- Vercel / Postgres migration (acknowledged: not a priority right now).
- Multi-user accounts, social features, or a public deploy. Sketched in §6 only.
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
- **Error monitoring.** When you do eventually deploy, drop in Sentry or Axiom — but not yet.

---

## 6. Long-term direction (not in scope, sketched only)

These are deliberately rough — flagged so the data-model decisions made above don't paint us into a corner.

### Multi-user

- Add `User { id, email, name?, passwordHash, createdAt }`.
- Every `Entry`, `ReadingSession`, `Goal`, `Tag` gets `userId` (nullable during migration, then NOT NULL).
- Replace the password proxy with a real auth library — likely [`better-auth`](https://www.better-auth.com/) or NextAuth. Email + password, magic link optional. Sessions in DB, not just signed cookies.
- Rate-limit `/api/auth/login`.
- The proxy stays; it just checks for a real session instead of a single HMAC token.

### Public deploy

- Postgres migration: drop SQLite, switch the Prisma datasource, change `authors`/`genres` to real `String[]` columns (Postgres supports arrays natively — no more JSON parsing).
- Environment-driven config: separate `dev` / `prod` databases, prod runs on Vercel + Neon (or Supabase).
- Add `robots.txt` + meta tags. Decide whether profiles are public-by-default or private.

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

That gets you a noticeably better product in a month, without painting into corners that the multi-user / public-deploy phase would later have to repaint.
