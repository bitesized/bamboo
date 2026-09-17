# Bamboo

Bamboo is a personal reading tracker. Find books, put them on your shelves, record when you started and finished them, rate them, and see your reading history in charts.

Everything runs on your own computer, and your library is saved in a single file on your machine.

## What you can do

- **Search for books** by title, author or ISBN, and add them to your library in one click.
- **Organise your shelves** with Want to Read, Reading and Read.
- **Track your reading** with start and finish dates, half-star ratings and notes.
- **Browse your library** with search and sorting by title, author, rating, date finished and more.
- **See your stats:** books and pages read, books per year and month, ratings, highlights like your fastest read and longest book, and a calendar of what you read when.
- **Bring your history with you** by importing your library from StoryGraph.
- **Choose light or dark mode**, or follow your system setting.

## Installation

### 1. Install Node.js

Bamboo needs **Node.js version 20.9 or newer**. Download the LTS version from [nodejs.org](https://nodejs.org) and install it.

To check that it worked, open a terminal and run:

```bash
node -v
```

You should see a version number like `v22.x.x`.

### 2. Download Bamboo

```bash
git clone https://github.com/bitesized/bamboo.git
cd bamboo
```

### 3. Install dependencies

```bash
npm install
```

This takes a minute or two the first time.

### 4. Add a Google Books API key (optional)

Bamboo uses Google Books to find books and their covers. Search works without a key, but Google limits how many searches you can do, so a free key is recommended.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create a project, and enable the **Books API**.
2. Under **APIs & Services → Credentials**, create an **API key**.
3. In the `bamboo` folder, create a file named `.env.local` containing:

   ```
   GOOGLE_BOOKS_API_KEY=paste_your_key_here
   ```

### 5. Build the app

```bash
npm run build
```

## Running Bamboo

```bash
npm start
```

Then open **[http://localhost:3000](http://localhost:3000)** in your browser. Your library is created automatically the first time you start Bamboo.

To stop Bamboo, press `Ctrl + C` in the terminal.

### Using a different port

If something else is already using port 3000, pick another port:

```bash
npm start -- -p 3001
```

Then open [http://localhost:3001](http://localhost:3001).

## Importing from StoryGraph

1. In StoryGraph, go to **Settings → Import / Export → Export your library** and download the CSV file.
2. In Bamboo, open **Import** and upload that file.
3. Bamboo finds each book on Google Books and adds it to the matching shelf, along with your dates, ratings and reviews. When it finishes, it shows how many books were imported, how many were already in your library, and any it couldn't find.

The import is meant to be done once, when you first set up Bamboo. Running it again after adding books by hand may create duplicates.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `/` | Search |
| `g` then `h` | Go to Dashboard |
| `g` then `s` | Go to Search |
| `g` then `l` | Go to Library |
| `g` then `t` | Go to Stats |
| `Esc` | Close a dialog |

## Your data

Your whole library is stored in one file: `prisma/dev.db` inside the `bamboo` folder.

- **To back up**, copy that file somewhere safe while Bamboo isn't running.
- **To restore**, stop Bamboo and put your backup copy back in the same place.

Updating Bamboo doesn't touch this file, but deleting the `bamboo` folder deletes your library too.

## Updating Bamboo

```bash
git pull
npm install
npm run build
npm start
```

Your library is upgraded automatically when you start Bamboo.

## Troubleshooting

**`next: command not found` or `prisma: command not found`**

Dependencies aren't installed. Run `npm install`.

**"Could not find a production build"**

Run `npm run build`, then `npm start` again.

**"address already in use"**

Another program is using the port. Start Bamboo on a different one (see [Using a different port](#using-a-different-port)).

**Searches return no results**

You may have reached Google's limit for searches without a key. Add an API key (see step 4 of Installation), then stop and restart Bamboo.

## For developers

Run `npm run dev` for development mode, which reloads the app as you edit code. Bamboo is built with Next.js, Prisma with SQLite, and Tailwind CSS.
