import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { fetchBook } from "@/lib/google-books";
import { serialize } from "@/lib/serialize";
import BookDetail from "@/components/BookDetail";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const dbBook = await prisma.book.findUnique({ where: { id }, include: { entry: true } });
  if (dbBook) return <BookDetail book={serialize(dbBook)} />;

  const googleBook = await fetchBook(id);
  if (!googleBook) notFound();

  return <BookDetail book={{ ...googleBook, entry: null }} />;
}
