import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { title, description, columnId, dueDate } = await req.json();

    if (!title || !columnId) {
      return NextResponse.json({ error: "Title and column are required." }, { status: 400 });
    }

    const cardCount = await prisma.card.count({ where: { columnId } });

    const card = await prisma.card.create({
      data: {
        title,
        description,
        columnId,
        creatorId: payload.userId,
        order: cardCount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error("Create card error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { id, title, description, columnId, order, assigneeId, dueDate } = await req.json();

    if (!id) return NextResponse.json({ error: "Card ID required." }, { status: 400 });

    const card = await prisma.card.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(columnId && { columnId }),
        ...(order !== undefined && { order }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error("Update card error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Card ID required." }, { status: 400 });

    await prisma.card.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete card error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
