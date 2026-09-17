-- AlterTable
ALTER TABLE "Book" ADD COLUMN "isbn" TEXT;
ALTER TABLE "Book" ADD COLUMN "language" TEXT;
ALTER TABLE "Book" ADD COLUMN "publisher" TEXT;
ALTER TABLE "Book" ADD COLUMN "subtitle" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Entry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WANT_TO_READ',
    "rating" REAL,
    "notes" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Entry_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Entry" ("bookId", "createdAt", "finishedAt", "id", "notes", "rating", "startedAt", "status", "updatedAt") SELECT "bookId", "createdAt", "finishedAt", "id", "notes", "rating", "startedAt", "status", "updatedAt" FROM "Entry";
DROP TABLE "Entry";
ALTER TABLE "new_Entry" RENAME TO "Entry";
CREATE UNIQUE INDEX "Entry_bookId_key" ON "Entry"("bookId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

