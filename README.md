# Bamboo

A personal book tracking app. Search for books via Google Books, manage reading shelves, track dates and ratings, and view reading stats. Single-user, no auth.

## Features

- **Search** — find books via Google Books API
- **Library** — shelves for Want to Read, Reading, and Read
- **Dates & ratings** — track start/finish dates and 1–5 star ratings per book
- **Stats** — books per year, monthly breakdown, rating distribution, genres, pace highlights
- **Import** — bulk import from a StoryGraph CSV export

## Stack

- Next.js 16 (App Router)
- Prisma v7 + SQLite
- Tailwind CSS
- Google Books API

## Local setup

1. **Clone and install**
   ```bash
   git clone <repo>
   cd bamboo
   npm install
   ```

2. **Environment variables** — create `.env.local`:
   ```
   GOOGLE_BOOKS_API_KEY=your_key
   DATABASE_URL=file:./prisma/dev.db
   ```

3. **Database**
   ```bash
   npx prisma migrate dev
   ```

4. **Run**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

If port 3000 is taken, pass a different one with `-p`:
```bash
npm run dev -- -p 3001
npm start -- -p 3001
```

## Importing from StoryGraph

Go to **Import** and upload a StoryGraph CSV export (`Settings → Import / Export → Export your library`). Books are matched against Google Books by ISBN first, then title + author. Any that can't be matched are listed in a post-import report.

> Intended as a one-time onboarding step — running it again after adding books manually may create duplicate shelf entries.
