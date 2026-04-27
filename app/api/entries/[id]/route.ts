import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Status } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status, rating, notes, startedAt, finishedAt } = body;

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (rating !== undefined) data.rating = rating;
  if (notes !== undefined) data.notes = notes;
  if (startedAt !== undefined) data.startedAt = startedAt ? new Date(startedAt) : null;
  if (finishedAt !== undefined) data.finishedAt = finishedAt ? new Date(finishedAt) : null;

  if (status === "READ" && !finishedAt && body.autoFinish) {
    data.finishedAt = new Date();
  }

  const entry = await prisma.entry.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    ...entry,
    status: entry.status as Status,
    startedAt: entry.startedAt?.toISOString() ?? null,
    finishedAt: entry.finishedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = await prisma.entry.delete({ where: { id } });
  await prisma.book.delete({ where: { id: entry.bookId } }).catch(() => {});
  return new NextResponse(null, { status: 204 });
}
