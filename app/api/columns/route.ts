import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { title, boardId } = await req.json();

    if (!title || !boardId) {
      return NextResponse.json({ error: "Title and board are required." }, { status: 400 });
    }

    const columnCount = await prisma.column.count({ where: { boardId } });

    const column = await prisma.column.create({
      data: { title, boardId, order: columnCount },
      include: { cards: true },
    });

    return NextResponse.json(column);
  } catch (error) {
    console.error("Create column error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { id, title } = await req.json();

    if (!id) return NextResponse.json({ error: "Column ID required." }, { status: 400 });

    const column = await prisma.column.update({
      where: { id },
      data: { ...(title && { title }) },
      include: { cards: true },
    });

    return NextResponse.json(column);
  } catch (error) {
    console.error("Update column error:", error);
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

    if (!id) return NextResponse.json({ error: "Column ID required." }, { status: 400 });

    await prisma.column.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete column error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
