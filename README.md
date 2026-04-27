# Bamboo

A personal book tracking app. Search for books via Google Books, manage reading shelves, track dates and ratings, and view reading stats. Single-user, password-protected.

## Features

- **Search** — find books via Google Books API
- **Library** — shelves for Want to Read, Reading, and Read
- **Dates & ratings** — track start/finish dates and 1–5 star ratings per book
- **Stats** — books per year, monthly breakdown, rating distribution, genres, pace highlights
- **Import** — bulk import from a StoryGraph CSV export
- **Auth** — simple password gate, no accounts

## Stack

- Next.js 16 (App Router)
- Prisma v7 + SQLite (local) / Postgres (production)
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
   APP_PASSWORD=your_password
   SESSION_SECRET=your_random_secret   # openssl rand -base64 32
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

Open [http://localhost:3000](http://localhost:3000) and sign in with your password.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add environment variables in **Settings → Environment Variables**:
   - `GOOGLE_BOOKS_API_KEY`
   - `APP_PASSWORD`
   - `SESSION_SECRET`
   - `DATABASE_URL` (point to a hosted Postgres instance, e.g. Vercel Postgres or Neon)
3. Deploy.

## Importing from StoryGraph

Go to **Import** and upload a StoryGraph CSV export (`Settings → Import / Export → Export your library`). Books are matched against Google Books by ISBN first, then title + author. Any that can't be matched are listed in a post-import report.

> Intended as a one-time onboarding step — running it again after adding books manually may create duplicate shelf entries.
